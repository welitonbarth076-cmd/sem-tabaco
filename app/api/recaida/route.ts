import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  let body: { quantidade?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  if (!body.quantidade || body.quantidade <= 0) {
    return NextResponse.json({ error: "Quantidade inválida." }, { status: 400 });
  }

  const { error } = await supabase.from("smoking_events").insert({
    user_id: user.id,
    quantity: body.quantidade,
    occurred_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}