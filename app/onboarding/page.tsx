"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Onboarding() {
  const router = useRouter();
  const [passo, setPasso] = useState(1);

  function finalizar() {
    localStorage.setItem("sem_tabaco_onboarding", "visto");
    router.push("/");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full">
        
        {/* Indicador de passos */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-2 w-8 rounded-full transition-all ${i === passo ? "bg-emerald-500" : "bg-slate-700"}`} />
          ))}
        </div>

        {/* Conteúdo do Passo 1 */}
        {passo === 1 && (
          <div className="text-center animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-4xl font-bold mx-auto mb-6">
              ◉
            </div>
            <h1 className="text-2xl font-bold mb-4">Bem-vindo ao SEM TABACO</h1>
            <p className="text-slate-400 mb-8">
              Este é o seu assistente pessoal para parar de fumar. 
              Vamos te ajudar a entender seus gatilhos e celebrar suas conquistas.
            </p>
            <button onClick={() => setPasso(2)} className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold">
              Próximo
            </button>
          </div>
        )}

        {/* Conteúdo do Passo 2 */}
        {passo === 2 && (
          <div className="text-center animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-4xl mx-auto mb-6">
              💬
            </div>
            <h1 className="text-2xl font-bold mb-4">Converse com o SEM</h1>
            <p className="text-slate-400 mb-8">
              O SEM é sua IA de apoio. Conte como foi seu dia, relate uma fissura ou peça conselhos. 
              Ele vai registrar os dados e te dar estratégias personalizadas.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setPasso(1)} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 font-bold">
                Voltar
              </button>
              <button onClick={() => setPasso(3)} className="flex-1 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold">
                Próximo
              </button>
            </div>
          </div>
        )}

        {/* Conteúdo do Passo 3 */}
        {passo === 3 && (
          <div className="text-center animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-red-500/15 text-red-400 flex items-center justify-center text-4xl mx-auto mb-6">
              SOS
            </div>
            <h1 className="text-2xl font-bold mb-4">Modo SOS e Check-in</h1>
            <p className="text-slate-400 mb-8">
              Quando a vontade bater forte, use o botão <strong>SOS</strong> para um resgate rápido. 
              E não esqueça de fazer o <strong>Check-in Diário</strong> para registrar seus dias firmes!
            </p>
            <button onClick={finalizar} className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold">
              Começar
            </button>
          </div>
        )}
      </div>
    </main>
  );
}