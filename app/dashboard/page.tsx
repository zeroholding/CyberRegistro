'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import PurchaseCreditsModal from '../components/PurchaseCreditsModal';
import { MercadoLivreIcon, ShopeeIcon } from '../components/MarketplaceIcons';

interface Account {
  id: string;
  nickname: string;
  first_name: string;
  last_name: string;
}

interface AccountStats {
  account_id: string;
  total: number;
  active: number;
  paused: number;
  under_review: number;
  protegidos: number;
  protegidos_ativos: number;
}

interface ShopeeAccount {
  id: string;
  shop_id: string;
  shop_name: string;
}

export default function Dashboard() {
  const [usuario, setUsuario] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsStats, setAccountsStats] = useState<AccountStats[]>([]);
  const [credits, setCredits] = useState(0);
  const [registrosRealizados, setRegistrosRealizados] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [totalGeralDistinct, setTotalGeralDistinct] = useState<number | null>(null);
  const [shopeeAccounts, setShopeeAccounts] = useState<ShopeeAccount[]>([]);
  const [shopeeStats, setShopeeStats] = useState<AccountStats[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Verificar se o usuário está autenticado
    const token = localStorage.getItem('token');

    if (!token) {
      router.push('/login');
      return;
    }

    // Decodificar o token para obter informações do usuário
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUsuario(payload);
      fetchDashboardData(payload.id);
    } catch (error) {
      console.error('Erro ao decodificar token:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchDashboardData = async (userId: string) => {
    setLoadingData(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      // Executar todas as requisições em paralelo
      const [accountsRes, statsRes, creditsRes, registrosRes, shopeeAccountsRes, shopeeStatsRes] = await Promise.all([
        fetch(`/api/mercadolivre/accounts?userId=${userId}`, { headers }),
        fetch('/api/listings-stats', { headers }),
        fetch('/api/credits', { headers }),
        fetch(`/api/registro/sent?userId=${userId}`, { headers }),
        fetch(`/api/shopee/accounts?userId=${userId}`, { headers }),
        fetch('/api/shopee/listings-stats', { headers }),
      ]);

      // Processar contas conectadas
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        console.log('Contas recebidas:', accountsData);
        setAccounts(accountsData.accounts || []);
      } else {
        console.error('Erro ao buscar contas:', await accountsRes.text());
      }

      // Processar estatísticas de anúncios
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        console.log('Estatísticas recebidas:', statsData);
        
        // Garantir que os números são inteiros
        const stats = (statsData.stats || []).map((stat: any) => ({
          account_id: stat.account_id,
          total: parseInt(stat.total) || 0,
          active: parseInt(stat.active) || 0,
          paused: parseInt(stat.paused) || 0,
          under_review: parseInt(stat.under_review) || 0,
          protegidos: parseInt(stat.protegidos) || 0,
          protegidos_ativos: parseInt(stat.protegidos_ativos) || 0,
        }));

        setAccountsStats(stats);
        // Usar total geral distinto do backend quando disponível para evitar duplicidade
        if (typeof statsData.totalGeral !== 'undefined') {
          const tg = parseInt(statsData.totalGeral);
          if (!isNaN(tg)) setTotalGeralDistinct(tg);
        }
      } else {
        console.error('Erro ao buscar estatísticas:', await statsRes.text());
      }

      // Processar créditos
      if (creditsRes.ok) {
        const creditsData = await creditsRes.json();
        setCredits(creditsData.credits || 0);
      }

      // Processar registros realizados
      if (registrosRes.ok) {
        const registrosData = await registrosRes.json();
        const totalRegistros = registrosData.anuncios?.length || 0;
        console.log('Registros recebidos:', {
          total: totalRegistros,
          anuncios: registrosData.anuncios
        });
        setRegistrosRealizados(totalRegistros);
      } else {
        console.error('Erro ao buscar registros:', await registrosRes.text());
      }

      // Processar contas Shopee
      if (shopeeAccountsRes.ok) {
        const shopeeAccountsData = await shopeeAccountsRes.json();
        setShopeeAccounts(shopeeAccountsData.accounts || []);
      } else {
        console.error('Erro ao buscar contas Shopee:', await shopeeAccountsRes.text());
      }

      // Processar estatísticas de anúncios Shopee
      if (shopeeStatsRes.ok) {
        const shopeeStatsData = await shopeeStatsRes.json();
        const sStats = (shopeeStatsData.stats || []).map((stat: any) => ({
          account_id: String(stat.account_id),
          total: parseInt(stat.total) || 0,
          active: parseInt(stat.active) || 0,
          paused: parseInt(stat.paused) || 0,
          under_review: parseInt(stat.under_review) || 0,
          protegidos: parseInt(stat.protegidos) || 0,
          protegidos_ativos: parseInt(stat.protegidos_ativos) || 0,
        }));
        setShopeeStats(sStats);
      } else {
        console.error('Erro ao buscar estatísticas Shopee:', await shopeeStatsRes.text());
      }
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const refreshCredits = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
      const res = await fetch('/api/credits', { headers });
      if (res.ok) {
        const data = await res.json();
        setCredits(Number(data.credits || 0));
      }
    } catch (error) {
      console.error('Erro ao atualizar créditos:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-[#2F4F7F]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-neutral-600">Carregando...</span>
        </div>
      </div>
    );
  }

  const computedTotalAnuncios = accountsStats.reduce((acc, stat) => acc + (Number(stat.total) || 0), 0);
  const totalAnuncios = (typeof totalGeralDistinct === 'number' && totalGeralDistinct >= 0)
    ? totalGeralDistinct
    : computedTotalAnuncios;
  const totalAtivos = accountsStats.reduce((acc, stat) => acc + (Number(stat.active) || 0), 0);
  const totalInativos = accountsStats.reduce((acc, stat) => acc + (Number(stat.paused) || 0), 0);
  const totalEmRevisao = accountsStats.reduce((acc, stat) => acc + (Number(stat.under_review) || 0), 0);

  // Totais Shopee — anúncios "reais" = ativos (pausados/inativos ficam só como detalhe)
  const shopeeTotalAtivos = shopeeStats.reduce((acc, stat) => acc + (Number(stat.active) || 0), 0);
  const shopeeTotalInativos = shopeeStats.reduce((acc, stat) => acc + (Number(stat.paused) || 0), 0);

  // ===== Consolidado ML + Shopee (o que o usuário realmente tem) =====
  const ativosGeral = totalAtivos + shopeeTotalAtivos;
  const pausadosGeral = totalInativos + shopeeTotalInativos;
  // "Protegido" = certificado emitido, com o MESMO critério da tela /certificados
  // (registro_status = 'protegido' OU registro_gerado_em preenchido), somando
  // as contas de ML e as lojas Shopee. Considera apenas anúncios ativos, que é
  // a base comparável do card de proteção.
  const protegidosMl = accountsStats.reduce((acc, s) => acc + (Number(s.protegidos_ativos) || 0), 0);
  const protegidosShopee = shopeeStats.reduce((acc, s) => acc + (Number(s.protegidos_ativos) || 0), 0);
  const protegidos = protegidosMl + protegidosShopee;
  const desprotegidos = Math.max(0, ativosGeral - protegidos);
  const percentualProtegido = ativosGeral > 0 ? (protegidos / ativosGeral) * 100 : 0;
  const totalContas = accounts.length + shopeeAccounts.length;

  // Consolidado de status e catálogo (ML + Shopee)
  const shopeeEmRevisao = shopeeStats.reduce((acc, s) => acc + (Number(s.under_review) || 0), 0);
  const revisaoGeral = totalEmRevisao + shopeeEmRevisao;
  const shopeeTotalCatalogo = shopeeStats.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
  const catalogoGeral = totalAnuncios + shopeeTotalCatalogo;

  // Cobertura de créditos: quanto do que falta proteger dá para cobrir hoje
  const coberturaCreditos = desprotegidos > 0 ? Math.min(100, (credits / desprotegidos) * 100) : 100;
  const creditosFaltantes = Math.max(0, desprotegidos - credits);

  // Conta que mais precisa de atenção (menor % de proteção entre as ativas)
  const contasComProtecao = [
    ...accounts.map((a) => {
      const s = accountsStats.find((x) => x.account_id === a.id);
      return {
        key: `ml:${a.id}`,
        nome: a.nickname || `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim() || 'Conta ML',
        plataforma: 'mercadolivre' as const,
        ativos: s?.active ?? 0,
        protegidos: s?.protegidos_ativos ?? 0,
      };
    }),
    ...shopeeAccounts.map((a) => {
      const s = shopeeStats.find((x) => x.account_id === String(a.id));
      return {
        key: `shopee:${a.id}`,
        nome: a.shop_name || `Loja ${a.shop_id}`,
        plataforma: 'shopee' as const,
        ativos: s?.active ?? 0,
        protegidos: s?.protegidos_ativos ?? 0,
      };
    }),
  ].filter((c) => c.ativos > 0);

  const contaAtencao = contasComProtecao
    .map((c) => ({ ...c, pct: (c.protegidos / c.ativos) * 100 }))
    .sort((a, b) => a.pct - b.pct)[0];

  // Cor do nível de proteção (semântica: verde ok, âmbar atenção, vermelho risco)
  const nivelCor =
    percentualProtegido >= 70 ? '#16a34a' : percentualProtegido >= 30 ? '#d97706' : '#dc2626';

  // Donut de proteção (SVG puro)
  const donutR = 52;
  const donutC = 2 * Math.PI * donutR;
  const donutOffset = donutC - (Math.min(100, percentualProtegido) / 100) * donutC;

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <Topbar
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onLogout={handleLogout}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-neutral-50">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Header com boas-vindas */}
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-neutral-900 mb-1">
                  Olá, {usuario?.nome || 'Usuário'}
                </h1>
                <p className="text-sm text-neutral-500">
                  Visão geral da sua proteção de propriedade intelectual
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
            </div>

            {loadingData ? (
              /* Skeleton — dá sensação de carregamento mais rápido que um spinner */
              <div className="space-y-6 animate-pulse">
                <div className="h-40 rounded-xl bg-white border border-neutral-200" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-28 rounded-xl bg-white border border-neutral-200" />
                  ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 h-64 rounded-xl bg-white border border-neutral-200" />
                  <div className="h-64 rounded-xl bg-white border border-neutral-200" />
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Faixa de pendências — só aparece quando há algo a resolver */}
                {(totalContas === 0 || credits < 10 || desprotegidos > 0) && (
                  <div className="space-y-3">
                    {totalContas === 0 && (
                      <div className="flex items-start gap-3 rounded-xl border border-[#2F4F7F]/20 bg-[#2F4F7F]/5 p-4">
                        <svg className="w-5 h-5 text-[#2F4F7F] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-neutral-900">Conecte sua primeira conta</p>
                          <p className="text-sm text-neutral-600">Conecte o Mercado Livre ou a Shopee para sincronizar seus anúncios.</p>
                        </div>
                        <Link href="/contas-conectadas" className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#2F4F7F] text-white text-xs font-semibold hover:bg-[#253B65] transition-colors">
                          Conectar
                        </Link>
                      </div>
                    )}
                    {desprotegidos > 0 && (
                      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-amber-900">
                            {desprotegidos.toLocaleString()} anúncio{desprotegidos !== 1 ? 's' : ''} sem proteção
                          </p>
                          <p className="text-sm text-amber-800">Gere o certificado de registro para garantir a proteção legal.</p>
                        </div>
                        <Link href="/registro" className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors">
                          Proteger
                        </Link>
                      </div>
                    )}
                    {credits < 10 && (
                      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                        <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-red-900">
                            Créditos baixos — {credits} restante{credits !== 1 ? 's' : ''}
                          </p>
                          <p className="text-sm text-red-800">Cada certificado consome 1 crédito. Recarregue para não interromper os registros.</p>
                        </div>
                        <button
                          onClick={() => setIsPurchaseModalOpen(true)}
                          className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
                        >
                          Comprar
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* HERO — Nível de Proteção (métrica central do produto) */}
                <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
                  <div className="grid lg:grid-cols-[auto_1fr] gap-8 p-6 lg:p-8 items-center">
                    {/* Donut */}
                    <div className="relative mx-auto lg:mx-0 w-[140px] h-[140px]">
                      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                        <circle cx="60" cy="60" r={donutR} fill="none" stroke="#f1f5f9" strokeWidth="12" />
                        <circle
                          cx="60"
                          cy="60"
                          r={donutR}
                          fill="none"
                          stroke={nivelCor}
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray={donutC}
                          strokeDashoffset={donutOffset}
                          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-neutral-900 leading-none">
                          {percentualProtegido.toFixed(0)}%
                        </span>
                        <span className="text-[11px] text-neutral-500 mt-1">protegido</span>
                      </div>
                    </div>

                    {/* Texto + ações */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5" style={{ color: nivelCor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <h2 className="text-lg font-semibold text-neutral-900">Nível de Proteção</h2>
                      </div>
                      <p className="text-3xl font-bold text-neutral-900 leading-tight">
                        {protegidos.toLocaleString()}
                        <span className="text-lg font-medium text-neutral-400"> de {ativosGeral.toLocaleString()} anúncios</span>
                      </p>
                      <p className="text-sm text-neutral-500 mt-1">
                        {desprotegidos > 0
                          ? `Faltam ${desprotegidos.toLocaleString()} anúncios para a proteção completa.`
                          : ativosGeral > 0
                            ? 'Todos os seus anúncios ativos estão protegidos.'
                            : 'Sincronize seus anúncios para começar.'}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 mt-5">
                        <Link
                          href="/registro"
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2F4F7F] text-white text-sm font-semibold hover:bg-[#253B65] transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          Proteger anúncios
                        </Link>
                        <Link
                          href="/anuncios"
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-neutral-200 text-neutral-700 text-sm font-semibold hover:bg-neutral-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Sincronizar anúncios
                        </Link>
                        <Link
                          href="/bpp-ml"
                          className="text-sm font-medium text-[#2F4F7F] hover:underline"
                        >
                          Proteção BPP ML
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Régua por marketplace */}
                  <div className="grid sm:grid-cols-2 border-t border-neutral-100 divide-y sm:divide-y-0 sm:divide-x divide-neutral-100">
                    <Link
                      href="/anuncios?platform=mercadolivre"
                      className="flex items-center gap-3 px-6 py-4 hover:bg-neutral-50/70 transition-colors group"
                    >
                      <MercadoLivreIcon className="w-7 h-7 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 group-hover:underline">
                          {totalAtivos.toLocaleString()} ativos
                        </p>
                        <p className="text-xs text-neutral-500">
                          {accounts.length} {accounts.length === 1 ? 'conta' : 'contas'} · {protegidosMl.toLocaleString()} protegidos
                        </p>
                      </div>
                      <svg className="ml-auto w-4 h-4 text-neutral-300 group-hover:text-[#2F4F7F] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                    <Link
                      href="/anuncios?platform=shopee"
                      className="flex items-center gap-3 px-6 py-4 hover:bg-neutral-50/70 transition-colors group"
                    >
                      <ShopeeIcon className="w-7 h-7 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 group-hover:underline">
                          {shopeeTotalAtivos.toLocaleString()} ativos
                        </p>
                        <p className="text-xs text-neutral-500">
                          {shopeeAccounts.length} {shopeeAccounts.length === 1 ? 'loja' : 'lojas'} · {protegidosShopee.toLocaleString()} protegidos
                        </p>
                      </div>
                      <svg className="ml-auto w-4 h-4 text-neutral-300 group-hover:text-[#EE4D2D] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>

                {/* KPIs consolidados (ML + Shopee) — card inteiro clicável */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Link
                    href="/anuncios?status=active"
                    className="group bg-white rounded-xl border border-neutral-200 p-5 hover:border-[#2F4F7F]/40 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Anúncios ativos</span>
                      <svg className="w-4 h-4 text-neutral-400 group-hover:text-[#2F4F7F] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <p className="text-3xl font-semibold text-neutral-900">{ativosGeral.toLocaleString()}</p>
                    <p className="text-xs text-neutral-500 mt-2">
                      {pausadosGeral.toLocaleString()} pausados · {totalEmRevisao.toLocaleString()} em revisão
                    </p>
                  </Link>

                  <Link
                    href="/certificados"
                    className="group bg-white rounded-xl border border-neutral-200 p-5 hover:border-green-500/40 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Protegidos</span>
                      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <p className="text-3xl font-semibold text-green-600">{protegidos.toLocaleString()}</p>
                    <p className="text-xs text-neutral-500 mt-2">
                      Anúncios ativos com certificado
                      {registrosRealizados > 0 && ` · ${registrosRealizados.toLocaleString()} no registro`}
                    </p>
                  </Link>

                  <Link
                    href="/registro"
                    className="group bg-white rounded-xl border border-neutral-200 p-5 hover:border-amber-500/40 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Sem proteção</span>
                      <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <p className={`text-3xl font-semibold ${desprotegidos > 0 ? 'text-amber-600' : 'text-neutral-900'}`}>
                      {desprotegidos.toLocaleString()}
                    </p>
                    <p className="text-xs text-neutral-500 mt-2">
                      {desprotegidos > 0 ? 'Aguardando certificado' : 'Nada pendente'}
                    </p>
                  </Link>

                  <div className="bg-white rounded-xl border border-neutral-200 p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Créditos</span>
                      <svg className="w-4 h-4 text-[#2F4F7F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className={`text-3xl font-semibold ${credits < 10 ? 'text-red-600' : 'text-neutral-900'}`}>{credits}</p>
                    <button
                      onClick={() => setIsPurchaseModalOpen(true)}
                      className="mt-auto pt-3 text-xs font-semibold text-[#2F4F7F] hover:underline text-left"
                    >
                      Adicionar créditos
                    </button>
                  </div>
                </div>

                {/* Contas e anúncios — ML e Shopee unificados */}
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                    <h2 className="text-base font-semibold text-neutral-900">Contas e anúncios</h2>
                    <Link href="/contas-conectadas" className="text-sm font-medium text-[#2F4F7F] hover:underline">
                      Gerenciar
                    </Link>
                  </div>

                  {totalContas === 0 ? (
                    <div className="px-5 py-12 text-center">
                      <svg className="w-12 h-12 text-neutral-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <p className="text-sm font-medium text-neutral-900 mb-1">Nenhuma conta conectada</p>
                      <p className="text-sm text-neutral-500 mb-5">Conecte o Mercado Livre ou a Shopee para começar.</p>
                      <Link
                        href="/contas-conectadas"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2F4F7F] text-white text-sm font-semibold hover:bg-[#253B65] transition-colors"
                      >
                        Conectar conta
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-100">
                      {/* Cabeçalho da lista */}
                      <div className="hidden md:grid grid-cols-[1fr_80px_80px_80px_170px] gap-4 px-5 py-2.5 bg-neutral-50/70 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                        <span>Conta</span>
                        <span className="text-right">Total</span>
                        <span className="text-right">Ativos</span>
                        <span className="text-right">Pausados</span>
                        <span>Protegidos</span>
                      </div>

                      {/* Contas Mercado Livre */}
                      {accounts.map((account) => {
                        const stats = accountsStats.find((s) => s.account_id === account.id);
                        const ativosConta = stats?.active ?? 0;
                        const protConta = stats?.protegidos_ativos ?? 0;
                        const pctConta = ativosConta > 0 ? (protConta / ativosConta) * 100 : 0;
                        return (
                          <Link
                            key={`ml-${account.id}`}
                            href={`/anuncios?platform=mercadolivre&accountId=ml:${account.id}`}
                            className="grid grid-cols-2 md:grid-cols-[1fr_80px_80px_80px_170px] gap-3 md:gap-4 px-5 py-3.5 items-center hover:bg-neutral-50/60 transition-colors"
                          >
                            <div className="col-span-2 md:col-span-1 flex items-center gap-3 min-w-0">
                              <span className="w-8 h-8 rounded-lg border border-neutral-200 bg-white flex items-center justify-center flex-shrink-0">
                                <MercadoLivreIcon className="w-5 h-5" />
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-neutral-900 truncate">
                                  {account.first_name} {account.last_name}
                                </p>
                                <p className="text-xs text-neutral-500 truncate">@{account.nickname}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="md:hidden text-[11px] text-neutral-500 mr-1">Total</span>
                              <span className="text-sm font-semibold text-neutral-900">{(stats?.total ?? 0).toLocaleString()}</span>
                            </div>
                            <div className="text-right">
                              <span className="md:hidden text-[11px] text-neutral-500 mr-1">Ativos</span>
                              <span className="text-sm font-semibold text-green-600">{(stats?.active ?? 0).toLocaleString()}</span>
                            </div>
                            <div className="text-right">
                              <span className="md:hidden text-[11px] text-neutral-500 mr-1">Pausados</span>
                              <span className="text-sm font-semibold text-neutral-400">{(stats?.paused ?? 0).toLocaleString()}</span>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-neutral-500">
                                  {protConta.toLocaleString()} / {ativosConta.toLocaleString()}
                                </span>
                                <span className="text-xs font-semibold text-neutral-700">{pctConta.toFixed(0)}%</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(100, pctConta)}%`,
                                    backgroundColor: pctConta >= 70 ? '#16a34a' : pctConta >= 30 ? '#d97706' : '#dc2626',
                                  }}
                                />
                              </div>
                            </div>
                          </Link>
                        );
                      })}

                      {/* Lojas Shopee */}
                      {shopeeAccounts.map((account) => {
                        const stats = shopeeStats.find((s) => s.account_id === String(account.id));
                        const ativosLoja = stats?.active ?? 0;
                        const protLoja = stats?.protegidos_ativos ?? 0;
                        const pctLoja = ativosLoja > 0 ? (protLoja / ativosLoja) * 100 : 0;
                        return (
                          <Link
                            key={`sp-${account.id}`}
                            href={`/anuncios?platform=shopee&accountId=shopee:${account.id}`}
                            className="grid grid-cols-2 md:grid-cols-[1fr_80px_80px_80px_170px] gap-3 md:gap-4 px-5 py-3.5 items-center hover:bg-neutral-50/60 transition-colors"
                          >
                            <div className="col-span-2 md:col-span-1 flex items-center gap-3 min-w-0">
                              <span className="w-8 h-8 rounded-lg border border-orange-100 bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <ShopeeIcon className="w-5 h-5" />
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-neutral-900 truncate">
                                  {account.shop_name || `Loja ${account.shop_id}`}
                                </p>
                                <p className="text-xs text-neutral-500 truncate">ID {account.shop_id}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="md:hidden text-[11px] text-neutral-500 mr-1">Total</span>
                              <span className="text-sm font-semibold text-neutral-900">{(stats?.total ?? 0).toLocaleString()}</span>
                            </div>
                            <div className="text-right">
                              <span className="md:hidden text-[11px] text-neutral-500 mr-1">Ativos</span>
                              <span className="text-sm font-semibold text-green-600">{(stats?.active ?? 0).toLocaleString()}</span>
                            </div>
                            <div className="text-right">
                              <span className="md:hidden text-[11px] text-neutral-500 mr-1">Pausados</span>
                              <span className="text-sm font-semibold text-neutral-400">{(stats?.paused ?? 0).toLocaleString()}</span>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-neutral-500">
                                  {protLoja.toLocaleString()} / {ativosLoja.toLocaleString()}
                                </span>
                                <span className="text-xs font-semibold text-neutral-700">{pctLoja.toFixed(0)}%</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(100, pctLoja)}%`,
                                    backgroundColor: pctLoja >= 70 ? '#16a34a' : pctLoja >= 30 ? '#d97706' : '#dc2626',
                                  }}
                                />
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Detalhamento */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Status dos anúncios — consolidado ML + Shopee, cada linha filtra */}
                  <div className="bg-white rounded-xl border border-neutral-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-neutral-900">Status dos anúncios</h3>
                      <Link href="/anuncios" className="text-xs font-medium text-[#2F4F7F] hover:underline">
                        Ver todos
                      </Link>
                    </div>

                    {catalogoGeral > 0 ? (
                      <div className="space-y-4">
                        {[
                          { label: 'Ativos', value: ativosGeral, color: '#16a34a', status: 'active' },
                          { label: 'Pausados', value: pausadosGeral, color: '#a3a3a3', status: 'paused' },
                          { label: 'Em revisão', value: revisaoGeral, color: '#2563eb', status: 'under_review' },
                        ].map((row) => (
                          <Link key={row.status} href={`/anuncios?status=${row.status}`} className="block group">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                                <span className="text-sm text-neutral-700 group-hover:text-neutral-900">{row.label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-neutral-900">{row.value.toLocaleString()}</span>
                                <span className="text-xs text-neutral-400">
                                  {catalogoGeral > 0 ? ((row.value / catalogoGeral) * 100).toFixed(0) : 0}%
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-2 rounded-full transition-all"
                                style={{
                                  width: `${catalogoGeral > 0 ? (row.value / catalogoGeral) * 100 : 0}%`,
                                  backgroundColor: row.color,
                                }}
                              />
                            </div>
                          </Link>
                        ))}

                        <div className="pt-4 border-t border-neutral-100 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-neutral-600">Catálogo total</span>
                            <span className="font-semibold text-neutral-900">{catalogoGeral.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-neutral-600">Contas conectadas</span>
                            <Link href="/contas-conectadas" className="font-semibold text-[#2F4F7F] hover:underline">
                              {totalContas}
                            </Link>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <svg className="w-12 h-12 text-neutral-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p className="text-sm text-neutral-500 mb-4">Nenhum anúncio sincronizado</p>
                        <Link href="/anuncios" className="text-sm font-semibold text-[#2F4F7F] hover:underline">
                          Sincronizar agora
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Cobertura de créditos + conta que precisa de atenção */}
                  <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-neutral-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-neutral-900">Cobertura de créditos</h3>
                        <svg className="w-4 h-4 text-[#2F4F7F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>

                      <p className="text-sm text-neutral-600 mb-3">
                        {desprotegidos === 0 ? (
                          <>Nada pendente. Seus créditos ficam reservados para novos anúncios.</>
                        ) : creditosFaltantes === 0 ? (
                          <>
                            Seus <strong className="text-neutral-900">{credits}</strong> créditos cobrem os{' '}
                            <strong className="text-neutral-900">{desprotegidos.toLocaleString()}</strong> anúncios sem proteção.
                          </>
                        ) : (
                          <>
                            Seus <strong className="text-neutral-900">{credits}</strong> créditos cobrem{' '}
                            <strong className="text-neutral-900">{coberturaCreditos.toFixed(0)}%</strong> dos{' '}
                            {desprotegidos.toLocaleString()} anúncios sem proteção.
                          </>
                        )}
                      </p>

                      <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden mb-3">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${coberturaCreditos}%`,
                            backgroundColor: creditosFaltantes === 0 ? '#16a34a' : coberturaCreditos >= 30 ? '#d97706' : '#dc2626',
                          }}
                        />
                      </div>

                      {creditosFaltantes > 0 && (
                        <p className="text-xs text-neutral-500 mb-4">
                          Faltam <strong className="text-neutral-700">{creditosFaltantes.toLocaleString()}</strong> créditos para
                          proteger tudo.
                        </p>
                      )}

                      <button
                        onClick={() => setIsPurchaseModalOpen(true)}
                        className="w-full px-4 py-2.5 rounded-lg bg-[#2F4F7F] text-white text-sm font-semibold hover:bg-[#253B65] transition-colors"
                      >
                        Adicionar créditos
                      </button>
                    </div>

                    {/* Conta que precisa de atenção */}
                    {contaAtencao && contaAtencao.pct < 100 && (
                      <Link
                        href={`/anuncios?platform=${contaAtencao.plataforma}&accountId=${contaAtencao.key}`}
                        className="block bg-white rounded-xl border border-neutral-200 p-6 hover:border-amber-400/60 hover:shadow-sm transition-all group"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-base font-semibold text-neutral-900">Precisa de atenção</h3>
                          <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="w-8 h-8 rounded-lg border border-neutral-200 bg-white flex items-center justify-center flex-shrink-0">
                            {contaAtencao.plataforma === 'shopee' ? (
                              <ShopeeIcon className="w-5 h-5" />
                            ) : (
                              <MercadoLivreIcon className="w-5 h-5" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-neutral-900 truncate group-hover:underline">
                              {contaAtencao.nome}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {contaAtencao.protegidos.toLocaleString()} de {contaAtencao.ativos.toLocaleString()} protegidos
                            </p>
                          </div>
                          <span className="ml-auto text-lg font-bold text-amber-600">{contaAtencao.pct.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                          <div className="h-1.5 rounded-full bg-amber-500" style={{ width: `${contaAtencao.pct}%` }} />
                        </div>
                      </Link>
                    )}
                  </div>

                  {/* Próximos passos — acionável, baseado nos dados reais */}
                  <div className="bg-white rounded-xl border border-neutral-200 p-6">
                    <h3 className="text-base font-semibold text-neutral-900 mb-4">Próximos passos</h3>
                    <ol className="space-y-3">
                      {[
                        {
                          label: 'Conectar conta',
                          hint: 'Mercado Livre ou Shopee',
                          done: totalContas > 0,
                          href: '/contas-conectadas',
                          action: 'Conectar',
                        },
                        {
                          label: 'Sincronizar anúncios',
                          hint: 'Importe seu catálogo',
                          done: ativosGeral > 0,
                          href: '/anuncios',
                          action: 'Sincronizar',
                        },
                        {
                          label: 'Ter créditos disponíveis',
                          hint: '1 crédito por certificado',
                          done: credits > 0,
                          href: null,
                          action: 'Comprar',
                        },
                        {
                          label: 'Gerar certificados',
                          hint: 'Proteja seus anúncios',
                          done: protegidos > 0,
                          href: '/registro',
                          action: 'Gerar',
                        },
                        {
                          label: 'Cadastrar no BPP / Brand IP',
                          hint: 'Registre nos marketplaces',
                          done: false,
                          href: '/bpp-ml',
                          action: 'Ver passos',
                        },
                      ].map((step) => (
                        <li key={step.label} className="flex items-start gap-3">
                          {step.done ? (
                            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                              <svg className="h-3 w-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          ) : (
                            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 border-neutral-200" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium ${step.done ? 'text-neutral-400 line-through' : 'text-neutral-900'}`}>
                              {step.label}
                            </p>
                            {!step.done && <p className="text-xs text-neutral-500">{step.hint}</p>}
                          </div>
                          {!step.done && (
                            step.href ? (
                              <Link href={step.href} className="flex-shrink-0 text-xs font-semibold text-[#2F4F7F] hover:underline">
                                {step.action}
                              </Link>
                            ) : (
                              <button
                                onClick={() => setIsPurchaseModalOpen(true)}
                                className="flex-shrink-0 text-xs font-semibold text-[#2F4F7F] hover:underline"
                              >
                                {step.action}
                              </button>
                            )
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
        {/* Modal de compra de créditos */}
        <PurchaseCreditsModal
          isOpen={isPurchaseModalOpen}
          onClose={() => setIsPurchaseModalOpen(false)}
          onCreditsUpdated={refreshCredits}
        />
      </div>
    </div>
  );
}
