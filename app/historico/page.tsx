'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

interface Transaction {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  type: string;
  amount: number;
  creditsQuantity: number;
  paymentMethod: string;
  paymentId: string;
  status: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export default function HistoricoPage() {
  const [usuario, setUsuario] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit_purchase' | 'credit_usage' | 'refund'>('all');

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
    } catch (error) {
      console.error('Erro ao decodificar token:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Carregar transações
  useEffect(() => {
    if (usuario?.id) {
      loadTransactions();
    }
  }, [usuario]);

  const loadTransactions = async () => {
    try {
      setLoadingTransactions(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/transactions', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (response.ok) {
        setTransactions(data.transactions || []);
      } else {
        console.error('Erro ao carregar transações:', data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, { label: string; color: string }> = {
      credit_purchase: { label: 'Compra', color: 'text-green-700 bg-green-50' },
      credit_usage: { label: 'Consumo', color: 'text-red-700 bg-red-50' },
      refund: { label: 'Reembolso', color: 'text-blue-700 bg-blue-50' },
    };
    return types[type] || { label: type, color: 'text-neutral-700 bg-neutral-50' };
  };

  const getStatusLabel = (status: string) => {
    const statuses: Record<string, { label: string; color: string }> = {
      pending: { label: 'Pendente', color: 'text-yellow-700 bg-yellow-50' },
      completed: { label: 'Concluído', color: 'text-green-700 bg-green-50' },
      failed: { label: 'Falhou', color: 'text-red-700 bg-red-50' },
      refunded: { label: 'Reembolsado', color: 'text-blue-700 bg-blue-50' },
    };
    return statuses[status] || { label: status, color: 'text-neutral-700 bg-neutral-50' };
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      PIX: 'PIX',
      CREDIT_CARD: 'Cartão de Crédito',
    };
    return methods[method] || method || '-';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Filtrar transações
  const filteredTransactions = transactions.filter((transaction) => {
    // Filtro de busca
    const matchesSearch =
      transaction.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.paymentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.description?.toLowerCase().includes(searchQuery.toLowerCase());

    // Filtro de status
    const matchesStatus =
      statusFilter === 'all' || transaction.status === statusFilter;

    // Filtro de tipo
    const matchesType =
      typeFilter === 'all' || transaction.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-neutral-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={handleLogout}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-neutral-50">
          {/* Header */}
          <div className="px-6 py-8">
            <div className="flex-1">
              <h1 className="text-4xl font-bold tracking-tight text-neutral-900 mb-3">
                Histórico de Compras
              </h1>
              <p className="text-base text-neutral-600 leading-relaxed max-w-3xl">
                Visualize todas as compras e transações de créditos realizadas por todos os usuários da plataforma.
              </p>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="px-6 pb-6">
            {/* Filtros */}
            {!loadingTransactions && transactions.length > 0 && (
              <div className="mb-6 space-y-4">
                {/* Barra de busca e filtros */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Campo de busca */}
                  <div className="w-full md:w-96">
                    <div className="relative">
                      <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por usuário, email ou ID de pagamento..."
                        className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[#2F4F7F] focus:border-transparent outline-none text-neutral-900"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filtros de tipo e status */}
                  <div className="flex gap-2 flex-wrap">
                    {/* Filtro de tipo */}
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value as any)}
                      className="px-4 py-2.5 rounded-lg font-medium text-sm transition-all bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 outline-none focus:ring-2 focus:ring-[#2F4F7F]"
                    >
                      <option value="all">Todos os tipos</option>
                      <option value="credit_purchase">Compras</option>
                      <option value="credit_usage">Consumos</option>
                      <option value="refund">Reembolsos</option>
                    </select>

                    {/* Filtro de status */}
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="px-4 py-2.5 rounded-lg font-medium text-sm transition-all bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 outline-none focus:ring-2 focus:ring-[#2F4F7F]"
                    >
                      <option value="all">Todos os status</option>
                      <option value="completed">Concluído</option>
                      <option value="pending">Pendente</option>
                      <option value="failed">Falhou</option>
                    </select>
                  </div>
                </div>

                {/* Contador de resultados */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-600">
                    {filteredTransactions.length === transactions.length ? (
                      <>
                        {transactions.length} {transactions.length === 1 ? 'transação' : 'transações'} no total
                      </>
                    ) : (
                      <>
                        Mostrando {filteredTransactions.length} de {transactions.length} {transactions.length === 1 ? 'transação' : 'transações'}
                      </>
                    )}
                  </p>
                  {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                        setTypeFilter('all');
                      }}
                      className="text-sm text-[#2F4F7F] hover:text-[#253B65] font-medium"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              </div>
            )}

            {loadingTransactions ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900"></div>
                <p className="mt-4 text-neutral-600">Carregando transações...</p>
              </div>
            ) : transactions.length === 0 ? (
              // Empty State
              <div className="relative py-20">
                <div className="text-center mb-12">
                  <h3 className="text-2xl font-bold text-neutral-900 tracking-tight mb-3">
                    Nenhuma transação encontrada
                  </h3>
                  <p className="text-neutral-600 leading-relaxed max-w-xl mx-auto">
                    As transações aparecerão aqui quando os usuários realizarem compras
                  </p>
                </div>
              </div>
            ) : filteredTransactions.length === 0 ? (
              // Sem resultados
              <div className="text-center py-20">
                <svg
                  className="mx-auto h-16 w-16 text-neutral-400 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                  Nenhuma transação encontrada
                </h3>
                <p className="text-neutral-600 mb-4">
                  Tente ajustar os filtros ou buscar por outro termo
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setTypeFilter('all');
                  }}
                  className="text-[#2F4F7F] hover:text-[#253B65] font-medium"
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              // Tabela de Transações
              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                          Usuário
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                          Créditos
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                          Valor
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                          Método
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                          Data
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {filteredTransactions.map((transaction) => {
                        const typeInfo = getTypeLabel(transaction.type);
                        const statusInfo = getStatusLabel(transaction.status);

                        return (
                          <tr key={transaction.id} className="hover:bg-neutral-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-neutral-900">
                                  {transaction.userName}
                                </span>
                                <span className="text-xs text-neutral-500">
                                  {transaction.userEmail}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-sm font-semibold ${transaction.creditsQuantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {transaction.creditsQuantity >= 0 ? '+' : ''}
                                {transaction.creditsQuantity}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-neutral-900 font-medium">
                                {formatCurrency(transaction.amount)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-neutral-600">
                                {getPaymentMethodLabel(transaction.paymentMethod)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-neutral-600">
                                {formatDate(transaction.createdAt)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
