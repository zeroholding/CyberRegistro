'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import SyncListingsModal from '../components/SyncListingsModal';
import { generateAnuncioPDF } from '../utils/pdfGenerator';

interface Listing {
  id: number;
  mlb_code: string;
  sku?: string | null;
  title: string;
  thumbnail: string;
  price: number;
  available_quantity: number;
  sold_quantity: number;
  status: string;
  permalink: string;
  account_nickname: string;
  account_first_name: string;
  account_last_name: string;
  synced_at: string;
  created_at_ml: string;
}

interface MercadoLivreAccount {
  id: number;
  nickname: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

interface DropdownOption {
  value: string;
  label: string;
  description?: string;
}

interface MinimalCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  className?: string;
  ariaLabel: string;
}

function MinimalCheckbox({ checked, onToggle, className = '', ariaLabel }: MinimalCheckboxProps) {
  return (
    <label
      className={`group relative inline-flex h-5 w-5 cursor-pointer items-center justify-center ${className}`}
      onClick={(event) => event.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        onClick={(event) => event.stopPropagation()}
        className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label={ariaLabel}
      />
      <span className="absolute inset-0 rounded-full border border-neutral-300 bg-white/90 shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-all duration-200 ease-out peer-checked:border-transparent peer-checked:bg-[#2F4F7F]" />
      <span className="absolute inset-0 rounded-full ring-4 ring-neutral-900/12 opacity-0 transition-opacity duration-200 ease-out peer-checked:opacity-100" />
      <svg
        className="relative h-3 w-3 text-white opacity-0 scale-90 transition-all duration-200 ease-out peer-checked:opacity-100 peer-checked:scale-100"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M5 10.5l3.5 3.5L15 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}

interface FilterDropdownProps {
  label: string;
  placeholder: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  className?: string;
}

function FilterDropdown({
  label,
  placeholder,
  value,
  options,
  onChange,
  className = '',
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="w-full rounded-lg border border-neutral-200 bg-white/90 px-3 py-2 text-left text-sm shadow-[0_1px_2px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-colors duration-200 hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center justify-between gap-3">
          <span className="flex flex-col">
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-400">
              {label}
            </span>
            <span className="text-sm font-medium text-neutral-700">
              {selectedOption?.label ?? placeholder}
            </span>
          </span>
          <svg
            className={`h-4 w-4 text-neutral-400 transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      <div
        className={`absolute left-0 right-0 z-40 mt-2 origin-top rounded-xl border border-neutral-200/70 bg-white/95 shadow-[0_18px_32px_rgba(15,23,42,0.12)] transition-all duration-200 ease-out overflow-hidden ${
          open
            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none -translate-y-1 scale-95 opacity-0'
        }`}
      >
        <div className="py-1">
          {options.map((option) => {
            const isActive = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full flex-col items-start px-3.5 py-2.5 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-[#2F4F7F] text-white shadow-[0_8px_20px_rgba(24,24,27,0.22)]'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                }`}
              >
                <span className="text-sm font-medium">{option.label}</span>
                {option.description && (
                  <span className={`mt-0.5 text-xs ${isActive ? 'text-white/80' : 'text-neutral-400'}`}>
                    {option.description}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AnunciosPageContent() {
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const perPage = 21;
  const searchParams = useSearchParams();
  const [latestSyncedAt, setLatestSyncedAt] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<any>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [accounts, setAccounts] = useState<MercadoLivreAccount[]>([]);
  const [selectedListings, setSelectedListings] = useState<number[]>([]);
  const [generatingPDF, setGeneratingPDF] = useState<number | null>(null);
  const router = useRouter();

  const buildQueryString = useCallback(
    (
      nextPage: number,
      nextSearch: string = searchTerm,
      nextStatus: string = statusFilter,
      nextAccount: string = accountFilter
    ) => {
      const params = new URLSearchParams();
      params.set('page', String(nextPage));
      if (nextSearch) params.set('search', nextSearch);
      if (nextStatus) params.set('status', nextStatus);
      if (nextAccount) params.set('accountId', nextAccount);
      return params.toString();
    },
    [searchTerm, statusFilter, accountFilter]
  );

  const updateRoute = useCallback(
    (nextPage: number, nextSearch?: string, nextStatus?: string, nextAccount?: string) => {
      const query = buildQueryString(
        nextPage,
        nextSearch ?? searchTerm,
        nextStatus ?? statusFilter,
        nextAccount ?? accountFilter
      );
      router.replace(`/anuncios?${query}`);
    },
    [router, buildQueryString, searchTerm, statusFilter, accountFilter]
  );

  const loadListingsPage = useCallback(
    async (targetPage: number) => {
      if (!usuario?.id) return;
      try {
        setLoadingListings(true);
        const qs = new URLSearchParams({
          userId: String(usuario.id),
          page: String(targetPage),
          perPage: String(perPage),
        });
        if (searchTerm) qs.set('search', searchTerm);
        if (statusFilter) qs.set('status', statusFilter);
        if (accountFilter) qs.set('accountId', accountFilter);
        const response = await fetch(`/api/mercadolivre/listings?${qs.toString()}`);
        let data: any = null; let fallbackText = ''; try { data = await response.json(); } catch (_) { try { fallbackText = await response.text(); } catch {} }
        if (!response.ok) { throw new Error(`HTTP ${response.status}${fallbackText ? `: ${fallbackText}` : ''}` ); } 
          const fetchedListings: Listing[] = data.listings || [];
          setListings(fetchedListings);
          setTotal(data.total || 0);
          setLatestSyncedAt(data.latestSyncedAt || null);
      } catch (error) {
        console.error('Erro ao carregar anúncios (paginado):', error);
      } finally {
        setLoadingListings(false);
      }
    },
    [usuario?.id, searchTerm, statusFilter, accountFilter, perPage]
  );

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

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

  useEffect(() => {
    if (!usuario?.id) return;

    const p = parseInt(searchParams.get('page') || '1', 10);
    const validPage = Number.isFinite(p) && p > 0 ? p : 1;
    setPage(prev => (prev === validPage ? prev : validPage));

    const nextSearch = searchParams.get('search') || '';
    setSearchTerm(prev => (prev === nextSearch ? prev : nextSearch));
    setSearchInput(prev => (prev === nextSearch ? prev : nextSearch));

    const nextStatus = searchParams.get('status') || '';
    setStatusFilter(prev => (prev === nextStatus ? prev : nextStatus));

    const nextAccount = searchParams.get('accountId') || '';
    setAccountFilter(prev => (prev === nextAccount ? prev : nextAccount));
  }, [usuario?.id, searchParams]);

  // Carregar página atual quando usuário ou página mudarem
  useEffect(() => {
    if (!usuario?.id) return;
    loadListingsPage(page);
  }, [usuario?.id, page, loadListingsPage]);

  useEffect(() => {
    if (!usuario?.id) return;

    const fetchAccounts = async () => {
      try {
        const response = await fetch(`/api/mercadolivre/accounts?userId=${usuario.id}`);
        let data: any = null; let fallbackText = ''; try { data = await response.json(); } catch (_) { try { fallbackText = await response.text(); } catch {} }
        if (!response.ok) { throw new Error(`HTTP ${response.status}${fallbackText ? `: ${fallbackText}` : ''}` ); } 
          setAccounts(data.accounts || []);
      } catch (error) {
        console.error('Erro ao carregar contas do Mercado Livre:', error);
      }
    };

    fetchAccounts();
  }, [usuario?.id]);

  const handleSyncComplete = () => {
    setPage(1);
    updateRoute(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  // Garantir que a página atual seja válida após obter o total
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(total / perPage));
    if (total > 0 && page > maxPage) {
      setPage(maxPage);
      updateRoute(maxPage);
    }
  }, [total, perPage]);
  const changePage = (p: number) => {
    const next = Math.min(Math.max(1, p), totalPages);
    if (next !== page) {
      setPage(next);
      updateRoute(next);
    }
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
    updateRoute(1, undefined, value, accountFilter);
  };

  const handleAccountFilterChange = (value: string) => {
    setAccountFilter(value);
    setPage(1);
    updateRoute(1, undefined, statusFilter, value);
  };

  const clearFilters = () => {
    if (!searchTerm && !statusFilter && !accountFilter) return;
    setSearchInput('');
    setSearchTerm('');
    setStatusFilter('');
    setAccountFilter('');
    setPage(1);
    updateRoute(1, '', '', '');
  };

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!usuario?.id) return;
    const value = searchInput.trim();
    setPage(1);
    setSearchTerm(value);
    updateRoute(1, value, statusFilter, accountFilter);
  };

  const handleGeneratePDF = async (listing: Listing) => {
    if (!usuario?.id) return;

    try {
      setGeneratingPDF(listing.id);

      // Buscar dados completos do anúncio
      const response = await fetch(
        `/api/anuncios/generate-pdf?id=${listing.id}&userId=${usuario.id}`
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar dados do anúncio');
      }

      const pdfData = await response.json();

      // Gerar PDF
      await generateAnuncioPDF(pdfData);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Por favor, tente novamente.');
    } finally {
      setGeneratingPDF(null);
    }
  };

  const statusOptions = useMemo(() => {
    const unique = new Set<string>();
    listings.forEach(listing => {
      if (listing.status) {
        unique.add(listing.status);
      }
    });
    return Array.from(unique).sort();
  }, [listings]);

  const statusLabels: Record<string, string> = useMemo(
    () => ({
      active: 'Ativo',
      paused: 'Pausado',
      closed: 'Inativo',
      under_review: 'Em Revisão',
    }),
    []
  );

  const filtersApplied = useMemo(
    () => Boolean(searchTerm || statusFilter || accountFilter),
    [searchTerm, statusFilter, accountFilter]
  );

  const statusDropdownOptions = useMemo<DropdownOption[]>(() => {
    const base: DropdownOption[] = [
      { value: '', label: 'Todos os status' },
      { value: 'active', label: 'Ativo' },
      { value: 'paused', label: 'Pausado' },
      { value: 'under_review', label: 'Em Revisão' },
      { value: 'closed', label: 'Inativo' },
    ];
    // Append any extra statuses present in the data that are not in base
    const baseValues = new Set(base.map(b => b.value));
    const extras: DropdownOption[] = statusOptions
      .filter((s) => !baseValues.has(s))
      .map((s) => ({ value: s, label: statusLabels[s] ?? s }));
    return [...base, ...extras];
  }, [statusOptions, statusLabels]);

  const accountDropdownOptions = useMemo<DropdownOption[]>(() => [
    { value: '', label: 'Todas as contas' },
    ...accounts.map((account) => ({
      value: String(account.id),
      label: account.nickname || account.email || `Conta #${account.id}`,
      description: account.email || undefined,
    })),
  ], [accounts]);

  const toggleListingSelection = (listingId: number) => {
    setSelectedListings(prev =>
      prev.includes(listingId)
        ? prev.filter(id => id !== listingId)
        : [...prev, listingId]
    );
  };

  const allCurrentPageSelected = useMemo(() => {
    if (listings.length === 0) return false;
    return listings.every(listing => selectedListings.includes(listing.id));
  }, [listings, selectedListings]);

  const toggleSelectAllCurrentPage = () => {
    if (allCurrentPageSelected) {
      setSelectedListings(prev =>
        prev.filter(id => !listings.some(listing => listing.id === id))
      );
      return;
    }

    setSelectedListings(prev => {
      const currentIds = listings.map(listing => listing.id);
      const merged = new Set([...prev, ...currentIds]);
      return Array.from(merged);
    });
  };

  const handleSendToRegistro = async () => {
    if (!usuario?.id) return;
    if (selectedListings.length === 0) return;
    try {
      // Marca no banco que os anúncios foram enviados ao ambiente de registro
      await fetch('/api/registro/mark-sent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: usuario.id, ids: selectedListings })
      });
    } catch (err) {
      console.error('Falha ao marcar envio para registro:', err);
      // segue mesmo assim para o ambiente de registro
    }
    // Redireciona para o ambiente de registro (os anúncios serão carregados do banco)
    router.push('/registro');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

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
        <Topbar onMenuClick={() => setSidebarOpen(true)} onLogout={handleLogout} />

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-neutral-50">
          {/* Header igual ao de Contas Conectadas (estilo e estrutura) */}
          <div className="px-6 py-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold tracking-tight text-neutral-900 mb-3">
                Anúncios
              </h1>
              <p className="text-base text-neutral-600 leading-relaxed max-w-3xl">
                Gerencie e acompanhe seus anúncios integrados ao Mercado Livre com
                uma visão clara e centralizada.
              </p>
            </div>
            <div>
              <button
                onClick={() => setShowSyncModal(true)}
                className="group px-8 py-3.5 bg-[#2F4F7F] text-white rounded-xl hover:bg-[#253B65] transition-all hover:shadow-xl hover:scale-[1.02] font-semibold flex items-center gap-2.5 w-full lg:w-auto justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Sincronizar
              </button>
            </div>
          </div>

          {/* ConteÃºdo da pÃ¡gina */}
          <div className="px-6 pb-8">
            {loadingListings ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900"></div>
                <p className="mt-4 text-neutral-600">Carregando anÃºncios...</p>
              </div>
            ) : total === 0 ? (
              // Empty State
              <div className="relative py-20">
                {/* Elementos decorativos no fundo */}
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.03]">
                  <div className="w-[500px] h-[500px] border-[40px] border-neutral-900 rounded-full"></div>
                </div>

                {/* Grid de demonstração de anúncios */}
                <div className="relative">
                  {/* Texto central */}
                  <div className="text-center mb-12 animate-fade-in-up">
                    <h3 className="text-2xl font-bold text-neutral-900 tracking-tight mb-3">
                      Seus anúncios aparecerão aqui
                    </h3>
                    <p className="text-neutral-600 leading-relaxed max-w-xl mx-auto">
                      Após sincronizar, você verá todos seus anúncios do Mercado Livre organizados em cards como estes:
                    </p>
                  </div>
                  {filtersApplied && (
                    <div className="text-center mt-2">
                      <button
                        onClick={clearFilters}
                        className="px-4 py-2 text-sm bg-[#2F4F7F] text-white rounded-lg hover:bg-[#253B65]"
                      >
                        Limpar filtros
                      </button>
                    </div>
                  )}

                  {/* Cards de demonstração */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <div key={i} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                        <div className="bg-white/40 backdrop-blur-sm border-2 border-dashed border-neutral-300 rounded-xl overflow-hidden hover:border-neutral-400 transition-all duration-300">
                          {/* Imagem fantasma */}
                          <div className="aspect-square bg-neutral-200 animate-pulse"></div>

                          {/* Conteúdo fantasma */}
                          <div className="p-3 space-y-2">
                            <div className="h-2 bg-neutral-200 rounded w-16 animate-pulse"></div>
                            <div className="h-3 bg-neutral-200 rounded w-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                            <div className="h-3 bg-neutral-200 rounded w-4/5 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                            <div className="h-2 bg-neutral-200 rounded w-12 animate-pulse mt-2" style={{ animationDelay: '0.4s' }}></div>
                          </div>

                          {/* Footer fantasma */}
                          <div className="px-3 pb-3 pt-2 border-t border-neutral-200">
                            <div className="h-2 bg-neutral-200 rounded w-3/4 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Indicador visual */}
                  <div className="mt-12 flex items-center justify-center gap-2 animate-fade-in" style={{ animationDelay: '0.7s' }}>
                    <div className="w-2 h-2 rounded-full bg-neutral-300 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-neutral-300 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-neutral-300 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-6 flex flex-col gap-4">
                  <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
                    <h2 className="text-lg font-semibold text-neutral-900">
                      {total} {total === 1 ? 'anuncio' : 'anuncios'}
                    </h2>
                    <div className="text-sm text-neutral-500">
                      Ultima sincronizacao: {latestSyncedAt ? new Date(latestSyncedAt).toLocaleString('pt-BR') : (listings[0]?.synced_at ? new Date(listings[0].synced_at).toLocaleString('pt-BR') : '-')}
                    </div>
                  </div>

                  <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                    <form onSubmit={handleSearchSubmit} className="w-full xl:max-w-md">
                      <label className="relative block">
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-400">
                          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12.5 11.5l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="9" cy="9" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                        </span>
                        <input
                          type="search"
                          value={searchInput}
                          onChange={(event) => handleSearchChange(event.target.value)}
                          placeholder="Buscar por título, código MLB ou SKU"
                          className="w-full rounded-lg border border-neutral-200 bg-white/80 py-2.5 pl-9 pr-3 text-sm text-neutral-700 shadow-[inset_0_1px_2px_rgba(15,23,42,0.05)] placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                        />
                      </label>
                    </form>
                    <div className="flex flex-col sm:flex-row sm:items-stretch gap-3 w-full xl:w-auto">
                      <FilterDropdown
                        label="Status"
                        placeholder="Todos os status"
                        value={statusFilter}
                        options={statusDropdownOptions}
                        onChange={handleStatusFilterChange}
                        className="flex-1 sm:flex-none sm:w-44"
                      />
                      <FilterDropdown
                        label="Conta"
                        placeholder="Todas as contas"
                        value={accountFilter}
                        options={accountDropdownOptions}
                        onChange={handleAccountFilterChange}
                        className="flex-1 sm:flex-none sm:w-48"
                      />
                      <button
                        type="button"
                        onClick={clearFilters}
                        disabled={!filtersApplied}
                        className="rounded-xl border border-neutral-200 bg-white/85 px-4 py-3 text-sm font-medium text-neutral-600 shadow-sm transition-colors duration-150 hover:border-neutral-300 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Limpar filtros
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-dashed border-neutral-200 bg-white/80 px-4 py-3">
                    <div className="flex items-center gap-3 text-sm text-neutral-600">
                      <MinimalCheckbox
                        checked={allCurrentPageSelected}
                        onToggle={toggleSelectAllCurrentPage}
                        ariaLabel="Selecionar todos os anuncios desta pagina"
                      />
                      <span className="font-medium text-neutral-700">
                        {selectedListings.length} selecionado{selectedListings.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSendToRegistro}
                        disabled={selectedListings.length === 0}
                        className="rounded-xl bg-[#2F4F7F] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#253B65] disabled:cursor-not-allowed disabled:bg-neutral-300"
                      >
                        Enviar para Ambiente de Registro
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2.5 md:gap-3">


                  {listings.map((listing) => {
                    const isSelected = selectedListings.includes(listing.id);
                    const cardClasses = `group relative rounded-2xl border bg-white transition-all duration-300 transform ${
                      isSelected
                        ? 'border-neutral-900 shadow-[0_16px_36px_rgba(15,23,42,0.14)] -translate-y-[2px]'
                        : 'border-neutral-200 hover:border-neutral-300 hover:shadow-lg hover:-translate-y-[1px]'
                    }`;
                    return (
                      <div
                        key={listing.id}
                        className={cardClasses}
                      >
                        <MinimalCheckbox
                          checked={isSelected}
                          onToggle={() => toggleListingSelection(listing.id)}
                          ariaLabel={`Selecionar anuncio ${listing.mlb_code || listing.title}`}
                          className="absolute top-3 left-3 z-20"
                        />
                        <a
                          href={listing.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          {/* Thumbnail */}
                          <div className="relative aspect-square bg-neutral-100">
                            {listing.thumbnail ? (
                              <img
                                src={listing.thumbnail}
                                alt={listing.title}
                                className="w-full h-full object-contain group-hover:scale-[1.01] transition-transform duration-200"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-16 h-16 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}

                            {/* Status Badge */}
                            <div className="absolute top-2 right-2">
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                            listing.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : listing.status === 'paused'
                              ? 'bg-yellow-100 text-yellow-700'
                              : listing.status === 'under_review'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {listing.status === 'active' ? 'Ativo' :
                             listing.status === 'paused' ? 'Pausado' :
                             listing.status === 'under_review' ? 'Em Revisão' :
                             'Inativo'}
                              </span>
                            </div>
                          </div>

                          {/* Conteudo */}
                          <div className="p-3">
                            {/* Codigo MLB */}
                            <div className="text-xs font-mono text-neutral-500 mb-2">
                              {listing.mlb_code}
                            </div>

                            {/* Titulo */}
                            <h3 className="text-[11px] font-semibold text-neutral-900 mb-1.5 line-clamp-2 group-hover:text-yellow-600 transition-colors">
                              {listing.title}
                            </h3>

                            {/* Preco */}
                            {/* Informacoes adicionais */}
                            <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-2.5">
                              <span>Vendidos: {listing.sold_quantity}</span>
                            </div>

                            {/* Conta */}
                            <div className="pt-3 border-t border-neutral-100">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-yellow-400/20 rounded-md flex items-center justify-center text-neutral-900 font-semibold text-xs">
                                  {listing.account_first_name?.charAt(0) || listing.account_nickname?.charAt(0) || 'M'}
                                </div>
                                <span className="text-[11px] text-neutral-600 truncate">
                                  @{listing.account_nickname}
                                </span>
                              </div>
                            </div>

                            {/* Data */}
                            <div className="mt-1.5 text-[11px] text-neutral-400">
                              Criado em {new Date(listing.created_at_ml).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                        </a>
                        <div className="flex items-center justify-between px-3 pb-3 pt-2">
                          <button
                            type="button"
                            onClick={() => handleGeneratePDF(listing)}
                            disabled={generatingPDF === listing.id}
                            className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {generatingPDF === listing.id ? (
                              <>
                                <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Gerando...
                              </>
                            ) : (
                              'Gerar PDF'
                            )}
                          </button>
                          <a
                            href={listing.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-neutral-500 transition hover:text-neutral-900"
                          >
                            Ver anuncio
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Paginação */}
                <div className="mt-6 flex items-center justify-center gap-1">
                  <button
                    onClick={() => changePage(page - 1)}
                    disabled={page <= 1}
                    className="px-3 py-2 text-sm rounded-md border border-neutral-200 bg-white text-neutral-900 disabled:opacity-100 disabled:text-neutral-900 disabled:hover:bg-white"
                  >
                    Anterior
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    const base = Math.max(1, Math.min(page - 2, totalPages - 4));
                    const num = base + i;
                    return (
                      <button
                        key={num}
                        onClick={() => changePage(num)}
                        className={`px-3 py-2 text-sm rounded-md border ${
                          num === page
                            ? 'bg-[#2F4F7F] text-white border-[#2F4F7F]'
                            : 'bg-white text-neutral-900 border-neutral-200 hover:bg-neutral-50'
                        }`}
                      >
                        {num}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => changePage(page + 1)}
                    disabled={page >= totalPages}
                    className="px-3 py-2 text-sm rounded-md border border-neutral-200 bg-white text-neutral-900 disabled:opacity-100 disabled:text-neutral-900 disabled:hover:bg-white"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal de SincronizaÃ§Ã£o */}
      {usuario && (
        <SyncListingsModal
          isOpen={showSyncModal}
          onClose={() => setShowSyncModal(false)}
          userId={usuario.id}
          onSyncComplete={handleSyncComplete}
        />
      )}
    </div>
  );
}

export default function AnunciosPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <AnunciosPageContent />
    </Suspense>
  );
}
