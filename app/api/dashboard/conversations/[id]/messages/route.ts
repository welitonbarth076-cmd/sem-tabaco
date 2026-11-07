import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `Você é o SEM, um assistente de apoio para pessoas que estão parando de fumar. 
Seu tom é empático, motivacional e prático. Nunca julgue o usuário.
Seu objetivo é:
1. Ajudar o usuário a identificar gatilhos (estresse, tédio, situações sociais).
2. Sugerir estratégias práticas para lidar com fissuras (respiração, distração, água).
3. Registrar mentalmente o progresso do usuário e celebrar pequenas conquistas.
4. Fazer perguntas abertas para entender o contexto do usuário.
Responda sempre em português do Brasil, de forma concisa (máximo 3 parágrafos).`;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (conversationError || !conversation) {
    return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: { content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const content = typeof body.content === "string" ? body.content.trim() : "";

  if (!content) {
    return NextResponse.json({ error: "A mensagem não pode estar vazia." }, { status: 400 });
  }

  if (content.length > 5000) {
    return NextResponse.json({ error: "A mensagem excede o limite de 5.000 caracteres." }, { status: 400 });
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (conversationError || !conversation) {
    return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  }

  // 1. Salva a mensagem do usuário
  const { data: userMessage, error: userError } = await supabase
    .from("messages")
    .insert({
      conversation_id: id,
      user_id: user.id,
      role: "user",
      content,
    })
    .select("id, role, content, created_at")
    .single();

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  // 2. Atualiza o timestamp
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  // 3. Busca histórico
  const { data: history, error: historyError } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (historyError) {
    return NextResponse.json({ message: userMessage }, { status: 201 });
  }

  // 4. Chama a IA
  try {
    const messagesForAI = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...(history || []).map((msg) => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      })),
    ];

    const completion = await groq.chat.completions.create({
      messages: messagesForAI,
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1024,
    });

    const aiContent = completion.choices[0]?.message?.content || "Desculpe, não consegui processar.";

    // 5. Salva resposta da IA
    const { data: aiMessage, error: aiError } = await supabase
      .from("messages")
      .insert({
        conversation_id: id,
        user_id: user.id,
        role: "assistant",
        content: aiContent,
      })
      .select("id, role, content, created_at")
      .single();

    if (aiError) {
      return NextResponse.json({ message: userMessage }, { status: 201 });
    }

    return NextResponse.json({ message: aiMessage, userMessage }, { status: 201 });

  } catch (aiError) {
    console.error("ERRO NA GROQ:", aiError);
    return NextResponse.json(
      { 
        message: userMessage,
        warning: "A IA não pôde responder agora. Tente novamente." 
      },
      { status: 201 }
    );
  }
}