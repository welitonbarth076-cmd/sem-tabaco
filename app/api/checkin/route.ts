import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const hoje = new Date().toISOString().split("T")[0]; // Pega só a data (YYYY-MM-DD)

  // Verifica se já fez check-in hoje
  const { data: checkinExistente } = await supabase
    .from("daily_checkins")
    .select("id")
    .eq("user_id", user.id)
    .eq("checkin_date", hoje)
    .maybeSingle();

  if (checkinExistente) {
    return NextResponse.json({ message: "Você já fez check-in hoje!" }, { status: 200 });
  }

  // Se não fez, cria o check-in
  const { error } = await supabase.from("daily_checkins").insert({
    user_id: user.id,
    checkin_date: hoje,
    cigarettes_count: 0, // Começa com 0, a IA atualiza se ele fumar
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, message: "Check-in realizado com sucesso!" });
}