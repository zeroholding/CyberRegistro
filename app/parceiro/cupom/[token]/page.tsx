'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';

interface Usage {
  used_at: string;
  discount_applied: number;
  sale_amount: number;
  commission: number;
}

interface CupomData {
  cupom: {
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

export default function PartnerCouponPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<CupomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      
      const response = await fetch(`/api/parceiro/cupom/${token}?${queryParams.toString()}`);
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
    // React state is async, we can just call fetch without state dependencies or pass them explicitly.
    setTimeout(() => {
      // the fetchData inside here will see the old state if not careful, 
      // but it's simpler to just do window.location.reload or fetch with empty params.
      // Easiest is to reload the window or manually fetch without query params.
      setLoading(true);
      fetch(`/api/parceiro/cupom/${token}`)
        .then(res => res.json())
        .then(result => {
           if (result.cupom) setData(result);
           setLoading(false);
        });
    }, 10);
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-neutral-600">Carregando dados...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-4">
        <div className="text-red-500 font-medium mb-2">{error}</div>
        <p className="text-neutral-600">Verifique se o link está correto.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/logo.png"
              alt="Cyber Registro"
              width={180}
              height={180}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
            Painel do Parceiro
          </h1>
          <p className="mt-2 text-neutral-600">
            Acompanhe o desempenho do seu cupom de desconto
          </p>
        </div>

        {/* Coupon Card */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-neutral-200 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-2">Seu Código</p>
          <div className="text-5xl font-mono font-bold text-[#2F4F7F] tracking-wider mb-4">
            {data.cupom.code}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              {data.cupom.discount_type === 'percentage' 
                ? `${data.cupom.discount_value}% de Desconto` 
                : `R$ ${data.cupom.discount_value} de Desconto`}
            </div>
            {data.cupom.repasse_percent > 0 && (
               <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                 {data.cupom.repasse_percent}% de Comissão (Repasse)
               </div>
            )}
          </div>
        </div>

        {/* Filtros de Data */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200">
            <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider mb-4">Filtrar Período</h3>
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Data Início</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2F4F7F] outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Data Fim</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2F4F7F] outline-none"
                />
              </div>
              
              <div className="flex items-center gap-2 mt-4 sm:mt-0">
                <button
                  onClick={handleFilter}
                  disabled={loading}
                  className="px-5 py-2 bg-[#2F4F7F] text-white rounded-lg hover:bg-[#253B65] transition-colors font-medium text-sm flex-1 sm:flex-none disabled:opacity-50"
                >
                  {loading ? 'Carregando...' : 'Filtrar'}
                </button>
                
                {(startDate || endDate) && (
                  <button
                    onClick={handleClearFilter}
                    disabled={loading}
                    className="px-4 py-2 text-neutral-500 hover:text-neutral-800 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-neutral-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Usos do Cupom</p>
                <p className="mt-2 text-2xl font-bold text-neutral-900">
                  {data.stats.total_uses}
                </p>
              </div>
              <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-neutral-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Desconto Aplicado</p>
                <p className="mt-2 text-2xl font-bold text-neutral-900">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.stats.total_discount)}
                </p>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-lg text-amber-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-neutral-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Vendas Geradas</p>
                <p className="mt-2 text-2xl font-bold text-neutral-900">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.stats.total_sales)}
                </p>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-emerald-500 ring-1 ring-emerald-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -z-10"></div>
            <div className="flex items-start justify-between z-10 relative">
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Comissão Total</p>
                <p className="mt-2 text-2xl font-bold text-emerald-700">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.stats.total_commission)}
                </p>
              </div>
              <div className="p-2.5 bg-emerald-100/80 rounded-lg text-emerald-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Usage History */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200">
            <h3 className="text-lg font-bold text-neutral-900">Histórico de Uso e Comissões</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left">
                    Data / Hora
                  </th>
                  <th scope="col" className="px-6 py-3 text-right">
                    Valor Venda
                  </th>
                  <th scope="col" className="px-6 py-3 text-right">
                    Desconto
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-emerald-700">
                    Sua Comissão
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {data.stats.recent_usage.length > 0 ? (
                  data.stats.recent_usage.map((usage, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                        {new Date(usage.used_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 text-right">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(usage.sale_amount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-amber-600 text-right">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(usage.discount_applied || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600 text-right">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(usage.commission || 0)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-neutral-500">
                      Nenhum uso registrado neste período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
