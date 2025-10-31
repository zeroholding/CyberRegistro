'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

interface CertItem {
  id: number;
  mlb_code: string;
  title: string;
  thumbnail: string | null;
  permalink: string | null;
  registro_status: string | null;
  registro_gerado_em: string | null;
  registro_hash: string | null;
  has_pdf: boolean;
  account_nickname?: string | null;
  account_first_name?: string | null;
  account_last_name?: string | null;
}

function CertificadosPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CertItem[]>([]);
  const [total, setTotal] = useState(0);
  const [usuario, setUsuario] = useState<any>(null);

  const page = useMemo(() => parseInt(params.get('page') || '1', 10) || 1, [params]);
  const search = useMemo(() => (params.get('search') || '').trim(), [params]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUsuario(payload);
    } catch {
      router.push('/login');
      return;
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    let parsed: any;
    try {
      parsed = JSON.parse(atob(token.split('.')[1]));
    } catch { return; }
    const userId = parsed?.id;
    if (!userId) return;

    const perPage = 24;
    const url = `/api/registro/history?userId=${userId}&page=${page}&perPage=${perPage}` + (search ? `&search=${encodeURIComponent(search)}` : '');
    fetch(url).then(async (res) => {
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
        setTotal(data.total || 0);
      }
    }).catch(() => {});
  }, [page, search]);

  const handleDownload = async (it: CertItem) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Sessão expirada. Faça login novamente.');
        return;
      }

      // Se o PDF ainda não foi gerado, gerar primeiro
      if (!it.has_pdf) {
        const generateRes = await fetch('/api/certificados/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            anuncioId: it.id,
            userId: usuario?.id,
          }),
        });

        if (!generateRes.ok) {
          const errorData = await generateRes.json();
          throw new Error(errorData.error || 'Erro ao gerar certificado');
        }

        // Atualizar o item para marcar que agora tem PDF
        it.has_pdf = true;
      }

      // Baixar o certificado armazenado
      const downloadUrl = `/api/certificados/download?id=${it.id}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${it.mlb_code || it.title}-certificado.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Erro ao baixar certificado:', e);
      alert('Não foi possível baixar o certificado: ' + (e instanceof Error ? e.message : 'Erro desconhecido'));
    }
  };

  const formatDateTime = (iso: string | null) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch { return iso || '-'; }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-neutral-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="certificados-page flex h-screen bg-neutral-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} onLogout={() => { localStorage.removeItem('token'); router.push('/login'); }} />
        <main className="flex-1 overflow-y-auto bg-neutral-50">
          <div className="px-6 py-8 flex flex-col gap-4">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-neutral-900">Certificados</h1>
                <p className="text-sm text-neutral-500 mt-1">Histórico de certificados gerados</p>
              </div>
              <div className="hidden md:block">
                <form action="/certificados" className="flex items-center gap-2">
                  <input name="search" defaultValue={search} placeholder="Buscar por título ou MLB" className="px-3 py-2 rounded-lg border border-neutral-200 bg-white/90 text-sm shadow-[0_1px_2px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-neutral-900/10" />
                  <button className="px-4 py-2 text-sm bg-[#2F4F7F] text-white rounded-lg hover:bg-[#253B65] transition-colors">Buscar</button>
                </form>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="relative py-20">
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.03]">
                  <div className="w-[500px] h-[500px] border-[40px] border-neutral-900 rounded-full"></div>
                </div>
                <div className="relative">
                  <div className="text-center mb-12 animate-fade-in-up">
                    <h3 className="text-2xl font-bold text-neutral-900 tracking-tight mb-3">
                      Seus certificados aparecerão aqui
                    </h3>
                    <p className="text-neutral-600 leading-relaxed max-w-xl mx-auto">
                      Após gerar certificados no ambiente de registro, eles ficarão listados aqui em cartões como estes:
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                        <div className="bg-white/40 backdrop-blur-sm border-2 border-dashed border-neutral-300 rounded-xl p-4 hover:border-neutral-400 transition-all duration-300">
                          <div className="space-y-2">
                            <div className="h-3 bg-neutral-200 rounded w-24 animate-pulse"></div>
                            <div className="h-4 bg-neutral-200 rounded w-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                            <div className="h-4 bg-neutral-200 rounded w-3/4 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                            <div className="h-5 bg-neutral-200 rounded w-20 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                            <div className="pt-2 flex items-center justify-between">
                              <div className="h-3 bg-neutral-200 rounded w-16 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                              <div className="h-7 bg-neutral-200 rounded w-28 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-12 flex items-center justify-center gap-2 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                    <div className="w-2 h-2 rounded-full bg-neutral-300 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-neutral-300 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-neutral-300 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map((it) => (
                  <div key={it.id} className="rounded-xl border border-neutral-200 bg-white p-4 flex gap-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-100 flex items-center justify-center">
                      {it.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.thumbnail} alt={it.title} className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-6 h-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18"/></svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-neutral-900 truncate" title={it.title}>{it.title}</div>
                      <div className="text-xs text-neutral-500 mt-0.5">{it.mlb_code}</div>
                      {it.account_nickname && (
                        <div className="text-xs text-blue-600 font-medium mt-0.5">@{it.account_nickname}</div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="px-2 py-0.5 rounded-md bg-green-50 text-green-700 text-xs font-medium flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          Certificado Gerado
                        </div>
                        <a href={it.permalink || '#'} target="_blank" rel="noreferrer" className="text-xs text-[#2F4F7F] hover:underline">Abrir anúncio</a>
                        <button
                          type="button"
                          onClick={() => handleDownload(it)}
                          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                          title="Baixar certificado (PDF)"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                          </svg>
                          Baixar
                        </button>
                      </div>
                      <div className="text-xs text-neutral-500 mt-1">Gerado em: {formatDateTime(it.registro_gerado_em)}</div>
                      {it.registro_hash && (
                        <div className="flex items-center gap-2 mt-2">
                          <code className="text-[11px] px-2 py-1 bg-neutral-100 text-neutral-700 rounded">{it.registro_hash.slice(0, 16)}…</code>
                          <button
                            className="text-xs text-neutral-600 hover:text-neutral-900"
                            onClick={() => navigator.clipboard.writeText(it.registro_hash || '')}
                          >Copiar hash</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
        <style jsx global>{`
          .certificados-page input[name="search"] {
            color: #000 !important;
          }
        `}</style>
      </div>
    </div>
  );
}

export default function CertificadosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-neutral-600">Carregando...</div>
      </div>
    }>
      <CertificadosPageContent/>
    </Suspense>
  );
}
