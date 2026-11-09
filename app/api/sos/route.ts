import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  // Busca o maior gatilho do usuário para personalizar a resposta
  const { data: fissuras } = await supabase
    .from("cravings")
    .select("trigger_description")
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const gatilhoPrincipal = fissuras?.trigger_description || "vontade de fumar";

  const PROMPT_SOS = `Você é o SEM, um mentor de emergência. O usuário está tendo uma fissura MUITO FORTE agora e clicou no botão SOS.
Seu objetivo é acalmá-lo imediatamente. Seja direto, acolhedor e prático.
Último gatilho conhecido: ${gatilhoPrincipal}.

Siga esta estrutura:
1. Acolha o momento ("Respire fundo, eu estou aqui com você").
2. Dê uma técnica de respiração de 30 segundos (ex: 4-7-8).
3. Ofereça uma distração rápida baseada no gatilho (ex: se for café, beba água gelada; se for estresse, lave o rosto).
4. Termine com uma frase de força.

Responda em no máximo 3 parágrafos curtos.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "system", content: PROMPT_SOS }],
      model: "openai/gpt-oss-120b",
      max_tokens: 500,
    });

    const aiContent = completion.choices[0]?.message?.content || "Respire fundo. Você é mais forte que essa vontade. Beba um copo de água e espere 5 minutos.";

    return NextResponse.json({ message: aiContent });
  } catch (error) {
    return NextResponse.json({ message: "Respire fundo. Beba água. Você consegue!" });
  }
}