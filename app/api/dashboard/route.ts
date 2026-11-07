
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Não autenticado" },
      { status: 401 }
    );
  }

  const [checkins, cravings, smoking, settings] = await Promise.all([
    supabase
      .from("daily_checkins")
      .select("*")
      .eq("user_id", user.id)
      .order("checkin_date", { ascending: false }),

    supabase
      .from("cravings")
      .select("*")
      .eq("user_id", user.id)
      .order("occurred_at", { ascending: false }),

    supabase
      .from("smoking_events")
      .select("*")
      .eq("user_id", user.id)
      .order("occurred_at", { ascending: false }),

    supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (
    checkins.error ||
    cravings.error ||
    smoking.error ||
    settings.error
  ) {
    return NextResponse.json(
      { error: "Erro ao consultar os registros" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    checkins: checkins.data,
    cravings: cravings.data,
    smokingEvents: smoking.data,
    settings: settings.data,
  });
}
