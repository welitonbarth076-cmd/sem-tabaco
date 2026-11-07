import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  // Apaga todas as mensagens desta conversa, mas mantém a conversa
  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("conversation_id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}