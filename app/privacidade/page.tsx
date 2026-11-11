"use client";

import { useRouter } from "next/navigation";

export default function Privacidade() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => router.push("/")} 
          className="mb-8 text-emerald-500 hover:text-emerald-400 font-semibold flex items-center gap-2"
        >
          ← Voltar para o App
        </button>

        <h1 className="text-3xl font-bold mb-8">Política de Privacidade e Termos de Uso</h1>

        <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">1. Sobre o SEM TABACO</h2>
            <p>
              O SEM TABACO é uma ferramenta de apoio ao bem-estar, desenvolvida para auxiliar pessoas no processo de cessação do tabagismo. 
              <strong> Este aplicativo não substitui acompanhamento médico, psicológico ou tratamento profissional.</strong> 
              Se você estiver enfrentando sintomas graves de abstinência, procure um profissional de saúde.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">2. Dados Coletados</h2>
            <p>Para o funcionamento do app, coletamos as seguintes informações:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Dados de conta:</strong> e-mail e nome de exibição.</li>
              <li><strong>Dados de saúde (sensíveis):</strong> registros de fissuras (intensidade e gatilhos), recaídas (quantidade de cigarros) e histórico de conversas com a IA.</li>
              <li><strong>Dados de uso:</strong> check-ins diários e configurações de consumo.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">3. Como Usamos os Dados</h2>
            <p>Seus dados são usados exclusivamente para:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Personalizar as respostas da Inteligência Artificial (SEM).</li>
              <li>Gerar gráficos e estatísticas de progresso (Dashboard, Evolução, Economia).</li>
              <li>Melhorar a sua experiência no app.</li>
            </ul>
            <p className="mt-2">Seus dados <strong>não são vendidos</strong> nem compartilhados com terceiros para fins publicitários.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">4. Inteligência Artificial e Privacidade</h2>
            <p>
              As conversas são processadas por modelos de linguagem (Groq) para gerar respostas. 
              Os dados de saúde são armazenados de forma segura no Supabase e protegidos por criptografia e regras de acesso (RLS), garantindo que apenas você acesse suas informações.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">5. Seus Direitos (LGPD)</h2>
            <p>De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem o direito de:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Acessar seus dados a qualquer momento.</li>
              <li>Corrigir informações incorretas.</li>
              <li>Solicitar a exclusão da sua conta e de todos os dados associados.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">6. Contato</h2>
            <p>Para dúvidas ou solicitações relacionadas à privacidade, entre em contato pelo e-mail: <strong>contato@semtabaco.com.br</strong> (substitua pelo seu e-mail real).</p>
          </section>

          <p className="pt-8 text-xs text-slate-500">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>
        </div>
      </div>
    </main>
  );
}