'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import Lottie from 'lottie-react';
import { useToast } from '../components/ToastContainer';
import { generateRegistroCertificatePDF, RegistroCertificateInput } from '../utils/registroCertificate';

interface PdfApiData {
  title: string;
  mlbCode: string;
  permalink: string;
  thumbnail?: string | null;
  platform?: 'mercadolivre' | 'shopee';
  accountKey?: string; // 'ml:3' | 'shopee:5' — usado no filtro de contas
  accountLabel?: string; // nome amigável da conta/loja
  account?: {
    nickname?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
  // Controle do registro
  registroEnviado?: boolean;
  registroEnviadoEm?: string | null;
  registroStatus?: string | null;
  registroGeradoEm?: string | null;
  registroHash?: string | null;
}

function RegistroPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [usuario, setUsuario] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [items, setItems] = useState<Record<number, PdfApiData>>({});
  const [order, setOrder] = useState<number[]>([]);
  const [generating, setGenerating] = useState<number | null>(null);

  // Filtros (busca por mlb/cód shopee/título, conta e certificado gerado ou não)
  const [searchTerm, setSearchTerm] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [certFilter, setCertFilter] = useState<'' | 'gerado' | 'nao'>('');

  // Formulário: Autor/Titular e CPF/CNPJ
  const [autorNome, setAutorNome] = useState<string>('');
  const [titularNome, setTitularNome] = useState<string>('');
  const [autorCpfCnpj, setAutorCpfCnpj] = useState<string>('');
  const [titularCpfCnpj, setTitularCpfCnpj] = useState<string>('');
  // CPF/CNPJ do usuário (persistido) para auto-preencher quando "próprio"
  const [cpfInput, setCpfInput] = useState<string>('');

  // Controle de tipo de autor/titular
  const [autorTipo, setAutorTipo] = useState<'proprio' | 'terceiro'>('proprio');
  const [titularTipo, setTitularTipo] = useState<'proprio' | 'terceiro'>('proprio');

  // Modal de geração individual
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [itemToGenerate, setItemToGenerate] = useState<number | null>(null);

  // Modal de preview/validação
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<{
    item: PdfApiData;
    autorNome: string;
    titularNome: string;
    autorCpfCnpj: string;
    titularCpfCnpj: string;
  } | null>(null);

  // Animação da moeda
  const [coinAnimation, setCoinAnimation] = useState<any>(null);

  // Parse ids da URL
  const ids = useMemo(() => {
    const raw = params.get('ids') || '';
    return raw
      .split(',')
      .map((v) => parseInt(v.trim(), 10))
      .filter((n) => Number.isFinite(n));
  }, [params]);

  useEffect(() => {
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
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Carregar animação da moeda
  useEffect(() => {
    fetch('/Coin.json')
      .then((response) => response.json())
      .then((data) => setCoinAnimation(data))
      .catch((error) => console.error('Erro ao carregar animação:', error));
  }, []);

  // Carrega CPF/CNPJ previamente salvo (ex. fluxo de créditos)
  useEffect(() => {
    const raw = localStorage.getItem('customerCpfCnpj');
    if (raw) setCpfInput(raw);
  }, []);

  // Atualiza campo de autor quando o tipo muda
  useEffect(() => {
    if (autorTipo === 'proprio') {
      setAutorNome(usuario?.nome || '');
      setAutorCpfCnpj(cpfInput || '');
    } else {
      setAutorNome('');
      setAutorCpfCnpj('');
    }
  }, [autorTipo, usuario?.nome, cpfInput]);

  // Atualiza campo de titular quando o tipo muda
  useEffect(() => {
    if (titularTipo === 'proprio') {
      setTitularNome(usuario?.nome || '');
      setTitularCpfCnpj(cpfInput || '');
    } else {
      setTitularNome('');
      setTitularCpfCnpj('');
    }
  }, [titularTipo, usuario?.nome, cpfInput]);

  // Helpers de validação CPF/CNPJ
  const normalizeDigits = (value: string) => value.replace(/\D/g, '');
  const isRepeatedSequence = (digits: string) => /^([0-9])\1+$/.test(digits);
  const isValidCpf = (digits: string) => {
    if (digits.length !== 11 || isRepeatedSequence(digits)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i += 1) sum += Number(digits[i]) * (10 - i);
    let check = 11 - (sum % 11);
    check = check >= 10 ? 0 : check;
    if (check !== Number(digits[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i += 1) sum += Number(digits[i]) * (11 - i);
    check = 11 - (sum % 11);
    check = check >= 10 ? 0 : check;
    return check === Number(digits[10]);
  };
  const isValidCnpj = (digits: string) => {
    if (digits.length !== 14 || isRepeatedSequence(digits)) return false;
    const multipliers1 = [5,4,3,2,9,8,7,6,5,4,3,2];
    const multipliers2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
    const calc = (m: number[]) => {
      const sum = m.reduce((acc, mult, idx) => acc + Number(digits[idx]) * mult, 0);
      const r = sum % 11; return r < 2 ? 0 : 11 - r;
    };
    const d1 = calc(multipliers1); if (d1 !== Number(digits[12])) return false;
    const d2 = calc(multipliers2); return d2 === Number(digits[13]);
  };

  useEffect(() => {
    const load = async () => {
      if (!usuario?.id) return;
      setLoadingData(true);
      try {
        const next: Record<number, PdfApiData> = {};
        let finalIds: number[] = [];

        // Se há IDs na URL, carrega esses anúncios
        if (ids.length > 0) {
          for (const id of ids) {
            const res = await fetch(`/api/anuncios/generate-pdf?id=${id}&userId=${usuario.id}`);
            if (res.ok) {
              const data = await res.json();
              const plat = (data.platform === 'shopee' ? 'shopee' : 'mercadolivre') as 'mercadolivre' | 'shopee';
              const accLabel = data.account?.nickname || (plat === 'shopee' ? 'Loja Shopee' : 'Conta ML');
              next[id] = {
                title: data.title,
                mlbCode: data.mlbCode,
                permalink: data.permalink,
                thumbnail: data.thumbnail,
                platform: plat,
                accountLabel: accLabel,
                accountKey: `${plat}:${accLabel}`,
                account: data.account,
                registroEnviado: data.registroEnviado,
                registroEnviadoEm: data.registroEnviadoEm,
                registroStatus: data.registroStatus,
                registroGeradoEm: data.registroGeradoEm,
                registroHash: data.registroHash,
              } as PdfApiData;
            }
          }
          finalIds = ids;
        } else {
          // Se não há IDs na URL, busca anúncios salvos no banco
          const res = await fetch(`/api/registro/sent?userId=${usuario.id}`);
          if (res.ok) {
            const data = await res.json();
            const anuncios = data.anuncios || [];
            for (const anuncio of anuncios) {
              const plat = (anuncio.platform === 'shopee' ? 'shopee' : 'mercadolivre') as 'mercadolivre' | 'shopee';
              const accLabel = plat === 'shopee'
                ? (anuncio.shopee_shop_name || 'Loja Shopee')
                : (anuncio.account_nickname || 'Conta ML');
              const accKey = plat === 'shopee'
                ? `shopee:${anuncio.shopee_account_id}`
                : `ml:${anuncio.ml_account_id}`;
              next[anuncio.id] = {
                title: anuncio.title,
                mlbCode: anuncio.mlb_code,
                permalink: anuncio.permalink,
                thumbnail: anuncio.thumbnail,
                platform: plat,
                accountLabel: accLabel,
                accountKey: accKey,
                account: {
                  nickname: accLabel,
                  firstName: anuncio.account_first_name,
                  lastName: anuncio.account_last_name,
                },
                registroEnviado: anuncio.registro_enviado,
                registroEnviadoEm: anuncio.registro_enviado_em,
                registroStatus: anuncio.registro_status,
                registroGeradoEm: anuncio.registro_gerado_em,
                registroHash: anuncio.registro_hash,
              } as PdfApiData;
              finalIds.push(anuncio.id);
            }
          }
        }

        setItems(next);
        setOrder(finalIds);
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [usuario?.id, ids]);

  const handleOpenGenerateModal = (id: number) => {
    setItemToGenerate(id);
    setShowGenerateModal(true);
  };

  const handleOpenPreview = () => {
    // Validações
    if (!autorNome.trim() || !titularNome.trim()) {
      showToast('Informe Autor da Obra e Titular dos Direitos.', 'error');
      return;
    }

    // Deriva CPF/CNPJ final de autor e titular conforme seleção
    const autorCpfFinal = autorTipo === 'proprio' ? normalizeDigits(cpfInput) : normalizeDigits(autorCpfCnpj);
    const titularCpfFinal = titularTipo === 'proprio' ? normalizeDigits(cpfInput) : normalizeDigits(titularCpfCnpj);

    // Validar obrigatoriedade e formato
    const validateCpfCnpj = (value: string) => {
      if (!(value.length === 11 || value.length === 14)) return false;
      if (value.length === 11) return isValidCpf(value);
      return isValidCnpj(value);
    };

    if (!autorCpfFinal) {
      showToast('Informe o CPF/CNPJ do autor (ou salve o do usuário).', 'error');
      return;
    }
    if (!titularCpfFinal) {
      showToast('Informe o CPF/CNPJ do titular (ou salve o do usuário).', 'error');
      return;
    }

    if (!validateCpfCnpj(autorCpfFinal)) {
      showToast('CPF/CNPJ do autor inválido.', 'error');
      return;
    }
    if (!validateCpfCnpj(titularCpfFinal)) {
      showToast('CPF/CNPJ do titular inválido.', 'error');
      return;
    }

    if (!itemToGenerate || !items[itemToGenerate]) return;

    // Preparar dados para preview
    setPreviewData({
      item: items[itemToGenerate],
      autorNome: autorNome.trim(),
      titularNome: titularNome.trim(),
      autorCpfCnpj: autorCpfFinal,
      titularCpfCnpj: titularCpfFinal,
    });

    // Fechar modal de formulário e abrir preview
    setShowGenerateModal(false);
    setShowPreviewModal(true);
  };

  const handleBackToEdit = () => {
    setShowPreviewModal(false);
    setShowGenerateModal(true);
  };

  const gerar = async (id: number): Promise<string | void> => {
    const item = items[id];
    if (!item || !usuario) return;

    // validações simples
    if (!autorNome.trim() || !titularNome.trim()) {
      showToast('Informe Autor da Obra e Titular dos Direitos.', 'error');
      return;
    }

    setGenerating(id);
    try {
      // 1. Verificar créditos disponíveis
      console.log('🔍 Verificando créditos do usuário...');
      const creditsResponse = await fetch('/api/credits/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: usuario.id, amount: 1 })
      });

      if (!creditsResponse.ok) {
        const data = await creditsResponse.json();
        console.error('❌ Créditos insuficientes:', data);
        showToast(data.error || 'Créditos insuficientes para gerar o certificado', 'error');
        setGenerating(null);
        return;
      }
      console.log('✅ Créditos verificados com sucesso');

      // 2. Gerar o certificado PDF
      console.log('📄 Gerando certificado PDF...');
      const autorCpfFinal = autorTipo === 'proprio' ? normalizeDigits(cpfInput) : normalizeDigits(autorCpfCnpj);
      const titularCpfFinal = titularTipo === 'proprio' ? normalizeDigits(cpfInput) : normalizeDigits(titularCpfCnpj);

      const input: RegistroCertificateInput = {
        title: item.title,
        mlbCode: item.mlbCode,
        permalink: item.permalink,
        account: item.account,
        usuario: {
          nome: usuario.nome,
          cpfCnpj: normalizeDigits(cpfInput),
          email: usuario.email,
        },
        autorNome: autorNome.trim(),
        titularNome: titularNome.trim(),
        autorCpfCnpj: autorCpfFinal,
        titularCpfCnpj: titularCpfFinal,
      };
      const certHash = await generateRegistroCertificatePDF(input);
      console.log('✅ Certificado gerado com sucesso:', certHash);

      // 3. Debitar 1 crédito após gerar com sucesso
      console.log('💰 Debitando 1 crédito...');
      const debitResponse = await fetch('/api/credits/debit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: usuario.id,
          amount: 1,
          description: `Certificado de Registro - ${item.mlbCode}`
        })
      });

      if (!debitResponse.ok) {
        const debitError = await debitResponse.json();
        console.error('❌ Erro ao debitar crédito:', debitError);
        showToast('Certificado gerado, mas houve erro ao debitar o crédito. Contate o suporte.', 'error');
      } else {
        const debitData = await debitResponse.json();
        console.log('✅ Crédito debitado com sucesso:', debitData);
        showToast(`Certificado gerado com sucesso! Créditos restantes: ${debitData.newBalance}`, 'success');
      }

      // 4. Persistir como protegido no banco
      try {
        console.log('💾 Marcando anúncio como protegido...');
        await fetch('/api/registro/mark-protected', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: usuario.id, id, hash: certHash })
        });
        console.log('✅ Anúncio marcado como protegido');

        // Atualiza estado local para refletir "protegido"
        setItems(prev => ({
          ...prev,
          [id]: { ...prev[id], registroStatus: 'protegido', registroGeradoEm: new Date().toISOString(), registroHash: certHash || prev[id]?.registroHash }
        }));

        // Fechar modais após sucesso
        setShowPreviewModal(false);
        setShowGenerateModal(false);
        setItemToGenerate(null);
      } catch (e) {
        console.error('❌ Falha ao marcar protegido no banco:', e);
      }
    } catch (error) {
      console.error('💥 Erro geral ao gerar certificado:', error);
      showToast('Erro ao gerar certificado. Verifique o console para mais detalhes.', 'error');
    } finally {
      setGenerating(null);
    }
  };

  

  const removeFromRegistro = async (id: number) => {
    if (!usuario?.id) return;
    try {
      // Remove do banco
      await fetch('/api/registro/mark-sent', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: usuario.id, ids: [id] })
      });
      // Remove do estado local
      setItems(prev => {
        const { [id]: removed, ...rest } = prev;
        return rest;
      });
      setOrder(prev => prev.filter(itemId => itemId !== id));
    } catch (err) {
      console.error('Falha ao remover do registro:', err);
      showToast('Erro ao remover anúncio do ambiente de registro', 'error');
    }
  };

  const isCertGerado = (it: PdfApiData) => it.registroStatus === 'protegido' || !!it.registroGeradoEm;

  // Opções do filtro de contas, derivadas dos anúncios carregados
  const accountOptions = useMemo(() => {
    const map = new Map<string, { key: string; label: string; platform: string }>();
    for (const id of order) {
      const it = items[id];
      if (!it || !it.accountKey) continue;
      if (!map.has(it.accountKey)) {
        map.set(it.accountKey, {
          key: it.accountKey,
          label: it.accountLabel || it.accountKey,
          platform: it.platform || 'mercadolivre',
        });
      }
    }
    return Array.from(map.values());
  }, [order, items]);

  // Aplica busca (mlb/cód shopee/título) + filtro de conta + filtro de certificado
  const filteredOrder = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return order.filter((id) => {
      const it = items[id];
      if (!it) return false;
      if (accountFilter && it.accountKey !== accountFilter) return false;
      if (certFilter === 'gerado' && !isCertGerado(it)) return false;
      if (certFilter === 'nao' && isCertGerado(it)) return false;
      if (term) {
        const hay = `${it.mlbCode || ''} ${it.title || ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [order, items, searchTerm, accountFilter, certFilter]);

  const filtersApplied = Boolean(searchTerm || accountFilter || certFilter);
  const clearFilters = () => {
    setSearchTerm('');
    setAccountFilter('');
    setCertFilter('');
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
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} onLogout={() => { localStorage.removeItem('token'); router.push('/login'); }} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-neutral-50">
          {/* Header */}
          <div className="px-6 py-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold tracking-tight text-neutral-900 mb-3">Ambiente de Registro</h1>
              <p className="text-base text-neutral-600 leading-relaxed max-w-3xl">
                {order.length === 0
                  ? 'Selecione anúncios na página de Anúncios e envie para este ambiente. Eles ficarão salvos aqui para você gerar certificados quando quiser.'
                  : 'Clique em "Gerar Certificado" em cada card para preencher os dados e gerar o certificado em PDF.'}
              </p>
            </div>
            {/* Botão "Gerar certificados de todos" removido conforme solicitação */}
          </div>

          {/* Conteúdo */}
          <div className="px-6 pb-6">
            {order.length === 0 && !loadingData ? (
              // Empty State
              <div className="relative py-20">
                {/* Elementos decorativos no fundo */}
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.03]">
                  <div className="w-[500px] h-[500px] border-[40px] border-neutral-900 rounded-full"></div>
                </div>

                {/* Grid de demonstração */}
                <div className="relative">
                  {/* Texto central */}
                  <div className="text-center mb-12 animate-fade-in-up">
                    <h3 className="text-2xl font-bold text-neutral-900 tracking-tight mb-3">
                      Seus certificados aparecerão aqui
                    </h3>
                    <p className="text-neutral-600 leading-relaxed max-w-xl mx-auto">
                      Após selecionar anúncios e enviá-los para este ambiente, você verá todos organizados em cards como estes:
                    </p>
                  </div>

                  {/* Cards de demonstração */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                        <div className="bg-white/40 backdrop-blur-sm border-2 border-dashed border-neutral-300 rounded-xl p-4 hover:border-neutral-400 transition-all duration-300">
                          <div className="space-y-2">
                            {/* MLB Code fantasma */}
                            <div className="h-3 bg-neutral-200 rounded w-24 animate-pulse"></div>

                            {/* Título fantasma */}
                            <div className="h-4 bg-neutral-200 rounded w-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                            <div className="h-4 bg-neutral-200 rounded w-3/4 animate-pulse" style={{ animationDelay: '0.2s' }}></div>

                            {/* Badge fantasma */}
                            <div className="h-5 bg-neutral-200 rounded w-20 animate-pulse" style={{ animationDelay: '0.3s' }}></div>

                            {/* Footer com botão fantasma */}
                            <div className="pt-2 flex items-center justify-between">
                              <div className="h-3 bg-neutral-200 rounded w-16 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                              <div className="h-7 bg-neutral-200 rounded w-28 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Indicador visual */}
                  <div className="mt-12 flex items-center justify-center gap-2 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                    <div className="w-2 h-2 rounded-full bg-neutral-300 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-neutral-300 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-neutral-300 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            ) : loadingData ? (
              <div className="rounded-xl border border-neutral-200 bg-white p-6 text-neutral-700">Carregando dados…</div>
            ) : (
              <>
              {/* Barra de filtros: busca + conta + certificado */}
              <div className="mb-4 flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="relative flex-1 lg:max-w-md">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-400">
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.5 11.5l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="9" cy="9" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </span>
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por MLB / cód. Shopee ou título"
                    className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-9 pr-3 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                  />
                </div>

                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 max-w-[240px]"
                >
                  <option value="">Todas as contas</option>
                  {accountOptions.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.platform === 'shopee' ? 'Shopee' : 'ML'} · {a.label}
                    </option>
                  ))}
                </select>

                <select
                  value={certFilter}
                  onChange={(e) => setCertFilter(e.target.value as '' | 'gerado' | 'nao')}
                  className="px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                >
                  <option value="">Certificado: todos</option>
                  <option value="gerado">Certificado gerado</option>
                  <option value="nao">Sem certificado</option>
                </select>

                {filtersApplied && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="px-4 py-2.5 text-sm rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900 hover:border-neutral-300 transition-colors"
                  >
                    Limpar filtros
                  </button>
                )}

                <span className="text-sm text-neutral-500 lg:ml-auto whitespace-nowrap">
                  {filteredOrder.length} de {order.length}
                </span>
              </div>

              {filteredOrder.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-300 bg-white/60 p-10 text-center">
                  <p className="text-sm text-neutral-600">Nenhum anúncio encontrado com os filtros aplicados.</p>
                  {filtersApplied && (
                    <button onClick={clearFilters} className="mt-3 px-4 py-2 text-sm bg-[#2F4F7F] text-white rounded-lg hover:bg-[#253B65]">
                      Limpar filtros
                    </button>
                  )}
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredOrder.map((id) => {
                  const item = items[id];
                  if (!item) return null;
                  return (
                    <div key={id} className="group rounded-xl border border-neutral-200 bg-white flex flex-col relative overflow-hidden hover:shadow-md transition-all duration-200">
                      {/* Botão remover */}
                      <button
                        type="button"
                        onClick={() => removeFromRegistro(id)}
                        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white/90 hover:bg-red-50 rounded-md text-red-600 z-20 shadow-sm"
                        title="Remover do ambiente de registro"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>

                      {/* Imagem do produto */}
                      <a href={item.permalink} target="_blank" rel="noopener noreferrer" className="relative block aspect-square bg-neutral-100">
                        {item.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.thumbnail} alt={item.title} className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-200" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-12 h-12 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        {/* Badge de plataforma */}
                        <span
                          className="absolute top-2 left-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide text-white shadow"
                          style={{ backgroundColor: item.platform === 'shopee' ? '#EE4D2D' : '#2F4F7F' }}
                        >
                          {item.platform === 'shopee' ? 'Shopee' : 'ML'}
                        </span>
                      </a>

                      {/* Conteúdo do card */}
                      <div className="p-3 flex-1 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[10px] text-neutral-500 font-medium truncate">{item.mlbCode}</div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {coinAnimation && (
                              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-400/30 to-yellow-500/30 flex items-center justify-center p-0.5">
                                <Lottie animationData={coinAnimation} loop autoplay style={{ width: '100%', height: '100%' }} />
                              </div>
                            )}
                            <span className="text-[10px] font-semibold text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-200">
                              1 Crédito
                            </span>
                          </div>
                        </div>
                        {item.account?.nickname && (
                          <div
                            className="text-[10px] font-medium truncate"
                            style={{ color: item.platform === 'shopee' ? '#EE4D2D' : '#2563eb' }}
                          >
                            {item.platform === 'shopee' ? item.account.nickname : `@${item.account.nickname}`}
                          </div>
                        )}
                        <div className="text-xs font-semibold text-neutral-900 line-clamp-2 leading-tight min-h-[2.2em]">{item.title}</div>

                        <div className="mt-auto pt-1">
                          {isCertGerado(item) ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-medium">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              Certificado gerado
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 text-[10px] font-medium">
                              Sem certificado
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer do card */}
                      <div className="px-3 py-2.5 flex items-center justify-between border-t border-neutral-100 bg-neutral-50/50">
                        <a
                          href={item.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-neutral-600 hover:text-neutral-900 font-medium"
                        >
                          Ver anúncio →
                        </a>
                        <button
                          type="button"
                          onClick={() => handleOpenGenerateModal(id)}
                          disabled={generating === id}
                          className="rounded-md border border-neutral-200 px-2.5 py-1 text-[10px] font-semibold text-neutral-700 hover:border-neutral-300 hover:bg-white disabled:opacity-50 transition-all"
                        >
                          {generating === id ? 'Gerando…' : 'Gerar Certificado'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
              </>
            )}
          </div>

          {/* Estilos de animação */}
          <style jsx>{`
            @keyframes fade-in-up {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            @keyframes fade-in {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            .animate-fade-in-up {
              animation: fade-in-up 0.8s ease-out forwards;
            }
            .animate-fade-in {
              animation: fade-in 1s ease-out forwards;
            }
          `}</style>
        </main>
      </div>

      {/* Modal de Formulário - Etapa 1 */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Preencher Dados do Certificado"
        maxWidth="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowGenerateModal(false)}
              className="px-4 py-2 text-sm text-neutral-700 hover:text-neutral-900 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleOpenPreview}
              className="px-6 py-2 text-sm bg-[#2F4F7F] text-white rounded-lg hover:bg-[#253B65] transition-colors font-medium flex items-center gap-2"
            >
              Continuar para Validação
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        }
      >
        {itemToGenerate && items[itemToGenerate] && (
          <div className="space-y-4">
            {/* Informações do anúncio */}
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
              <div className="text-xs text-neutral-500 mb-1">{items[itemToGenerate].mlbCode}</div>
              <div className="text-sm font-semibold text-neutral-900">{items[itemToGenerate].title}</div>
            </div>

            {/* Formulário */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Autor da Obra */}
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-neutral-700">Autor da Obra</span>

                {/* Dropdown de opções */}
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setAutorTipo('proprio')}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-all ${
                      autorTipo === 'proprio'
                        ? 'bg-[#2F4F7F] text-white border-[#2F4F7F]'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    Usar dados do usuário
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutorTipo('terceiro')}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-all ${
                      autorTipo === 'terceiro'
                        ? 'bg-[#2F4F7F] text-white border-[#2F4F7F]'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    Usar dados de terceiros
                  </button>
                </div>

                <input
                  value={autorNome}
                  onChange={(e) => setAutorNome(e.target.value)}
                  placeholder={autorTipo === 'proprio' ? usuario?.nome || 'Nome do cadastro' : 'Insira o nome completo do(a) autor(a)'}
                  disabled={autorTipo === 'proprio'}
                  className={`rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 ${
                    autorTipo === 'proprio'
                      ? 'bg-neutral-50 text-neutral-500 cursor-not-allowed'
                      : 'bg-white text-neutral-700'
                  }`}
                />
                <label className="flex flex-col gap-1.5 mt-2">
                  <span className="text-xs font-medium text-neutral-600">CPF/CNPJ do autor</span>
                  <input
                    value={autorCpfCnpj}
                    onChange={(e) => setAutorCpfCnpj(e.target.value.replace(/\D/g, ''))}
                    placeholder={autorTipo === 'proprio' ? (cpfInput ? 'Usando CPF/CNPJ do usuário' : 'Defina o CPF/CNPJ do usuário abaixo') : 'Somente números'}
                    disabled={autorTipo === 'proprio'}
                    className={`rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 ${
                      autorTipo === 'proprio'
                        ? 'bg-neutral-50 text-neutral-500 cursor-not-allowed'
                        : 'bg-white text-neutral-700'
                    }`}
                  />
                </label>
              </div>

              {/* Titular dos Direitos */}
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-neutral-700">Titular dos Direitos</span>

                {/* Dropdown de opções */}
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setTitularTipo('proprio')}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-all ${
                      titularTipo === 'proprio'
                        ? 'bg-[#2F4F7F] text-white border-[#2F4F7F]'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    Usar dados do usuário
                  </button>
                  <button
                    type="button"
                    onClick={() => setTitularTipo('terceiro')}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-all ${
                      titularTipo === 'terceiro'
                        ? 'bg-[#2F4F7F] text-white border-[#2F4F7F]'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    Usar dados de terceiros
                  </button>
                </div>

                <input
                  value={titularNome}
                  onChange={(e) => setTitularNome(e.target.value)}
                  placeholder={titularTipo === 'proprio' ? usuario?.nome || 'Nome do cadastro' : 'Insira o nome completo do(a) titular'}
                  disabled={titularTipo === 'proprio'}
                  className={`rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 ${
                    titularTipo === 'proprio'
                      ? 'bg-neutral-50 text-neutral-500 cursor-not-allowed'
                      : 'bg-white text-neutral-700'
                  }`}
                />
                <label className="flex flex-col gap-1.5 mt-2">
                  <span className="text-xs font-medium text-neutral-600">CPF/CNPJ do titular</span>
                  <input
                    value={titularCpfCnpj}
                    onChange={(e) => setTitularCpfCnpj(e.target.value.replace(/\D/g, ''))}
                    placeholder={titularTipo === 'proprio' ? (cpfInput ? 'Usando CPF/CNPJ do usuário' : 'Defina o CPF/CNPJ do usuário abaixo') : 'Somente números'}
                    disabled={titularTipo === 'proprio'}
                    className={`rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 ${
                      titularTipo === 'proprio'
                        ? 'bg-neutral-50 text-neutral-500 cursor-not-allowed'
                        : 'bg-white text-neutral-700'
                    }`}
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-end gap-3">
                <label className="flex-1 flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-neutral-700">CPF/CNPJ do usuário (para auto-preencher)</span>
                  <input
                    value={cpfInput}
                    onChange={(e) => setCpfInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Somente números"
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-700 focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('customerCpfCnpj', cpfInput);
                    if (autorTipo === 'proprio') setAutorCpfCnpj(cpfInput);
                    if (titularTipo === 'proprio') setTitularCpfCnpj(cpfInput);
                    showToast('CPF/CNPJ do usuário salvo.', 'success');
                  }}
                  className="rounded-lg border border-neutral-200 px-4 py-2.5 text-sm text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 transition-colors font-medium"
                >
                  Salvar CPF/CNPJ
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Preview/Validação - Etapa 2 */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => !generating && setShowPreviewModal(false)}
        title="Validar Dados do Certificado"
        maxWidth="lg"
        footer={
          <div className="flex justify-between items-center w-full">
            <button
              onClick={handleBackToEdit}
              disabled={generating !== null}
              className="px-4 py-2 text-sm text-neutral-700 hover:text-neutral-900 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Voltar para Editar
            </button>
            <button
              onClick={() => itemToGenerate && gerar(itemToGenerate)}
              disabled={generating !== null}
              className="px-4 py-2 text-sm bg-[#2F4F7F] text-white rounded-lg hover:bg-[#253B65] transition-colors font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              {generating !== null ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Gerando...
                </>
              ) : (
                <>
                  {coinAnimation && (
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-400/30 to-yellow-500/30 flex items-center justify-center p-0.5">
                      <Lottie
                        animationData={coinAnimation}
                        loop={true}
                        autoplay={true}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  )}
                  <span>Confirmar e Gerar</span>
                  <span className="font-mono">-1</span>
                </>
              )}
            </button>
          </div>
        }
      >
        {previewData && (
          <div className="space-y-6">
            {/* Aviso de Crédito */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-amber-900 mb-1">
                  Atenção: Esta ação consumirá 1 crédito
                </p>
                <p className="text-xs text-amber-800">
                  Revise cuidadosamente os dados abaixo antes de confirmar. Uma vez gerado, o crédito será debitado e a ação não poderá ser desfeita.
                </p>
              </div>
            </div>

            {/* Preview dos Dados */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Dados que aparecerão no certificado:
              </h3>

              {/* Card do Anúncio */}
              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
                <div className="text-xs font-medium text-neutral-500 mb-1">Anúncio</div>
                <div className="text-xs text-neutral-600 mb-1">{previewData.item.mlbCode}</div>
                <div className="text-sm font-semibold text-neutral-900">{previewData.item.title}</div>
                <a
                  href={previewData.item.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block"
                >
                  Ver anúncio original →
                </a>
              </div>

              {/* Dados do Certificado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Autor da Obra */}
                <div className="p-4 bg-white border-2 border-neutral-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <div className="text-xs font-medium text-neutral-500">Autor da Obra</div>
                  </div>
                  <div className="text-base font-semibold text-neutral-900">{previewData.autorNome}</div>
                </div>

                {/* Titular dos Direitos */}
                <div className="p-4 bg-white border-2 border-neutral-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <div className="text-xs font-medium text-neutral-500">Titular dos Direitos</div>
                  </div>
                  <div className="text-base font-semibold text-neutral-900">{previewData.titularNome}</div>
                </div>

                {/* CPFs */}
                <div className="p-4 bg-white border-2 border-neutral-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                    <div className="text-xs font-medium text-neutral-500">CPF/CNPJ do Autor</div>
                  </div>
                  <div className="text-base font-semibold text-neutral-900 font-mono">{previewData.autorCpfCnpj}</div>
                </div>
                <div className="p-4 bg-white border-2 border-neutral-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                    <div className="text-xs font-medium text-neutral-500">CPF/CNPJ do Titular</div>
                  </div>
                  <div className="text-base font-semibold text-neutral-900 font-mono">{previewData.titularCpfCnpj}</div>
                </div>
              </div>

              {/* Informações Adicionais */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-blue-800">
                    O certificado será gerado em PDF com todos estes dados e ficará disponível para download imediatamente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function RegistroPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <RegistroPageContent />
    </Suspense>
  );
}
