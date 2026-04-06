'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';

interface Usage {
  used_at: string;
  discount_applied: number;
  sale_amount: number;
  commission: number;
}

interface CupomData {
  cupom: {
    id: number;
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    max_uses: number | null;
    uses_count: number;
    expires_at: string | null;
    is_active: boolean;
    repasse_percent: number;
  };
  stats: {
    total_uses: number;
    total_discount: number;
    total_sales: number;
    total_commission: number;
    recent_usage: Usage[];
  };
}

export default function InternalCupomDashboard({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [usuario, setUsuario] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  
  const [data, setData] = useState<CupomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    // Verificar autenticação
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUsuario(payload);
    } catch (e) {
      router.push('/login');
      return;
    }
  }, [router]);

  useEffect(() => {
    if (id && usuario) {
      fetchData();
    }
  }, [id, usuario]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/cupons/${id}?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();

      if (response.ok) {
        setData(result);
      } else {
        setError(result.error || 'Erro ao carregar dados');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    fetchData();
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    // React batch updates
    setTimeout(() => {
      setLoading(true);
      const token = localStorage.getItem('token');
      fetch(`/api/cupons/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(result => {
         if (result.cupom) setData(result);
         setLoading(false);
      });
    }, 10);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  if (!usuario) {
    return <div className="min-h-screen bg-neutral-50 flex items-center justify-center">Verificando...</div>;
  }

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-neutral-50 p-4 sm:p-6 lg:p-8">
          
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* Header com voltar */}
            <div className="flex items-center gap-4 border-b border-neutral-200 pb-4 mb-6">
               <button onClick={() => router.push('/cupom')} className="p-2 rounded-full hover:bg-neutral-200 text-neutral-600 transition-colors">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                 </svg>
               </button>
               <div>
                 <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
                   Detalhes do Cupom
                 </h1>
                 <p className="text-sm text-neutral-500">Métricas completas de uso e repasses</p>
               </div>
            </div>

            {loading && !data && (
              <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div></div>
            )}

            {error && !data && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-600">
                {error}
              </div>
            )}

            {data && (
              <>
                {/* Coupon Info */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-200 overflow-hidden">
                  <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-2">Código do Cupom</p>
                  <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                    <div className="text-4xl font-mono font-bold text-[#2F4F7F] tracking-wider">
                      {data.cupom.code}
                    </div>
                    <div className="flex flex-wrap gap-2">
                       <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        {data.cupom.discount_type === 'percentage' 
                          ? `${data.cupom.discount_value}% de Desconto` 
                          : `R$ ${data.cupom.discount_value} de Desconto`}
                       </span>
                       <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${data.cupom.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-neutral-100 text-neutral-600 border border-neutral-200'}`}>
                         O status é: {data.cupom.is_active ? 'ATIVO' : 'INATIVO'}
                       </span>
                       {data.cupom.repasse_percent > 0 && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                            {data.cupom.repasse_percent}% de Repasse (Comissão)
                          </span>
                       )}
                    </div>
                  </div>
                </div>

                {/* Filtros */}
                <div className="bg-white rounded-xl p-5 shadow-sm border border-neutral-200">
                    <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider mb-3">Filtrar Período</h3>
                    <div className="flex flex-col sm:flex-row sm:items-end gap-3 z">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-neutral-500 mb-1">Data Início</label>
                        <input 
                          type="date" 
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2F4F7F] outline-none"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-neutral-500 mb-1">Data Fim</label>
                        <input 
                          type="date" 
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2F4F7F] outline-none"
                        />
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={handleFilter}
                          disabled={loading}
                          className="px-4 py-2 bg-[#2F4F7F] text-white rounded-lg flex-1 sm:flex-none hover:bg-[#253B65] transition text-sm font-medium disabled:opacity-50"
                        >
                          Filtrar
                        </button>
                        {(startDate || endDate) && (
                          <button
                            onClick={handleClearFilter}
                            disabled={loading}
                            className="px-4 py-2 text-neutral-500 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition text-sm font-medium"
                          >
                            Limpar
                          </button>
                        )}
                      </div>
                    </div>
                </div>

                {/* Resumo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl p-5 shadow-sm border border-neutral-200">
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Usos Totais no Período</p>
                    <p className="text-2xl font-bold text-neutral-900">{data.stats.total_uses}</p>
                  </div>
                  <div className="bg-white rounded-xl p-5 shadow-sm border border-neutral-200">
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Desconto Gerado (Perda)</p>
                    <p className="text-2xl font-bold text-rose-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.stats.total_discount)}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-5 shadow-sm border border-neutral-200">
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Vendas (Receita Bruta)</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.stats.total_sales)}
                    </p>
                  </div>
                  <div className="bg-indigo-50 rounded-xl p-5 shadow-sm border border-indigo-200">
                    <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">Repasse / Custo Comissão</p>
                    <p className="text-2xl font-bold text-indigo-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.stats.total_commission)}
                    </p>
                  </div>
                </div>

                {/* Tabela de Uso */}
                <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-neutral-200 bg-neutral-50/50">
                    <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider">Histórico de Uso no Período</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                      <thead className="bg-neutral-50 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="px-5 py-3 text-left">Data / Hora</th>
                          <th className="px-5 py-3 text-right">Volume da Venda</th>
                          <th className="px-5 py-3 text-right">Desconto (Cupom)</th>
                          <th className="px-5 py-3 text-right">Repasse Parceiro</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-neutral-200">
                        {data.stats.recent_usage.length > 0 ? (
                          data.stats.recent_usage.map((usage, idx) => (
                            <tr key={idx} className="hover:bg-neutral-50">
                              <td className="px-5 py-3 text-sm text-neutral-600">
                                {new Date(usage.used_at).toLocaleString('pt-BR')}
                              </td>
                              <td className="px-5 py-3 text-sm font-medium text-neutral-900 text-right">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(usage.sale_amount || 0)}
                              </td>
                              <td className="px-5 py-3 text-sm font-medium text-rose-600 text-right">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(usage.discount_applied || 0)}
                              </td>
                              <td className="px-5 py-3 text-sm font-medium text-indigo-600 text-right bg-indigo-50/10">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(usage.commission || 0)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-5 py-10 text-center text-neutral-500">
                              Nenhuma transação registrada nas datas informadas.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
