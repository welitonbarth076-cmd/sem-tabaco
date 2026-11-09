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

  // 1. Salva a mensagem do usuário
  const { data: userMessage, error: userError } = await supabase
    .from("messages")
    .insert({ conversation_id: id, user_id: user.id, role: "user", content })
    .select().single();
  if (userError) return NextResponse.json({ error: userError.message }, { status: 500 });

  // 2. Busca histórico da conversa
  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  // 3. Busca dados de contexto (Settings, últimas recaídas e gatilhos)
  const { data: settings } = await supabase
    .from("user_settings")
    .select("quit_status, quit_started_at, daily_cigarettes_baseline, pack_price")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: recaidas } = await supabase
    .from("smoking_events")
    .select("quantity, occurred_at")
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .limit(3);

  const { data: fissuras } = await supabase
    .from("cravings")
    .select("intensity, trigger_description, occurred_at")
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .limit(5); // Pega os 5 últimos para ter uma boa amostra de padrões

  // 4. Monta o Contexto Rico
  let contextoDados = "";
  if (settings) {
    if (settings.quit_status === "ativo" && settings.quit_started_at) {
      const dias = Math.floor((new Date().getTime() - new Date(settings.quit_started_at).getTime()) / 86400000);
      contextoDados += `O usuário está sem fumar há ${dias} dias. `;
    }
  }

  if (recaidas && recaidas.length > 0) {
    contextoDados += `Recaídas recentes: ${recaidas.map(r => `${r.quantity} cig. em ${new Date(r.occurred_at).toLocaleDateString("pt-BR")}`).join(", ")}. `;
  }

  if (fissuras && fissuras.length > 0) {
    contextoDados += `Últimos gatilhos: ${fissuras.map(f => `${f.trigger_description} (intensidade ${f.intensity}/10)`).join(", ")}. `;
  }

  // 5. O Novo Prompt de Sistema (Humano, Acolhedor e Estratégico)
  const SYSTEM_PROMPT = `Você é o SEM, um mentor e assistente pessoal para pessoas que estão parando de fumar. 
Sua personalidade é: Acolhedora, empática, sábia e sem julgamentos. Você fala como um amigo experiente, não como um robô.

DIRETRIZES CRÍTICAS DE COMPORTAMENTO:
1. SE O USUÁRIO RELATAR UMA RECAÍDA (ex: "fumei", "acabei caindo"): 
   - NUNCA julgue ou faça o usuário se sentir culpado.
   - Acolha a dor. Diga que recaídas são parte do processo de aprendizado.
   - Faça uma pergunta estratégica: "O que aconteceu momentos antes? Qual foi o gatilho?"
   - Use a ferramenta "registrar_recaida" para salvar o evento, mas só depois de conversar.

2. SE O USUÁRIO RELATAR UMA FISSURA (ex: "vontade forte", "quase fumei"):
   - Use a ferramenta "registrar_fissura" imediatamente.
   - Depois, ofereça uma estratégia prática baseada no histórico dele (ex: se o gatilho for café, sugira chá ou respiração).

3. SE O USUÁRIO PEDIR AJUDA OU ESTRATÉGIA:
   - Use os dados de contexto abaixo para dar conselhos personalizados.
   - Sugira 2 ou 3 ações práticas que ele pode fazer naquele momento.
   - Pergunte sobre o estado emocional dele.

DADOS ATUAIS DO USUÁRIO (Use isso para responder):
${contextoDados}

Responda sempre em português do Brasil, de forma concisa (máximo 4 parágrafos), com um tom caloroso e encorajador.`;

  // 6. Definição das Ferramentas
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
            gatilho: { type: "string", description: "O que causou a vontade." },
          },
          required: ["intensidade", "gatilho"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "registrar_recaida",
        description: "Registra que o usuário fumou (recaída).",
        parameters: {
          type: "object",
          properties: {
            quantidade: { type: "number", description: "Quantos cigarros fumou." },
            motivo: { type: "string", description: "O que ele relatou que causou a recaída." },
          },
          required: ["quantidade"],
        },
      },
    },
  ];

  // 7. Chama a IA
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

    // 8. Processa as ferramentas
    if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        if (functionName === "registrar_fissura") {
          await supabase.from("cravings").insert({
            user_id: user.id,
            intensity: args.intensidade,
            trigger_description: args.gatilho,
            occurred_at: new Date().toISOString(),
          });
        } 
        else if (functionName === "registrar_recaida") {
          await supabase.from("smoking_events").insert({
            user_id: user.id,
            quantity: args.quantidade,
            occurred_at: new Date().toISOString(),
          });
        }
      }
      
      // Se a IA usou ferramenta e não gerou texto, gera uma resposta padrão empática
      if (!aiContent) {
        aiContent = "Entendi. Registrei isso para nós. O importante é não desistir. Como você está se sentindo agora?";
      }
    }

    if (!aiContent) aiContent = "Estou aqui com você. Como posso ajudar hoje?";

    // 9. Salva a resposta da IA
    const { data: aiMessage, error: aiError } = await supabase
      .from("messages")
      .insert({ conversation_id: id, user_id: user.id, role: "assistant", content: aiContent })
      .select().single();

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
