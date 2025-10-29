'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

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
      const [accountsRes, statsRes, creditsRes, registrosRes] = await Promise.all([
        fetch(`/api/mercadolivre/accounts?userId=${userId}`, { headers }),
        fetch('/api/listings-stats', { headers }),
        fetch('/api/credits', { headers }),
        fetch(`/api/registro/sent?userId=${userId}`, { headers }),
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
        }));
        
        console.log('Estatísticas processadas:', stats);
        setAccountsStats(stats);
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
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoadingData(false);
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

  const totalAnuncios = accountsStats.reduce((acc, stat) => acc + (Number(stat.total) || 0), 0);
  const totalAtivos = accountsStats.reduce((acc, stat) => acc + (Number(stat.active) || 0), 0);
  const totalInativos = accountsStats.reduce((acc, stat) => acc + (Number(stat.paused) || 0), 0);
  const totalEmRevisao = accountsStats.reduce((acc, stat) => acc + (Number(stat.under_review) || 0), 0);

  // Log para debug
  console.log('Totais calculados:', {
    totalAnuncios,
    totalAtivos,
    totalInativos,
    totalEmRevisao,
    registrosRealizados,
    percentualProtegido: totalAnuncios > 0 ? ((registrosRealizados / totalAnuncios) * 100).toFixed(1) : 0
  });

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
            <div className="mb-10">
              <h1 className="text-2xl font-semibold text-neutral-900 mb-1">
                Olá, {usuario?.nome || 'Usuário'}
              </h1>
              <p className="text-sm text-neutral-500">
                Visão geral da sua proteção de propriedade intelectual
              </p>
            </div>

            {loadingData ? (
              <div className="flex items-center justify-center py-12">
                <svg className="animate-spin h-8 w-8 text-[#2F4F7F]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Ações Rápidas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link
                    href="/anuncios"
                    className="bg-white rounded-lg border border-neutral-200 p-6 hover:border-[#2F4F7F] hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-neutral-900">Sincronizar Anúncios</h3>
                      <svg className="w-5 h-5 text-neutral-400 group-hover:text-[#2F4F7F] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <p className="text-xs text-neutral-500 mb-4">
                      Sincronize seus anúncios do Mercado Livre para manter tudo atualizado
                    </p>
                    <span className="text-xs font-medium text-[#2F4F7F] group-hover:underline">
                      Acessar →
                    </span>
                  </Link>

                  <Link
                    href="/registro"
                    className="bg-white rounded-lg border border-neutral-200 p-6 hover:border-[#2F4F7F] hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-neutral-900">Gerar Certificados</h3>
                      <svg className="w-5 h-5 text-neutral-400 group-hover:text-[#2F4F7F] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-xs text-neutral-500 mb-4">
                      Crie certificados de registro para proteger sua propriedade intelectual
                    </p>
                    <span className="text-xs font-medium text-[#2F4F7F] group-hover:underline">
                      Acessar →
                    </span>
                  </Link>

                  <Link
                    href="/bpp-ml"
                    className="bg-white rounded-lg border border-neutral-200 p-6 hover:border-[#2F4F7F] hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-neutral-900">Proteção BPP</h3>
                      <svg className="w-5 h-5 text-neutral-400 group-hover:text-[#2F4F7F] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <p className="text-xs text-neutral-500 mb-4">
                      Configure a proteção BPP no Mercado Livre para seus anúncios
                    </p>
                    <span className="text-xs font-medium text-[#2F4F7F] group-hover:underline">
                      Acessar →
                    </span>
                  </Link>
                </div>

                {/* Cards de Métricas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Card Créditos */}
                  <div className="bg-white rounded-lg border border-neutral-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Créditos</span>
                      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-3xl font-semibold text-neutral-900">{credits}</p>
                    <p className="text-xs text-neutral-500 mt-2">Disponíveis</p>
                  </div>

                  {/* Card Registros */}
                  <div className="bg-white rounded-lg border border-neutral-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Registros</span>
                      <svg className="w-4 h-4 text-[#2F4F7F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-3xl font-semibold text-neutral-900">{registrosRealizados}</p>
                    <p className="text-xs text-neutral-500 mt-2">Certificados</p>
                  </div>

                  {/* Card Contas */}
                  <div className="bg-white rounded-lg border border-neutral-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Contas</span>
                      <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <p className="text-3xl font-semibold text-neutral-900">{accounts.length}</p>
                    <p className="text-xs text-neutral-500 mt-2">Conectadas</p>
                  </div>

                  {/* Card Anúncios */}
                  <div className="bg-white rounded-lg border border-neutral-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Anúncios</span>
                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <p className="text-3xl font-semibold text-neutral-900">{totalAnuncios}</p>
                    <p className="text-xs text-neutral-500 mt-2">Total</p>
                  </div>
                </div>

                {/* Contas Conectadas */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-neutral-900">
                      Contas do Mercado Livre
                    </h2>
                    {accounts.length > 0 && (
                      <Link
                        href="/contas-conectadas"
                        className="text-sm text-[#2F4F7F] hover:text-[#253B65] font-medium"
                      >
                        Gerenciar →
                      </Link>
                    )}
                  </div>

                  {accounts.length === 0 ? (
                    <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
                      <svg className="w-12 h-12 text-neutral-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <h3 className="text-base font-medium text-neutral-900 mb-2">
                        Nenhuma conta conectada
                      </h3>
                      <p className="text-sm text-neutral-500 mb-6 max-w-sm mx-auto">
                        Conecte sua conta do Mercado Livre para sincronizar anúncios e gerar certificados
                      </p>
                      <Link
                        href="/contas-conectadas"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2F4F7F] text-white text-sm font-medium rounded-lg hover:bg-[#253B65] transition-colors"
                      >
                        Conectar conta
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {accounts.map((account) => {
                        const stats = accountsStats.find(s => s.account_id === account.id);
                        return (
                          <div
                            key={account.id}
                            className="bg-white border border-neutral-200 rounded-lg p-4 hover:border-neutral-300 transition-colors"
                          >
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                                <span className="text-base font-semibold text-neutral-700">
                                  {account.first_name?.charAt(0) || account.nickname?.charAt(0) || 'M'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-neutral-900 truncate text-sm">
                                  {account.first_name} {account.last_name}
                                </h3>
                                <p className="text-xs text-neutral-500 truncate">@{account.nickname}</p>
                              </div>
                            </div>

                            {stats && (
                              <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                                <div className="text-center flex-1">
                                  <div className="text-xs text-neutral-500 mb-1">Total</div>
                                  <div className="text-lg font-semibold text-neutral-900">{stats.total}</div>
                                </div>
                                <div className="text-center flex-1">
                                  <div className="text-xs text-neutral-500 mb-1">Ativos</div>
                                  <div className="text-lg font-semibold text-green-600">{stats.active}</div>
                                </div>
                                <div className="text-center flex-1">
                                  <div className="text-xs text-neutral-500 mb-1">Pausados</div>
                                  <div className="text-lg font-semibold text-neutral-400">{stats.paused}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Grid com Estatísticas Detalhadas e Atividade Recente */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Status dos Anúncios - 2 colunas */}
                  <div className="lg:col-span-2 bg-white rounded-lg border border-neutral-200 p-6">
                    <h3 className="text-base font-semibold text-neutral-900 mb-4">Status dos Anúncios</h3>
                    {totalAnuncios > 0 ? (
                      <div className="space-y-4">
                        {/* Ativos */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              <span className="text-sm text-neutral-700">Ativos</span>
                            </div>
                            <span className="text-sm font-semibold text-neutral-900">{totalAtivos}</span>
                          </div>
                          <div className="w-full bg-neutral-100 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ width: `${totalAnuncios > 0 ? (totalAtivos / totalAnuncios) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Pausados */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-neutral-400"></div>
                              <span className="text-sm text-neutral-700">Pausados</span>
                            </div>
                            <span className="text-sm font-semibold text-neutral-900">{totalInativos}</span>
                          </div>
                          <div className="w-full bg-neutral-100 rounded-full h-2">
                            <div
                              className="bg-neutral-400 h-2 rounded-full transition-all"
                              style={{ width: `${totalAnuncios > 0 ? (totalInativos / totalAnuncios) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Em Revisão */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                              <span className="text-sm text-neutral-700">Em Revisão</span>
                            </div>
                            <span className="text-sm font-semibold text-neutral-900">{totalEmRevisao}</span>
                          </div>
                          <div className="w-full bg-neutral-100 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${totalAnuncios > 0 ? (totalEmRevisao / totalAnuncios) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Resumo */}
                        <div className="pt-4 border-t border-neutral-100">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-neutral-600">Total de anúncios</span>
                            <span className="font-semibold text-neutral-900">{totalAnuncios.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <svg className="w-12 h-12 text-neutral-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p className="text-sm text-neutral-500">Nenhum anúncio sincronizado</p>
                      </div>
                    )}
                  </div>

                  {/* Proteção e Créditos - 1 coluna */}
                  <div className="space-y-4">
                    {/* Card de Proteção */}
                    <div className="bg-gradient-to-br from-[#2F4F7F] to-[#1a2d4d] rounded-lg p-6 text-white">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <h3 className="text-sm font-semibold">Nível de Proteção</h3>
                      </div>
                      <div className="mb-4">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold">{registrosRealizados}</span>
                          <span className="text-sm text-white/80">de {totalAnuncios}</span>
                        </div>
                        <p className="text-xs text-white/70 mt-1">Anúncios protegidos</p>
                      </div>
                      {totalAnuncios > 0 && (
                        <div className="w-full bg-white/20 rounded-full h-2">
                          <div
                            className="bg-white h-2 rounded-full transition-all"
                            style={{ width: `${totalAnuncios > 0 ? (registrosRealizados / totalAnuncios) * 100 : 0}%` }}
                          ></div>
                        </div>
                      )}
                    </div>

                    {/* Card de Ação */}
                    <div className="bg-white rounded-lg border border-neutral-200 p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-neutral-900">Comprar Créditos</p>
                          <p className="text-xs text-neutral-500">Você tem {credits} créditos</p>
                        </div>
                      </div>
                      <button className="w-full px-4 py-2 bg-[#2F4F7F] text-white text-sm font-medium rounded-lg hover:bg-[#253B65] transition-colors">
                        Adicionar créditos
                      </button>
                    </div>
                  </div>
                </div>

                {/* Informações Importantes */}
                {credits < 10 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-yellow-900 mb-1">Créditos baixos</h4>
                        <p className="text-sm text-yellow-800">
                          Você tem apenas {credits} crédito{credits !== 1 ? 's' : ''} disponível{credits !== 1 ? 'is' : ''}. 
                          Considere comprar mais créditos para continuar gerando certificados.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {accounts.length === 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-blue-900 mb-1">Conecte sua conta</h4>
                        <p className="text-sm text-blue-800">
                          Para começar a usar o sistema, conecte sua conta do Mercado Livre e sincronize seus anúncios.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
