import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  let body: { mensagemUsuario?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Se não mandou JSON, é o primeiro clique no SOS
  }

  // Se for a primeira mensagem (clique no botão), registra uma fissura de emergência
  if (!body.mensagemUsuario) {
    await supabase.from("cravings").insert({
      user_id: user.id,
      intensity: 10,
      trigger_description: "Crise aguda (Botão SOS)",
      occurred_at: new Date().toISOString(),
    });
  }

  const contexto = body.mensagemUsuario
    ? `O usuário respondeu no modo SOS: "${body.mensagemUsuario}". Responda de forma acolhedora e dê uma estratégia rápida para acalmar.`
    : `O usuário está tendo uma fissura MUITO FORTE agora. Dê instruções imediatas de respiração e distração.`;

  const PROMPT_SOS = `Você é o SEM, um mentor de emergência. O usuário está no modo SOS (resgate rápido).
${contexto}
Seja direto, acolhedor e prático. Responda em no máximo 2 parágrafos curtos.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "system", content: PROMPT_SOS }],
      model: "openai/gpt-oss-120b",
      max_tokens: 300,
    });

    const aiContent = completion.choices[0]?.message?.content || "Respire fundo. Beba água. Você consegue!";

    return NextResponse.json({ message: aiContent });
  } catch (error) {
    return NextResponse.json({ message: "Respire fundo. Beba água. Você consegue!" });
  }
}