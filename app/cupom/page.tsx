'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContainer';

interface Cupom {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  partner_token: string | null;
  repasse_percent: string | number;
  period_uses: string | number;
  period_sales: string | number;
  period_repass: string | number;
}

export default function CupomPage() {
  const [usuario, setUsuario] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [loadingCupons, setLoadingCupons] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Edit & Delete states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCupom, setEditingCupom] = useState<Cupom | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingCupom, setDeletingCupom] = useState<Cupom | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit form states
  const [editFormData, setEditFormData] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: '',
    maxUses: '',
    expiresAt: '',
    repassePercent: '',
  });

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: '',
    maxUses: '',
    expiresAt: '',
    repassePercent: '',
  });

  const router = useRouter();
  const { showToast } = useToast();

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

  // Carregar cupons
  useEffect(() => {
    if (usuario?.id) {
      loadCupons();
    }
  }, [usuario]);

  const loadCupons = async () => {
    try {
      setLoadingCupons(true);
      const token = localStorage.getItem('token');
      
      let queryUrl = '/api/cupons';
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      if (queryParams.toString()) queryUrl += `?${queryParams.toString()}`;

      const response = await fetch(queryUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (response.ok) {
        setCupons(data.cupons || []);
      } else {
        console.error('Erro ao carregar cupons:', data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar cupons:', error);
    } finally {
      setLoadingCupons(false);
    }
  };

  const handleCreateCupom = async () => {
    // Validações
    if (!formData.code.trim()) {
      showToast('Digite um código para o cupom', 'error');
      return;
    }

    if (!formData.discountValue || parseFloat(formData.discountValue) <= 0) {
      showToast('Digite um valor de desconto válido', 'error');
      return;
    }

    if (formData.discountType === 'percentage' && parseFloat(formData.discountValue) > 100) {
      showToast('Percentual não pode ser maior que 100%', 'error');
      return;
    }

    try {
      setIsCreating(true);
      const token = localStorage.getItem('token');

      const response = await fetch('/api/cupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: formData.code.toUpperCase().trim(),
          discount_type: formData.discountType,
          discount_value: parseFloat(formData.discountValue),
          max_uses: formData.maxUses ? parseInt(formData.maxUses) : null,
          expires_at: formData.expiresAt || null,
          repasse_percent: formData.repassePercent ? parseFloat(formData.repassePercent) : 0,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Cupom criado com sucesso', 'success');
        setShowCreateModal(false);
        setFormData({
          code: '',
          discountType: 'percentage',
          discountValue: '',
          maxUses: '',
          expiresAt: '',
          repassePercent: '',
        });
        loadCupons();
      } else {
        showToast(data.error || 'Erro ao criar cupom', 'error');
      }
    } catch (error) {
      console.error('Erro ao criar cupom:', error);
      showToast('Erro ao criar cupom', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleCupomStatus = async (cupomId: number, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/cupons/${cupomId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          is_active: !currentStatus,
        }),
      });

      if (response.ok) {
        showToast(`Cupom ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`, 'success');
        loadCupons();
      } else {
        showToast('Erro ao atualizar cupom', 'error');
      }
    } catch (error) {
      console.error('Erro ao atualizar cupom:', error);
      showToast('Erro ao atualizar cupom', 'error');
    }
  };

  const openEditModal = (cupom: Cupom) => {
    setEditingCupom(cupom);
    setEditFormData({
      code: cupom.code,
      discountType: cupom.discount_type,
      discountValue: String(cupom.discount_value),
      maxUses: cupom.max_uses ? String(cupom.max_uses) : '',
      expiresAt: cupom.expires_at ? cupom.expires_at.split('T')[0] : '',
      repassePercent: cupom.repasse_percent ? String(cupom.repasse_percent) : '',
    });
    setShowEditModal(true);
  };

  const handleEditCupom = async () => {
    if (!editingCupom) return;
    if (!editFormData.code.trim()) {
      showToast('Código do cupom é obrigatório', 'error');
      return;
    }
    if (!editFormData.discountValue || parseFloat(editFormData.discountValue) <= 0) {
      showToast('Valor do desconto deve ser maior que zero', 'error');
      return;
    }
    try {
      setIsSaving(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/cupons/${editingCupom.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: editFormData.code.toUpperCase().trim(),
          discount_type: editFormData.discountType,
          discount_value: parseFloat(editFormData.discountValue),
          max_uses: editFormData.maxUses ? parseInt(editFormData.maxUses) : null,
          expires_at: editFormData.expiresAt || null,
          repasse_percent: editFormData.repassePercent ? parseFloat(editFormData.repassePercent) : 0,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        showToast('Cupom atualizado com sucesso', 'success');
        setShowEditModal(false);
        setEditingCupom(null);
        loadCupons();
      } else {
        showToast(data.error || 'Erro ao atualizar cupom', 'error');
      }
    } catch (error) {
      console.error('Erro ao atualizar cupom:', error);
      showToast('Erro ao atualizar cupom', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCupom = async () => {
    if (!deletingCupom) return;
    try {
      setIsDeleting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/cupons/${deletingCupom.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        showToast(`Cupom ${deletingCupom.code} excluído com sucesso`, 'success');
        setShowDeleteConfirm(false);
        setDeletingCupom(null);
        loadCupons();
      } else {
        const data = await response.json();
        showToast(data.error || 'Erro ao excluir cupom', 'error');
      }
    } catch (error) {
      console.error('Erro ao excluir cupom:', error);
      showToast('Erro ao excluir cupom', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  // Filtrar cupons
  const filteredCupons = cupons.filter((cupom) => {
    // Filtro de busca
    const matchesSearch =
      cupom.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cupom.discount_value.toString().includes(searchQuery);

    // Filtro de status
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && cupom.is_active) ||
      (statusFilter === 'inactive' && !cupom.is_active);

    return matchesSearch && matchesStatus;
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
          <div className="px-6 py-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold tracking-tight text-neutral-900 mb-3">
                Cupons de Desconto
              </h1>
              <p className="text-base text-neutral-600 leading-relaxed max-w-3xl">
                Crie e gerencie cupons de desconto para compra de créditos. Defina valores fixos em reais ou percentuais de desconto.
              </p>
            </div>
            <div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="group px-8 py-3.5 bg-[#2F4F7F] text-white rounded-xl hover:bg-[#253B65] transition-all hover:shadow-xl hover:scale-[1.02] font-semibold flex items-center gap-2.5 w-full lg:w-auto justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Criar Cupom
              </button>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="px-6 pb-6">
            {/* Filtros */}
            {!loadingCupons && cupons.length > 0 && (
              <div className="mb-6 space-y-4">
                {/* Filtros de data */}
                <div className="flex flex-col md:flex-row md:items-end gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Data Início</label>
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2F4F7F] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Data Fim</label>
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2F4F7F] outline-none"
                    />
                  </div>
                  
                  <button
                    onClick={loadCupons}
                    className="px-5 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium text-sm"
                  >
                    Filtrar Período
                  </button>
                  
                  {(startDate || endDate) && (
                    <button
                      onClick={() => { setStartDate(''); setEndDate(''); setTimeout(() => loadCupons(), 100); }}
                      className="px-4 py-2 text-neutral-500 hover:text-neutral-800 transition-colors text-sm font-medium"
                    >
                      Limpar Data
                    </button>
                  )}
                </div>

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
                        placeholder="Buscar por código ou valor..."
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

                  {/* Filtro de status */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                        statusFilter === 'all'
                          ? 'bg-[#2F4F7F] text-white shadow-md'
                          : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setStatusFilter('active')}
                      className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                        statusFilter === 'active'
                          ? 'bg-green-600 text-white shadow-md'
                          : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      Ativos
                    </button>
                    <button
                      onClick={() => setStatusFilter('inactive')}
                      className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                        statusFilter === 'inactive'
                          ? 'bg-neutral-600 text-white shadow-md'
                          : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      Inativos
                    </button>
                  </div>
                </div>

                {/* Contador de resultados */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-600">
                    {filteredCupons.length === cupons.length ? (
                      <>
                        {cupons.length} {cupons.length === 1 ? 'cupom' : 'cupons'} no total
                      </>
                    ) : (
                      <>
                        Mostrando {filteredCupons.length} de {cupons.length} {cupons.length === 1 ? 'cupom' : 'cupons'}
                      </>
                    )}
                  </p>
                  {(searchQuery || statusFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                      }}
                      className="text-sm text-[#2F4F7F] hover:text-[#253B65] font-medium"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              </div>
            )}

            {loadingCupons ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900"></div>
                <p className="mt-4 text-neutral-600">Carregando cupons...</p>
              </div>
            ) : cupons.length === 0 ? (
              // Empty State
              <div className="relative py-20">
                <div className="text-center mb-12">
                  <h3 className="text-2xl font-bold text-neutral-900 tracking-tight mb-3">
                    Nenhum cupom criado ainda
                  </h3>
                  <p className="text-neutral-600 leading-relaxed max-w-xl mx-auto">
                    Clique no botão acima para criar seu primeiro cupom de desconto
                  </p>
                </div>
              </div>
            ) : filteredCupons.length === 0 ? (
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
                  Nenhum cupom encontrado
                </h3>
                <p className="text-neutral-600 mb-4">
                  Tente ajustar os filtros ou buscar por outro termo
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="text-[#2F4F7F] hover:text-[#253B65] font-medium"
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              // Lista de Cupons
              <div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCupons.map((cupom) => (
                    <div
                      key={cupom.id}
                      className="group relative bg-white rounded-xl border border-neutral-200 p-4 hover:border-neutral-300 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-neutral-900 font-mono">
                            {cupom.code}
                          </h3>
                          <p className="text-sm text-neutral-600 mt-1">
                            {cupom.discount_type === 'percentage'
                              ? `${cupom.discount_value}% de desconto`
                              : `R$ ${cupom.discount_value.toFixed(2)} de desconto`
                            }
                          </p>
                        </div>

                        {/* Toggle Status */}
                        <button
                          onClick={() => toggleCupomStatus(cupom.id, cupom.is_active)}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                            cupom.is_active
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                          }`}
                        >
                          {cupom.is_active ? 'Ativo' : 'Inativo'}
                        </button>
                      </div>

                      <div className="space-y-2 text-sm text-neutral-600">
                        <div className="flex justify-between">
                          <span>Usos:</span>
                          <span className="font-medium">
                            {cupom.uses_count}{cupom.max_uses ? ` / ${cupom.max_uses}` : ' / ∞'}
                          </span>
                        </div>

                        {(startDate || endDate) && (
                         <div className="flex justify-between text-[#2F4F7F] bg-[#2F4F7F]/5 px-2 py-1 rounded">
                           <span>Usos no Período:</span>
                           <span className="font-bold">
                             {cupom.period_uses}
                           </span>
                         </div>
                        )}

                        {cupom.expires_at && (
                          <div className="flex justify-between">
                            <span>Expira em:</span>
                            <span className="font-medium">
                              {new Date(cupom.expires_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        )}
                        
                        {Number(cupom.repasse_percent) > 0 && (
                          <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-col gap-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-neutral-500">Repasse ({cupom.repasse_percent}%):</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] uppercase tracking-wider text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">
                                Comissão Gerada
                              </span>
                              <span className="font-bold text-green-700">
                                R$ {Number(cupom.period_repass).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between">
                        <p className="text-xs text-neutral-400">
                          Criado em {new Date(cupom.created_at).toLocaleDateString('pt-BR')}
                        </p>
                        
                        <div className="flex items-center gap-2">
                          {cupom.partner_token && (
                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/parceiro/cupom/${cupom.partner_token}`;
                                navigator.clipboard.writeText(url);
                                showToast('Link do parceiro copiado!', 'success');
                              }}
                              className="text-xs font-medium text-[#2F4F7F] hover:text-[#253B65] flex items-center gap-1 transition-colors"
                              title="Copiar link para parceiro ver métricas"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              Link
                            </button>
                          )}

                          {/* Editar */}
                          <button
                            onClick={() => openEditModal(cupom)}
                            className="text-xs font-medium text-amber-600 hover:text-amber-800 flex items-center gap-1 transition-colors"
                            title="Editar cupom"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar
                          </button>

                          {/* Excluir */}
                          <button
                            onClick={() => { setDeletingCupom(cupom); setShowDeleteConfirm(true); }}
                            className="text-xs font-medium text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
                            title="Excluir cupom"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal de Criar Cupom */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => !isCreating && setShowCreateModal(false)}
        title="Criar Novo Cupom"
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowCreateModal(false)}
              disabled={isCreating}
              className="px-4 py-2 text-sm text-neutral-700 hover:text-neutral-900 transition-colors font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateCupom}
              disabled={isCreating}
              className="px-4 py-2 text-sm bg-[#2F4F7F] text-white rounded-lg hover:bg-[#253B65] transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Criando...
                </>
              ) : (
                'Criar Cupom'
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Código do Cupom */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Código do Cupom
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="Ex: DESCONTO10"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#2F4F7F] focus:border-transparent outline-none font-mono"
              maxLength={20}
            />
          </div>

          {/* Tipo de Desconto */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Tipo de Desconto
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, discountType: 'percentage' })}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  formData.discountType === 'percentage'
                    ? 'border-[#2F4F7F] bg-[#2F4F7F]/5 text-[#2F4F7F] font-semibold'
                    : 'border-neutral-200 text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-lg">%</div>
                  <div className="text-xs mt-1">Percentual</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, discountType: 'fixed' })}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  formData.discountType === 'fixed'
                    ? 'border-[#2F4F7F] bg-[#2F4F7F]/5 text-[#2F4F7F] font-semibold'
                    : 'border-neutral-200 text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-lg">R$</div>
                  <div className="text-xs mt-1">Fixo</div>
                </div>
              </button>
            </div>
          </div>

          {/* Valor do Desconto */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Valor do Desconto
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                {formData.discountType === 'percentage' ? '%' : 'R$'}
              </span>
              <input
                type="number"
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                placeholder={formData.discountType === 'percentage' ? '10' : '50.00'}
                className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#2F4F7F] focus:border-transparent outline-none"
                step={formData.discountType === 'percentage' ? '1' : '0.01'}
                min="0"
                max={formData.discountType === 'percentage' ? '100' : undefined}
              />
            </div>
          </div>

          {/* Repasse (Opcional) */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              % de Repasse/Comissão <span className="text-neutral-400">(opcional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">%</span>
              <input
                type="number"
                value={formData.repassePercent}
                onChange={(e) => setFormData({ ...formData, repassePercent: e.target.value })}
                placeholder="Ex: 5"
                className="w-full pl-10 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#2F4F7F] focus:border-transparent outline-none"
                step="0.01"
                min="0"
                max="100"
              />
            </div>
          </div>

          {/* Máximo de Usos (Opcional) */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Máximo de Usos <span className="text-neutral-400">(opcional)</span>
            </label>
            <input
              type="number"
              value={formData.maxUses}
              onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
              placeholder="Deixe vazio para ilimitado"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#2F4F7F] focus:border-transparent outline-none"
              min="1"
            />
          </div>

          {/* Data de Expiração (Opcional) */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Data de Expiração <span className="text-neutral-400">(opcional)</span>
            </label>
            <input
              type="date"
              value={formData.expiresAt}
              onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#2F4F7F] focus:border-transparent outline-none"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
      </Modal>

      {/* Modal de Editar Cupom */}
      <Modal
        isOpen={showEditModal}
        onClose={() => !isSaving && setShowEditModal(false)}
        title={`Editar Cupom ${editingCupom?.code || ''}`}
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowEditModal(false)}
              disabled={isSaving}
              className="px-4 py-2 text-sm text-neutral-700 hover:text-neutral-900 transition-colors font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleEditCupom}
              disabled={isSaving}
              className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Código */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Código do Cupom</label>
            <input
              type="text"
              value={editFormData.code}
              onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none font-mono"
              maxLength={20}
            />
          </div>

          {/* Tipo de Desconto */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Tipo de Desconto</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEditFormData({ ...editFormData, discountType: 'percentage' })}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  editFormData.discountType === 'percentage'
                    ? 'border-amber-500 bg-amber-50 text-amber-700 font-semibold'
                    : 'border-neutral-200 text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-lg">%</div>
                  <div className="text-xs mt-1">Percentual</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setEditFormData({ ...editFormData, discountType: 'fixed' })}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  editFormData.discountType === 'fixed'
                    ? 'border-amber-500 bg-amber-50 text-amber-700 font-semibold'
                    : 'border-neutral-200 text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-lg">R$</div>
                  <div className="text-xs mt-1">Fixo</div>
                </div>
              </button>
            </div>
          </div>

          {/* Valor */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Valor do Desconto</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                {editFormData.discountType === 'percentage' ? '%' : 'R$'}
              </span>
              <input
                type="number"
                value={editFormData.discountValue}
                onChange={(e) => setEditFormData({ ...editFormData, discountValue: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                step={editFormData.discountType === 'percentage' ? '1' : '0.01'}
                min="0"
                max={editFormData.discountType === 'percentage' ? '100' : undefined}
              />
            </div>
          </div>

          {/* Repasse */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              % de Repasse/Comissão <span className="text-neutral-400">(opcional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">%</span>
              <input
                type="number"
                value={editFormData.repassePercent}
                onChange={(e) => setEditFormData({ ...editFormData, repassePercent: e.target.value })}
                placeholder="Ex: 5"
                className="w-full pl-10 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                step="0.01" min="0" max="100"
              />
            </div>
          </div>

          {/* Máximo de Usos */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Máximo de Usos <span className="text-neutral-400">(opcional)</span>
            </label>
            <input
              type="number"
              value={editFormData.maxUses}
              onChange={(e) => setEditFormData({ ...editFormData, maxUses: e.target.value })}
              placeholder="Deixe vazio para ilimitado"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              min="1"
            />
          </div>

          {/* Data de Expiração */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Data de Expiração <span className="text-neutral-400">(opcional)</span>
            </label>
            <input
              type="date"
              value={editFormData.expiresAt}
              onChange={(e) => setEditFormData({ ...editFormData, expiresAt: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => !isDeleting && setShowDeleteConfirm(false)}
        title="Excluir Cupom"
        maxWidth="sm"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setShowDeleteConfirm(false); setDeletingCupom(null); }}
              disabled={isDeleting}
              className="px-4 py-2 text-sm text-neutral-700 hover:text-neutral-900 transition-colors font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteCupom}
              disabled={isDeleting}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Excluindo...
                </>
              ) : (
                'Sim, Excluir'
              )}
            </button>
          </div>
        }
      >
        <div className="text-center py-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.27 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-neutral-800 font-medium text-lg mb-2">
            Tem certeza que deseja excluir o cupom <span className="font-bold font-mono">{deletingCupom?.code}</span>?
          </p>
          <p className="text-neutral-500 text-sm">
            Essa ação é irreversível e todos os dados de uso deste cupom serão perdidos.
          </p>
        </div>
      </Modal>
    </div>
  );
}
