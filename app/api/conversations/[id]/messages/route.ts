import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { content } = await request.json();
  if (!content) return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });

  // 1. Salva a mensagem do usuário no histórico
  const { data: userMessage, error: userError } = await supabase
    .from("messages")
    .insert({ conversation_id: id, user_id: user.id, role: "user", content })
    .select()
    .single();

  if (userError) return NextResponse.json({ error: userError.message }, { status: 500 });

  // 2. Busca histórico da conversa
  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  // 3. Busca dados do Dashboard (Configurações)
  const { data: settings } = await supabase
    .from("user_settings")
    .select("quit_status, quit_started_at, daily_cigarettes_baseline, pack_price")
    .eq("user_id", user.id)
    .maybeSingle();

  // 4. Busca as últimas 3 recaídas
  const { data: recaidas } = await supabase
    .from("smoking_events")
    .select("quantity, occurred_at")
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .limit(3);

  // 5. Busca as últimas 3 fissuras (gatilhos)
  const { data: fissuras } = await supabase
    .from("cravings")
    .select("intensity, trigger_description, occurred_at")
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .limit(3);

  // 6. Monta o contexto com todos os dados
  let contextoDados = "O usuário ainda não configurou os dados no dashboard.";
  if (settings) {
    contextoDados = "";
    if (settings.quit_status === "ativo" && settings.quit_started_at) {
      const dias = Math.floor((new Date().getTime() - new Date(settings.quit_started_at).getTime()) / 86400000);
      contextoDados += `O usuário está sem fumar há ${dias} dias. `;
    }
    if (settings.daily_cigarettes_baseline && settings.pack_price) {
      const economiaDiaria = (settings.daily_cigarettes_baseline / 20) * settings.pack_price;
      contextoDados += `Economia estimada: R$ ${economiaDiaria.toFixed(2)} por dia. `;
    }
  }

  if (recaidas && recaidas.length > 0) {
    contextoDados += `Últimas recaídas registradas: `;
    recaidas.forEach(r => {
      const data = new Date(r.occurred_at).toLocaleDateString("pt-BR");
      contextoDados += `(${data}: ${r.quantity} cigarro(s)) `;
    });
  }

  if (fissuras && fissuras.length > 0) {
    contextoDados += `Últimos gatilhos/fissuras: `;
    fissuras.forEach(f => {
      contextoDados += `(Intensidade ${f.intensity}/10 por ${f.trigger_description}) `;
    });
  }

  // 7. Prompt de Sistema
  const SYSTEM_PROMPT = `Você é o SEM, um assistente de apoio para pessoas que estão parando de fumar. 
Seu tom é empático, motivacional e prático. Nunca julgue o usuário.
Dados atuais: ${contextoDados}

**INSTRUÇÕES CRÍTICAS:**
1. Se o usuário relatar uma VONTADE/VONTADE DE FUMAR (fissura), use a ferramenta "registrar_fissura".
2. Se o usuário relatar que FUMOU (recaída), use a ferramenta "registrar_recaida".
3. Após usar uma ferramenta, confirme para o usuário de forma acolhedora que o registro foi salvo.
4. Se o usuário perguntar sobre o histórico (ex: "qual foi minha última recaída?"), use os "Dados atuais" acima para responder.
5. Se o usuário apenas conversar, responda normalmente sem usar ferramentas.
Responda sempre em português do Brasil.`;

  // 8. Ferramentas da IA
  const tools: any[] = [
    {
      type: "function",
      function: {
        name: "registrar_fissura",
        description: "Registra uma vontade forte de fumar (fissura) no banco de dados.",
        parameters: {
          type: "object",
          properties: {
            intensidade: { type: "number", description: "Intensidade de 1 a 10." },
            gatilho: { type: "string", description: "O que causou a vontade (ex: estresse, café, tédio)." },
          },
          required: ["intensidade", "gatilho"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "registrar_recaida",
        description: "Registra que o usuário fumou um ou mais cigarros.",
        parameters: {
          type: "object",
          properties: {
            quantidade: { type: "number", description: "Quantos cigarros fumou." },
          },
          required: ["quantidade"],
        },
      },
    },
  ];

  // 9. Chama a IA
  try {
    const messagesForAI: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(history || []).map((msg) => ({ role: msg.role, content: msg.content })),
    ];

    const completion = await groq.chat.completions.create({
      messages: messagesForAI,
      model: "openai/gpt-oss-120b",
      tools: tools,
      tool_choice: "auto",
    });

    const responseMessage = completion.choices[0]?.message;
    let aiContent = responseMessage?.content || "";

    // 10. Verifica se a IA usou ferramentas
    if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        if (functionName === "registrar_fissura") {
          await supabase.from("cravings").insert({
            user_id: user.id,
            intensity: args.intensidade,
            trigger_description: args.gatilho,
            occurred_at: new Date().toISOString(), // <--- SIMPLIFICADO AQUI
          });
          aiContent = `Registrei sua fissura de intensidade ${args.intensidade}/10 (gatilho: ${args.gatilho}). Respire fundo, você consegue!`;
        } 
        else if (functionName === "registrar_recaida") {
          await supabase.from("smoking_events").insert({
            user_id: user.id,
            quantity: args.quantidade,
            occurred_at: new Date().toISOString(), // <--- SIMPLIFICADO AQUI
          });
          aiContent = `Entendi. Registrei que você fumou ${args.quantidade} cigarro(s). Não desista, recaídas fazem parte do processo.`;
        }
      }
    }

    if (!aiContent) aiContent = "Desculpe, não consegui processar.";

    // 11. Salva a resposta final da IA
    const { data: aiMessage, error: aiError } = await supabase
      .from("messages")
      .insert({ conversation_id: id, user_id: user.id, role: "assistant", content: aiContent })
      .select()
      .single();

    if (aiError) return NextResponse.json({ error: aiError.message }, { status: 500 });

    return NextResponse.json({ message: aiMessage, userMessage }, { status: 201 });

  } catch (aiError: any) {
    console.error("ERRO REAL NA GROQ:", aiError.message);
    return NextResponse.json(
      { message: userMessage, error: `Falha na IA: ${aiError.message}` },
      { status: 201 }
    );
  }
}