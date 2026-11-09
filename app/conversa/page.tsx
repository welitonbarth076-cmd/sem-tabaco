"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

async function requisicaoJSON(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const texto = await response.text();
    console.error("RESPOSTA NÃO JSON:", { url, status: response.status, texto });
    throw new Error(`Erro na API. Status: ${response.status}.`);
  }

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Erro HTTP ${response.status}`);
  return result;
}

export default function ConversaPage() {
  const router = useRouter();
  
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    carregarConversas();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function carregarConversas() {
    setLoading(true);
    setError("");

    try {
      const result = await requisicaoJSON("/api/conversations", { cache: "no-store" });
      const lista: Conversation[] = result.conversations || [];

      if (lista.length > 0) {
        await abrirConversa(lista[0].id);
      } else {
        const res = await requisicaoJSON("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Conversa com SEM" }),
        });
        await abrirConversa(res.conversation.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function abrirConversa(id: string) {
    setConversationId(id);
    setMessages([]);
    setError("");

    try {
      const result = await requisicaoJSON(`/api/conversations/${id}/messages`, { cache: "no-store" });
      setMessages(result.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao abrir conversa.");
    }
  }

  async function limparConversa() {
    if (!confirm("Tem certeza que deseja limpar o histórico? A IA vai esquecer a conversa anterior.")) return;

    try {
      const res = await fetch(`/api/conversations/${conversationId}/clear`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao limpar");
      
      setMessages([]); // Limpa a tela na hora
    } catch (err) {
      alert("Erro ao limpar a conversa.");
    }
  }

  async function enviarMensagem() {
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    setError("");

    try {
      let id = conversationId;

      if (!id) {
        const res = await requisicaoJSON("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Conversa com SEM" }),
        });
        id = res.conversation.id;
        setConversationId(id);
      }

      const result = await requisicaoJSON(`/api/conversations/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (result.userMessage) {
        setMessages((atual) => [...atual, result.userMessage]);
      }
      if (result.message && result.message.id !== result.userMessage?.id) {
        setMessages((atual) => [...atual, result.message]);
      }

      setInput("");
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : "Erro ao enviar mensagem.";
      setError(mensagem);
    } finally {
      setSending(false);
    }
  }

  function formatarHora(data: string) {
    return new Date(data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="border-b border-slate-800 px-5 py-4 flex justify-between items-center">
        {/* BOTÃO DE VOLTAR AQUI */}
        <button 
          onClick={() => router.push("/")} 
          className="text-left hover:opacity-80 transition-opacity cursor-pointer"
        >
          <p className="text-emerald-500 text-xs font-bold tracking-widest">
            SEM TABACO
          </p>
          <h1 className="text-xl font-bold mt-1">
            Conversa com SEM
          </h1>
        </button>

        <button
          onClick={limparConversa}
          className="text-sm text-slate-400 hover:text-red-400 transition-colors"
        >
          Limpar Histórico
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        <section className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-5 md:p-8">
            <div className="max-w-3xl mx-auto space-y-5">
              {loading && <p className="text-slate-500 text-center">Carregando conversa...</p>}

              {!loading && messages.length === 0 && (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-2xl font-bold mx-auto">
                    SEM
                  </div>
                  <h2 className="text-2xl font-bold mt-6">Estou aqui para registrar seu progresso.</h2>
                  <p className="text-slate-500 mt-3 max-w-md mx-auto">
                    Conte como foi seu dia, relate uma fissura ou registre um acontecimento.
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl p-4 ${message.role === "user" ? "bg-emerald-500 text-slate-950" : "bg-slate-900 border border-slate-800"}`}>
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    <p className={`text-xs mt-2 ${message.role === "user" ? "text-slate-800" : "text-slate-500"}`}>
                      {formatarHora(message.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          {error && (
            <div className="max-w-3xl mx-auto w-full px-5 pb-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="border-t border-slate-800 p-4 md:p-6">
            <div className="max-w-3xl mx-auto flex gap-3 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    enviarMensagem();
                  }
                }}
                placeholder="Escreva sua mensagem para SEM..."
                rows={2}
                maxLength={5000}
                className="flex-1 resize-none rounded-2xl border border-slate-700 bg-slate-900 p-4 text-sm outline-none focus:border-emerald-500"
              />
              <button
                onClick={enviarMensagem}
                disabled={sending || !input.trim()}
                className="rounded-2xl bg-emerald-500 text-slate-950 font-bold px-5 py-4 disabled:opacity-40"
              >
                {sending ? "..." : "Enviar"}
              </button>
            </div>
            <p className="text-center text-xs text-slate-600 mt-3">Enter para enviar · Shift + Enter para nova linha</p>
          </div>
        </section>
      </div>
    </main>
  );
}