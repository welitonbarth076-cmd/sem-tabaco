"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Toaster, toast } from "sonner";

const pages = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "conversa", label: "Conversa com SEM", icon: "◉" },
  { id: "comportamento", label: "Comportamento", icon: "◎" },
  { id: "economia", label: "Economia", icon: "R$" },
  { id: "evolucao", label: "Evolução", icon: "↗" },
  { id: "perfil", label: "Meu Perfil", icon: "👤" },
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
  }, [activePage]);

  async function sairDaConta() { await supabase.auth.signOut(); router.replace("/login"); router.refresh(); }
  function navigate(id: PageId) { setMobileOpen(false); if (id === "conversa") { router.push("/conversa"); return; } setActivePage(id); }

  const theme = light ? "bg-slate-100 text-slate-900" : "bg-slate-950 text-white";
  const panel = light ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800";

  return (
    <main className={`min-h-screen ${theme}`}>
      <Toaster position="top-center" richColors theme={light ? "light" : "dark"} />
      
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
          {activePage === "comportamento" && (<Comportamento panel={panel} />)}
          {activePage === "economia" && (<Economia panel={panel} />)}
          {activePage === "evolucao" && (<Evolucao panel={panel} />)}
          {activePage === "perfil" && (<Perfil panel={panel} />)}
          {activePage === "configuracoes" && (<Configuracoes panel={panel} />)}
        </section>
      </div>
      
      <BotaoSOSDesktop />
      <TesteBotaoChatMobile />
    </main>
  );
}

function Dashboard({ panel }: { panel: string }) {
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [agora, setAgora] = useState<Date | null>(null);
  const [fezCheckin, setFezCheckin] = useState(false);

  useEffect(() => {
    setAgora(new Date());
    fetch("/api/dashboard", { cache: "no-store" })
      .then(res => res.json())
      .then((resultado) => {
        setDados(resultado);
        const hoje = new Date().toISOString().split("T")[0];
        const jaFez = resultado.checkins?.some((c: any) => c.checkin_date === hoje);
        setFezCheckin(!!jaFez);
      })
      .finally(() => setCarregando(false));
  }, []);

  async function fazerCheckin() {
    try {
      const res = await fetch("/api/checkin", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setFezCheckin(true);
        toast.success(data.message || "Check-in realizado com sucesso!");
      } else {
        toast.error(data.error || "Erro ao fazer check-in.");
      }
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    }
  }

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

      <div className={`mb-6 rounded-2xl border p-6 flex justify-between items-center ${panel}`}>
        <div>
          <h3 className="font-semibold text-lg">Check-in de Hoje</h3>
          <p className="text-sm text-slate-500">{fezCheckin ? "Você já registrou que está firme hoje!" : "Registre que você está firme no projeto hoje."}</p>
        </div>
        <button onClick={fazerCheckin} disabled={fezCheckin} className={`px-6 py-3 rounded-xl font-bold transition ${fezCheckin ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"}`}>{fezCheckin ? "✓ Check-in Feito" : "Estou Firme!"}</button>
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
          ) : (<div className="h-full flex items-center justify-center text-slate-500 text-sm">Nenhum registro encontrado.</div>)}
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

function Comportamento({ panel }: { panel: string }) {
  const [fissuras, setFissuras] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => { fetch("/api/dashboard", { cache: "no-store" }).then(res => res.json()).then(data => setFissuras(data.cravings || [])).finally(() => setCarregando(false)); }, []);

  const agrupados = fissuras.reduce((acc: any, f: any) => { const gatilho = f.trigger_description || "Não informado"; acc[gatilho] = (acc[gatilho] || 0) + 1; return acc; }, {});

  return (
    <div className={`rounded-2xl border p-8 ${panel}`}>
      <p className="text-emerald-500 text-sm font-semibold">ANÁLISE</p>
      <h1 className="text-3xl font-bold mt-2">Seus Gatilhos</h1>
      <p className="text-slate-500 mt-2">O que mais te dá vontade de fumar.</p>
      <div className="mt-8 space-y-4">
        {carregando ? <p>Carregando...</p> : Object.keys(agrupados).length === 0 ? <p>Nenhum gatilho registrado ainda.</p> : (
          Object.entries(agrupados).map(([gatilho, qtd]: any) => (
            <div key={gatilho} className="flex items-center gap-4">
              <div className="w-1/3 text-sm truncate">{gatilho}</div>
              <div className="flex-1 bg-slate-800 rounded-full h-4"><div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(qtd / fissuras.length) * 100}%` }} /></div>
              <div className="w-10 text-right text-sm font-bold">{qtd}x</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Economia({ panel }: { panel: string }) {
  const [dados, setDados] = useState<any>(null);
  useEffect(() => { fetch("/api/dashboard", { cache: "no-store" }).then(res => res.json()).then(setDados); }, []);
  const economia = dados?.settings?.pack_price ? (dados.settings.daily_cigarettes_baseline || 0) * dados.settings.pack_price : 0;

  return (
    <div className={`rounded-2xl border p-8 ${panel}`}>
      <p className="text-emerald-500 text-sm font-semibold">FINANCEIRO</p>
      <h1 className="text-3xl font-bold mt-2">Sua Economia</h1>
      <p className="text-slate-500 mt-2">Quanto você está guardando ao não fumar.</p>
      <div className="mt-8 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
        <p className="text-sm text-emerald-500 font-semibold">Economia estimada por dia</p>
        <p className="text-4xl font-bold text-emerald-400 mt-2">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(economia)}</p>
      </div>
    </div>
  );
}

function Evolucao({ panel }: { panel: string }) {
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => { fetch("/api/dashboard", { cache: "no-store" }).then((res) => res.json()).then(setDados).finally(() => setCarregando(false)); }, []);

  const settings = dados?.settings;
  const inicio = settings?.quit_started_at ? new Date(settings.quit_started_at) : null;
  const recaidas = dados?.smokingEvents || [];
  const dadosGrafico = [];
  const hoje = new Date();

  if (inicio) {
    for (let i = 29; i >= 0; i--) {
      const dia = new Date(); dia.setDate(hoje.getDate() - i);
      if (dia < inicio) continue;
      const recaidasNoDia = recaidas.filter((r: any) => new Date(r.occurred_at).toDateString() === dia.toDateString());
      let diasLimpos = 0;
      if (recaidasNoDia.length > 0) { diasLimpos = 0; } else {
        const ultimaRecaida = recaidas.filter((r: any) => new Date(r.occurred_at) <= dia).sort((a: any, b: any) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())[0];
        const base = ultimaRecaida ? new Date(ultimaRecaida.occurred_at) : inicio;
        diasLimpos = Math.floor((dia.getTime() - base.getTime()) / 86400000);
      }
      dadosGrafico.push({ data: dia.toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' }), dias: Math.max(0, diasLimpos) });
    }
  }

  const sequenciaAtual = dadosGrafico[dadosGrafico.length - 1]?.dias || 0;
  const recorde = Math.max(...dadosGrafico.map(d => d.dias), 0);
  const conquistas = [ { dias: 1, nome: "Primeiro Passo", icone: "🥉" }, { dias: 7, nome: "Uma Semana", icone: "🥈" }, { dias: 30, nome: "Um Mês", icone: "🥇" }, { dias: 100, nome: "Lenda", icone: "🏆" } ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`rounded-2xl border p-6 ${panel}`}><p className="text-sm text-slate-500">Sequência Atual</p><p className="text-4xl font-bold text-emerald-500 mt-2">{sequenciaAtual} dias</p></div>
        <div className={`rounded-2xl border p-6 ${panel}`}><p className="text-sm text-slate-500">Seu Recorde Pessoal</p><p className="text-4xl font-bold text-amber-500 mt-2">{recorde} dias</p></div>
      </div>

      <div className={`rounded-2xl border p-8 ${panel}`}>
        <h1 className="text-2xl font-bold">Sua Jornada</h1>
        <p className="text-slate-500 mt-2 mb-6">Veja sua sequência de dias sem fumar.</p>
        <div className="h-72 w-full">
          {carregando ? <p className="text-slate-500">Carregando dados...</p> : dadosGrafico.length === 0 ? <p className="text-slate-500">Configure sua tentativa para ver a evolução.</p> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="data" stroke="#64748b" tick={{ fill: '#64748b' }} />
                <YAxis stroke="#64748b" tick={{ fill: '#64748b' }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#10b981' }} formatter={(value) => [`${value} dias`, 'Sequência']} />
                <Line type="monotone" dataKey="dias" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className={`rounded-2xl border p-8 ${panel}`}>
        <h2 className="text-xl font-bold mb-4">Suas Conquistas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {conquistas.map((c) => {
            const desbloqueado = recorde >= c.dias;
            return (
              <div key={c.dias} className={`p-4 rounded-xl border flex flex-col items-center text-center ${desbloqueado ? "border-emerald-500/50 bg-emerald-500/10" : "border-slate-700 opacity-50"}`}>
                <span className="text-4xl mb-2">{c.icone}</span><p className="font-semibold text-sm">{c.nome}</p><p className="text-xs text-slate-500">{c.dias} dias</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Perfil({ panel }: { panel: string }) {
  const supabase = createClient();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    async function carregarPerfil() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || "");
        const { data } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
        setNome(data?.display_name || "");
      }
      setCarregando(false);
    }
    carregarPerfil();
  }, []);

  async function salvarPerfil() {
    setSalvando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Sessão expirada."); setSalvando(false); return; }

    const { error } = await supabase.from("profiles").upsert({ user_id: user.id, display_name: nome });

    if (error) toast.error("Erro ao salvar o nome.");
    else toast.success("Nome atualizado com sucesso!");
    
    setSalvando(false);
  }

  if (carregando) return <p className="text-slate-500">Carregando perfil...</p>;

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <p className="text-emerald-500 text-sm font-semibold">CONTA</p>
        <h1 className="text-3xl font-bold mt-2">Seu Perfil</h1>
      </div>
      
      <div className={`rounded-2xl border p-6 space-y-6 ${panel}`}>
        <div>
          <label className="block text-sm mb-2">E-mail (não editável)</label>
          <input type="email" value={email} disabled className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-slate-400 cursor-not-allowed" />
        </div>
        
        <div>
          <label className="block text-sm mb-2">Nome de exibição</label>
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como quer ser chamado?" className="w-full rounded-xl border border-slate-700 bg-transparent p-3" />
        </div>

        <button onClick={salvarPerfil} disabled={salvando} className="w-full rounded-xl bg-emerald-500 text-slate-950 font-semibold p-3 disabled:opacity-50">{salvando ? "Salvando..." : "Salvar Perfil"}</button>
      </div>
    </div>
  );
}

function Configuracoes({ panel }: { panel: string }) {
  const supabase = createClient();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [status, setStatus] = useState("preparacao");
  const [dataInicio, setDataInicio] = useState("");
  const [consumo, setConsumo] = useState("");
  const [precoMaco, setPrecoMaco] = useState("");
  const [quantidadeMaco, setQuantidadeMaco] = useState("20");

  useEffect(() => {
    supabase.from("user_settings").select("*").maybeSingle().then(({ data, error }) => {
      if (error) toast.error("Erro ao carregar configurações.");
      if (data) {
        setStatus(data.quit_status); setDataInicio(data.quit_started_at ? new Date(data.quit_started_at).toISOString().slice(0, 16) : "");
        setConsumo(data.daily_cigarettes_baseline?.toString() ?? ""); setPrecoMaco(data.pack_price?.toString() ?? ""); setQuantidadeMaco(data.cigarettes_per_pack?.toString() ?? "20");
      }
      setCarregando(false);
    });
  }, []);

  async function salvar() {
    setSalvando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Sessão expirada."); setSalvando(false); return; }
    const { error } = await supabase.from("user_settings").upsert({
      user_id: user.id, quit_status: status, quit_started_at: dataInicio ? new Date(dataInicio).toISOString() : null,
      daily_cigarettes_baseline: consumo ? Number(consumo) : null, pack_price: precoMaco ? Number(precoMaco.replace(",", ".")) : null,
      cigarettes_per_pack: Number(quantidadeMaco), updated_at: new Date().toISOString(),
    });
    if (error) toast.error("Erro ao salvar as configurações.");
    else toast.success("Configurações salvas com sucesso!");
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
        <button onClick={salvar} disabled={salvando} className="w-full rounded-xl bg-emerald-500 text-slate-950 font-semibold p-3 disabled:opacity-50">{salvando ? "Salvando..." : "Salvar"}</button>
      </div>
    </div>
  );
}

function BotaoSOSDesktop() {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [historico, setHistorico] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");

  async function acionarSOS() {
    setAberto(true); setCarregando(true); setHistorico([]);
    try {
      const res = await fetch("/api/sos", { method: "POST" });
      const data = await res.json();
      setHistorico([{ role: "assistant", content: data.message }]);
    } catch { setHistorico([{ role: "assistant", content: "Respire fundo. Beba água. Você consegue!" }]); } finally { setCarregando(false); }
  }

  async function enviarNoSOS() {
    if (!input.trim()) return;
    const novaMensagem = { role: "user", content: input };
    setHistorico((atual) => [...atual, novaMensagem]); setInput(""); setCarregando(true);
    try {
      const res = await fetch("/api/sos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mensagemUsuario: novaMensagem.content }) });
      const data = await res.json();
      setHistorico((atual) => [...atual, { role: "assistant", content: data.message }]);
    } catch { setHistorico((atual) => [...atual, { role: "assistant", content: "Tive um problema de conexão, mas respire fundo. Estou aqui." }]); } finally { setCarregando(false); }
  }

  return (
    <>
      <button onClick={acionarSOS} className="hidden lg:flex fixed bottom-6 right-6 z-50 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full w-16 h-16 items-center justify-center shadow-lg transition-transform hover:scale-110" title="Preciso de ajuda agora!">SOS</button>

      {aberto && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/50 rounded-3xl p-6 w-full max-w-lg text-white flex flex-col h-[80vh] max-h-[600px]">
            <div className="flex justify-between items-center mb-4 shrink-0"><h2 className="text-2xl font-bold text-red-500">Modo SOS</h2><button onClick={() => setAberto(false)} className="text-slate-400 hover:text-white text-2xl">✕</button></div>
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
              {historico.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl p-4 text-sm ${msg.role === "user" ? "bg-red-600 text-white" : "bg-slate-800 border border-slate-700"}`}>{msg.content}</div></div>
              ))}
              {carregando && (<div className="flex justify-start"><div className="bg-slate-800 rounded-2xl p-4 text-sm text-slate-400 animate-pulse">SEM está digitando...</div></div>)}
            </div>
            <div className="shrink-0 flex gap-2">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enviarNoSOS()} placeholder="Desabafe ou peça ajuda..." className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-red-500" />
              <button onClick={enviarNoSOS} disabled={carregando || !input.trim()} className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold px-4 rounded-xl">Enviar</button>
            </div>
            <button onClick={() => setAberto(false)} className="mt-4 w-full py-2 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-200 transition-colors shrink-0">Estou Melhor</button>
          </div>
        </div>
      )}
    </>
  );
}

function TesteBotaoChatMobile() {
  return (
    <button 
      onClick={() => { alert("Funcionou! Redirecionando..."); window.location.href = "/conversa"; }} 
      className="fixed inset-0 z-[99999] bg-red-600 text-white font-bold text-2xl flex items-center justify-center lg:hidden"
    >
      CLIQUE AQUI PARA IR AO CHAT
    </button>
  );
}