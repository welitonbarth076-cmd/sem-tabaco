"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const pages = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "conversa", label: "Conversa com SEM", icon: "◉" },
  { id: "comportamento", label: "Comportamento", icon: "◎" },
  { id: "economia", label: "Economia", icon: "R$" },
  { id: "evolucao", label: "Evolução", icon: "↗" },
  { id: "configuracoes", label: "Configurações", icon: "⚙" },
] as const;
type PageId = (typeof pages)[number]["id"];
type DashboardData = { checkins: any[]; cravings: any[]; smokingEvents: any[]; settings: any; };

export default function Home() {
  const supabase = createClient();
  const router = useRouter();
  const [nomeUsuario, setNomeUsuario] = useState("Usuário");
  const [emailUsuario, setEmailUsuario] = useState("");
  const [activePage, setActivePage] = useState<PageId>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [light, setLight] = useState(false);

  useEffect(() => {
    async function carregarUsuario() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) { router.replace("/login"); return; }
      setEmailUsuario(user.email ?? "");
      const { data: perfil } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
      setNomeUsuario(perfil?.display_name || "Usuário");
    }
    carregarUsuario();
  }, []);

  async function sairDaConta() { await supabase.auth.signOut(); router.replace("/login"); router.refresh(); }
  function navigate(id: PageId) { setMobileOpen(false); if (id === "conversa") { router.push("/conversa"); return; } setActivePage(id); }

  const theme = light ? "bg-slate-100 text-slate-900" : "bg-slate-950 text-white";
  const panel = light ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800";

  return (
    <main className={`min-h-screen ${theme}`}>
      {mobileOpen && (<button onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/60 lg:hidden" />)}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r ${light ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"} p-6 flex flex-col transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <div className="flex items-center justify-between mb-12">
          <div><p className="text-emerald-500 text-xs font-bold tracking-widest">PROJETO DE TRANSFORMAÇÃO</p><h1 className="text-2xl font-bold mt-2">SEM TABACO<span className="text-emerald-500">.</span></h1></div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-2xl">×</button>
        </div>
        <p className="text-xs text-slate-500 font-semibold mb-4">MENU PRINCIPAL</p>
        <nav className="space-y-2">
          {pages.map((page) => (
            <button key={page.id} onClick={() => navigate(page.id)} className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition ${activePage === page.id ? "bg-emerald-500 text-slate-950 font-semibold" : light ? "text-slate-600 hover:bg-slate-100" : "text-slate-300 hover:bg-slate-800"}`}>
              <span className="w-6 text-center">{page.icon}</span>{page.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto border-t border-slate-700 pt-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">SEM</div><div><p className="font-semibold text-sm">Assistente SEM</p><p className="text-xs text-slate-500">Projeto ativo</p></div></div></div>
      </aside>

      <div className="lg:ml-72 min-h-screen">
        <header className={`min-h-20 border-b ${panel} flex items-center justify-between gap-4 px-5 md:px-8 py-3`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden text-2xl">☰</button>
            <div><p className="text-xs text-slate-500">SEM TABACO /</p><h2 className="font-semibold">{pages.find((page) => page.id === activePage)?.label}</h2></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right"><p className="text-sm font-semibold">{nomeUsuario}</p><p className="text-xs text-slate-500">{emailUsuario}</p></div>
            <button onClick={() => setLight(!light)} className={`rounded-xl border px-3 py-2 text-sm ${light ? "border-slate-300 hover:bg-slate-100" : "border-slate-700 hover:bg-slate-800"}`}>{light ? "☾" : "☀"}</button>
            <button onClick={sairDaConta} className="rounded-xl border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800">Sair</button>
          </div>
        </header>

        <section className="p-5 md:p-8 max-w-7xl mx-auto">
          {activePage === "dashboard" && (<Dashboard panel={panel} />)}
          {activePage === "comportamento" && (<Placeholder title="Análise comportamental" description="Vamos acompanhar gatilhos, horários, emoções e padrões." panel={panel} />)}
          {activePage === "economia" && (<Placeholder title="Economia" description="Aqui serão calculados os valores preservados ao longo do projeto." panel={panel} />)}
          {activePage === "evolucao" && (<Placeholder title="Sua evolução" description="Histórico de registros, conquistas e indicadores." panel={panel} />)}
          {activePage === "configuracoes" && (<Configuracoes panel={panel} />)}
        </section>
      </div>
    </main>
  );
}

function Dashboard({ panel }: { panel: string }) {
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [agora, setAgora] = useState<Date | null>(null);

  useEffect(() => {
    setAgora(new Date());
    fetch("/api/dashboard", { cache: "no-store" }).then(res => res.json()).then(setDados).finally(() => setCarregando(false));
  }, []);

  const settings = dados?.settings;
  const inicio = settings?.quit_started_at ? new Date(settings.quit_started_at) : null;
  const tentativaAtiva = settings?.quit_status === "ativo" && inicio !== null && agora !== null && !isNaN(inicio.getTime()) && inicio <= agora;
  const eventos = tentativaAtiva ? dados?.smokingEvents.filter((e: any) => new Date(e.occurred_at) >= inicio) ?? [] : [];
  const ultimoEvento = eventos[0];
  const inicioContagem = ultimoEvento && inicio && new Date(ultimoEvento.occurred_at) > inicio ? new Date(ultimoEvento.occurred_at) : inicio;
  const diasSemFumar = tentativaAtiva && agora && inicioContagem ? Math.floor((agora.getTime() - inicioContagem.getTime()) / 86400000) : null;
  const fumados = eventos.reduce((t: number, e: any) => t + e.quantity, 0);
  const consumo = settings?.daily_cigarettes_baseline;
  const dias = tentativaAtiva && agora && inicio ? Math.floor((agora.getTime() - inicio.getTime()) / 86400000) : null;
  const evitados = tentativaAtiva && consumo && dias !== null ? Math.max(0, dias * consumo - fumados) : null;
  const economia = evitados !== null && settings?.pack_price ? (evitados / (settings.cigarettes_per_pack || 20)) * settings.pack_price : null;
  const ultimaFissura = dados?.cravings?.[0];

  const metrics = [
    ["Dias sem fumar", diasSemFumar !== null ? String(diasSemFumar) : "Pendente", tentativaAtiva ? "Desde o último registro" : "Configure sua tentativa"],
    ["Cigarros evitados", evitados !== null ? String(evitados) : "Pendente", consumo ? "Baseado no seu consumo" : "Defina seu consumo"],
    ["Economia acumulada", economia !== null ? economia.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Pendente", "Baseado no preço do maço"],
    ["Última fissura", ultimaFissura ? `${ultimaFissura.intensity}/10` : "—", ultimaFissura ? new Date(ultimaFissura.occurred_at).toLocaleString("pt-BR") : "Sem registro"],
  ];

  const dadosGrafico = (dados?.smokingEvents || []).reduce((acc: any[], evento: any) => {
    const dataF = new Date(evento.occurred_at).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' });
    const existente = acc.find(i => i.data === dataF);
    if (existente) existente.cigarros += evento.quantity; else acc.push({ data: dataF, cigarros: evento.quantity });
    return acc;
  }, []).reverse();

  return (
    <>
      <div className="mb-8">
        <p className="text-emerald-500 text-sm font-semibold">VISÃO GERAL</p>
        <h1 className="text-3xl font-bold mt-2">Seu progresso começa aqui.</h1>
        <p className="text-slate-500 mt-2">Acompanhe seus registros e entenda seus comportamentos.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {metrics.map(([title, value, detail]) => (
          <div key={title} className={`rounded-2xl border p-5 ${panel}`}>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-3xl font-bold mt-4">{carregando ? "..." : value}</p>
            <p className="text-xs text-slate-500 mt-2">{detail}</p>
          </div>
        ))}
      </div>

      <div className={`mt-6 rounded-2xl border p-6 ${panel}`}>
        <h3 className="font-semibold text-lg">Tendência de fumo</h3>
        <p className="text-sm text-slate-500 mt-1">Quantidade de cigarros por dia.</p>
        <div className="mt-6 h-72 w-full">
          {dadosGrafico.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="data" stroke="#64748b" tick={{ fill: '#64748b' }} />
                <YAxis stroke="#64748b" tick={{ fill: '#64748b' }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#f87171' }} />
                <Line type="monotone" dataKey="cigarros" stroke="#ef4444" strokeWidth={3} dot={{ fill: '#ef4444', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">Nenhum registro encontrado.</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
        <div className={`xl:col-span-2 rounded-2xl border p-6 ${panel}`}>
          <h3 className="font-semibold text-lg">Evolução do projeto</h3>
          <p className="text-sm text-slate-500 mt-2">Histórico a partir de registros reais.</p>
          <div className="h-52 mt-6 rounded-xl border border-dashed border-slate-700 flex items-center justify-center"><p className="text-sm text-slate-500">{carregando ? "Carregando..." : `${dados?.checkins.length ?? 0} check-ins`}</p></div>
        </div>
        <div className={`rounded-2xl border p-6 ${panel}`}>
          <h3 className="font-semibold text-lg">Resumo de hoje</h3>
          <div className="mt-6 space-y-5 text-sm">
            <div className="border-b border-slate-700 pb-3"><p className="text-slate-500">Cigarros hoje</p><p className="font-semibold mt-1">{carregando ? "..." : dados?.smokingEvents.filter((e:any) => agora && new Date(e.occurred_at).toDateString() === agora.toDateString()).reduce((t:number, e:any) => t+e.quantity, 0) ?? 0}</p></div>
            <div className="border-b border-slate-700 pb-3"><p className="text-slate-500">Última fissura</p><p className="font-semibold mt-1">{carregando ? "..." : ultimaFissura ? `${ultimaFissura.intensity}/10` : "Sem dados"}</p></div>
            <div className="border-b border-slate-700 pb-3"><p className="text-slate-500">Principal gatilho</p><p className="font-semibold mt-1">{ultimaFissura?.trigger_description || "Sem dados"}</p></div>
          </div>
        </div>
      </div>
    </>
  );
}

function Placeholder({ title, description, panel }: { title: string; description: string; panel: string; }) {
  return (
    <div className={`rounded-2xl border p-8 md:p-12 ${panel}`}>
      <p className="text-emerald-500 text-sm font-semibold">SEM TABACO</p>
      <h1 className="text-3xl font-bold mt-3">{title}</h1>
      <p className="text-slate-500 mt-3">{description}</p>
      <div className="mt-10 rounded-xl border border-dashed border-slate-700 p-8 text-center"><p className="text-slate-500 text-sm">Área em desenvolvimento.</p></div>
    </div>
  );
}

function Configuracoes({ panel }: { panel: string }) {
  const supabase = createClient();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [status, setStatus] = useState("preparacao");
  const [dataInicio, setDataInicio] = useState("");
  const [consumo, setConsumo] = useState("");
  const [precoMaco, setPrecoMaco] = useState("");
  const [quantidadeMaco, setQuantidadeMaco] = useState("20");

  useEffect(() => {
    supabase.from("user_settings").select("*").maybeSingle().then(({ data, error }) => {
      if (error) setMensagem("Erro ao carregar.");
      if (data) {
        setStatus(data.quit_status);
        setDataInicio(data.quit_started_at ? new Date(data.quit_started_at).toISOString().slice(0, 16) : "");
        setConsumo(data.daily_cigarettes_baseline?.toString() ?? "");
        setPrecoMaco(data.pack_price?.toString() ?? "");
        setQuantidadeMaco(data.cigarettes_per_pack?.toString() ?? "20");
      }
      setCarregando(false);
    });
  }, []);

  async function salvar() {
    setSalvando(true); setMensagem("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMensagem("Sessão expirada."); setSalvando(false); return; }
    
    const { error } = await supabase.from("user_settings").upsert({
      user_id: user.id, quit_status: status,
      quit_started_at: dataInicio ? new Date(dataInicio).toISOString() : null,
      daily_cigarettes_baseline: consumo ? Number(consumo) : null,
      pack_price: precoMaco ? Number(precoMaco.replace(",", ".")) : null,
      cigarettes_per_pack: Number(quantidadeMaco), updated_at: new Date().toISOString(),
    });
    setMensagem(error ? "Erro: " + error.message : "Salvo com sucesso!");
    setSalvando(false);
  }

  if (carregando) return <p className="text-slate-500">Carregando...</p>;

  return (
    <div className="max-w-3xl">
      <div className="mb-8"><p className="text-emerald-500 text-sm font-semibold">PERSONALIZAÇÃO</p><h1 className="text-3xl font-bold mt-2">Configurações</h1></div>
      <div className={`rounded-2xl border p-6 space-y-4 ${panel}`}>
        <div><label className="block text-sm mb-2">Status</label><select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-transparent p-3"><option value="preparacao">Em preparação</option><option value="ativo">Tentativa ativa</option><option value="pausado">Pausada</option></select></div>
        <div><label className="block text-sm mb-2">Data de início</label><input type="datetime-local" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-transparent p-3" /></div>
        <div><label className="block text-sm mb-2">Consumo diário (cigarros)</label><input type="number" value={consumo} onChange={(e) => setConsumo(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-transparent p-3" /></div>
        <div><label className="block text-sm mb-2">Preço do maço (R$)</label><input type="number" value={precoMaco} onChange={(e) => setPrecoMaco(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-transparent p-3" /></div>
        <div><label className="block text-sm mb-2">Cigarros por maço</label><input type="number" value={quantidadeMaco} onChange={(e) => setQuantidadeMaco(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-transparent p-3" /></div>
        {mensagem && <p className={`text-sm ${mensagem.includes("Erro") ? "text-red-500" : "text-emerald-500"}`}>{mensagem}</p>}
        <button onClick={salvar} disabled={salvando} className="w-full rounded-xl bg-emerald-500 text-slate-950 font-semibold p-3 disabled:opacity-50">{salvando ? "Salvando..." : "Salvar"}</button>
      </div>
    </div>
  );
}