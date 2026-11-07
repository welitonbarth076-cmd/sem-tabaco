
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Não autorizado." },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("ERRO AO LISTAR CONVERSAS:", error);

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversations: data });
  } catch (error) {
    console.error("ERRO INTERNO AO LISTAR CONVERSAS:", error);

    return NextResponse.json(
      { error: "Erro interno ao listar conversas." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Não autorizado." },
        { status: 401 }
      );
    }

    let body: { title?: string };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Corpo da requisição inválido." },
        { status: 400 }
      );
    }

    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim().slice(0, 100)
        : "Nova conversa";

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        title,
      })
      .select("id, title, created_at, updated_at")
      .single();

    if (error) {
      console.error("ERRO AO CRIAR CONVERSA:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { conversation: data },
      { status: 201 }
    );
  } catch (error) {
    console.error("ERRO INTERNO AO CRIAR CONVERSA:", error);

    return NextResponse.json(
      { error: "Erro interno ao criar conversa." },
      { status: 500 }
    );
  }
}
