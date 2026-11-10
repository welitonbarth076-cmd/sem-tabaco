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

  // 3. Busca dados de contexto (Settings, recaídas e gatilhos)
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
    .limit(5);

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

  // 5. Prompt de Sistema com AUTONOMIA TOTAL
  const SYSTEM_PROMPT = `Você é o SEM, um mentor e administrador de dados para pessoas que estão parando de fumar. 
Sua personalidade é: Acolhedora, empática, sábia e sem julgamentos. Você fala como um amigo experiente, não como um robô.

**VOCÊ TEM AUTONOMIA TOTAL SOBRE OS DADOS DO USUÁRIO.**
Se o usuário pedir para consultar, alterar ou apagar algo, VOCÊ DEVE FAZER ISSO usando as ferramentas disponíveis. Nunca diga "não tenho acesso".

DIRETRIZES:
1. Se ele perguntar "quantas recaídas eu tive?", use a ferramenta "consultar_dados" (tipo: recaidas).
2. Se ele disser "apague a última recaída", use a ferramenta "apagar_registro" (tipo: recaida).
3. Se ele disser "mude meu status para ativo", use a ferramenta "atualizar_configuracoes".
4. Se ele relatar uma nova fissura ou recaída, use as ferramentas de registro.
5. Se ele só quiser conversar, responda normalmente sem usar ferramentas.

DADOS ATUAIS DO USUÁRIO:
${contextoDados}

Responda sempre em português do Brasil, de forma concisa, com um tom caloroso.`;

  // 6. Ferramentas da IA (Antigas + Novas)
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
          },
          required: ["quantidade"],
        },
      },
    },
    // NOVAS FERRAMENTAS
    {
      type: "function",
      function: {
        name: "consultar_dados",
        description: "Consulta o histórico de fissuras, recaídas ou configurações do usuário.",
        parameters: {
          type: "object",
          properties: {
            tipo: { type: "string", enum: ["fissuras", "recaidas", "configuracoes"] },
          },
          required: ["tipo"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "atualizar_configuracoes",
        description: "Atualiza as configurações do usuário (status, consumo, preço do maço, etc).",
        parameters: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["preparacao", "ativo", "pausado"], description: "Status da tentativa." },
            consumo_diario: { type: "number", description: "Consumo diário de cigarros." },
            preco_maco: { type: "number", description: "Preço do maço em reais." },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "apagar_registro",
        description: "Apaga o último registro de fissura ou recaída do usuário.",
        parameters: {
          type: "object",
          properties: {
            tipo: { type: "string", enum: ["fissura", "recaida"] },
          },
          required: ["tipo"],
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
          aiContent = `Registrei sua fissura de intensidade ${args.intensidade}/10 (gatilho: ${args.gatilho}). Respire fundo, você consegue!`;
        } 
        else if (functionName === "registrar_recaida") {
          await supabase.from("smoking_events").insert({
            user_id: user.id,
            quantity: args.quantidade,
            occurred_at: new Date().toISOString(),
          });
          aiContent = `Entendi. Registrei que você fumou ${args.quantidade} cigarro(s). Não desista, recaídas fazem parte do processo.`;
        }
        // NOVAS AÇÕES
        else if (functionName === "consultar_dados") {
          let dadosConsulta;
          if (args.tipo === "fissuras") {
            const { data } = await supabase.from("cravings").select("*").eq("user_id", user.id).order("occurred_at", { ascending: false }).limit(5);
            dadosConsulta = data;
          } else if (args.tipo === "recaidas") {
            const { data } = await supabase.from("smoking_events").select("*").eq("user_id", user.id).order("occurred_at", { ascending: false }).limit(5);
            dadosConsulta = data;
          } else {
            const { data } = await supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle();
            dadosConsulta = data;
          }
          aiContent = `Aqui estão os dados (${args.tipo}): ${JSON.stringify(dadosConsulta)}`;
        }
        else if (functionName === "atualizar_configuracoes") {
          const updates: any = {};
          if (args.status) updates.quit_status = args.status;
          if (args.consumo_diario) updates.daily_cigarettes_baseline = args.consumo_diario;
          if (args.preco_maco) updates.pack_price = args.preco_maco;
          
          await supabase.from("user_settings").upsert({
            user_id: user.id, ...updates, updated_at: new Date().toISOString(),
          });
          aiContent = "Configurações atualizadas com sucesso!";
        }
        else if (functionName === "apagar_registro") {
          const tabela = args.tipo === "fissura" ? "cravings" : "smoking_events";
          const { data: ultimo } = await supabase.from(tabela).select("id").eq("user_id", user.id).order("occurred_at", { ascending: false }).limit(1).maybeSingle();
          
          if (ultimo) {
            await supabase.from(tabela).delete().eq("id", ultimo.id);
            aiContent = "O último registro foi apagado.";
          } else {
            aiContent = "Não encontrei nenhum registro para apagar.";
          }
        }
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