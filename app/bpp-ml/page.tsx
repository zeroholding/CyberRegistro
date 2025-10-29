'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function BppMlPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      JSON.parse(atob(token.split('.')[1]));
    } catch {
      router.push('/login');
      return;
    } finally {
      setLoading(false);
    }
  }, [router]);

  const targetUrl = 'https://www.mercadolivre.com.br/noindex/pppi/rights/enroll';

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
        <main className="flex-1 overflow-y-auto bg-neutral-50">
          <div className="px-6 py-8 flex flex-col gap-4">
            <div>
              <h1 className="flex flex-wrap items-center gap-2">
                <span className="inline-block rounded-xl bg-[#2F4F7F] text-white px-5 py-2 shadow-[0_8px_24px_rgba(47,79,127,0.28)]">
                  <span className="block text-lg md:text-xl font-extrabold leading-tight tracking-wide text-center">BRAND PROTECTION PROGRAM</span>
                </span>
                <span className="inline-block rounded-xl bg-[#2F4F7F] text-white px-4 py-1.5 shadow-[0_8px_24px_rgba(47,79,127,0.28)]">
                  <span className="block text-sm md:text-base font-semibold tracking-wide text-center">MERCADO LIVRE</span>
                </span>
              </h1>
              <p className="text-sm text-neutral-500 mt-1">
                O formulário do Mercado Livre não permite incorporação em iframe (CSP frame-ancestors).
              </p>
            </div>

            {/* Empty state estilo Contas Conectadas */}
            <div className="relative py-20">
              {/* Elementos decorativos no fundo */}
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.03]">
                <div className="w-[500px] h-[500px] border-[40px] border-neutral-900 rounded-full"></div>
              </div>

              {/* Conteudo */}
              <div className="relative">
                {/* Texto central */}
                <div className="text-center mb-12 animate-fade-in-up">
                  <h3 className="text-2xl font-bold text-neutral-900 tracking-tight mb-3">
                    Abra o formulário para continuar
                  </h3>
                  <p className="text-neutral-600 leading-relaxed max-w-xl mx-auto">
                    O formulário do Mercado Livre será aberto em uma nova aba. Após concluir, você pode retornar aqui.
                  </p>
                  <p className="mt-2 text-xs text-neutral-500">Nota: em breve, alguns campos poderão ser preenchidos automaticamente a partir do seu cadastro (opcional).</p>
                </div>

                {/* Passo a passo detalhado (sem cards placeholders) */}
                <div className="mt-6 grid lg:grid-cols-2 gap-4">
                  {/* Coluna 1 */}
                  <div className="space-y-3">
                    <div className="flex gap-3 items-start rounded-xl border border-neutral-200 bg-white p-4 animate-fade-in" style={{ animationDelay: '0.15s' }}>
                      <div className="h-8 w-8 rounded-full bg-[#2F4F7F] text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">1</div>
                      <div>
                        <div className="text-sm font-semibold text-neutral-900">Abrir o formulário</div>
                        <div className="text-sm text-neutral-600">Clique em “Abrir formulário no Mercado Livre” (nova aba).</div>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start rounded-xl border border-neutral-200 bg-white p-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                      <div className="h-8 w-8 rounded-full bg-[#2F4F7F] text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">2</div>
                      <div>
                        <div className="text-sm font-semibold text-neutral-900">Tipo de usuário</div>
                        <div className="text-sm text-neutral-600">Em “Que tipo de usuário você quer cadastrar?”, selecione “Sou um titular de direitos”.</div>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start rounded-xl border border-neutral-200 bg-white p-4 animate-fade-in" style={{ animationDelay: '0.25s' }}>
                      <div className="h-8 w-8 rounded-full bg-[#2F4F7F] text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">3</div>
                      <div>
                        <div className="text-sm font-semibold text-neutral-900">Informações da pessoa ou empresa</div>
                        <div className="text-sm text-neutral-600">Use os mesmos dados de autor e titular da obra registrados na CYBER REGISTRO e anexe o documento pessoal do autor e do titular.</div>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start rounded-xl border border-neutral-200 bg-white p-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                      <div className="h-8 w-8 rounded-full bg-[#2F4F7F] text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">4</div>
                      <div>
                        <div className="text-sm font-semibold text-neutral-900">Dados Públicos</div>
                        <div className="text-sm text-neutral-600">Nome público: sugerimos “Nome + Sobrenome + CYBER”. Em “e-mail de contato”, use um e-mail novo (nunca usado no ML) e diferente do “e-mail corporativo”.</div>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start rounded-xl border border-neutral-200 bg-white p-4 animate-fade-in" style={{ animationDelay: '0.35s' }}>
                      <div className="h-8 w-8 rounded-full bg-[#2F4F7F] text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">5</div>
                      <div>
                        <div className="text-sm font-semibold text-neutral-900">Dados do administrador da conta</div>
                        <div className="text-sm text-neutral-600">Você deve usar os dados da sua conta do Mercado Livre que deseja proteger (PF/PJ), conforme seus respectivos dados.</div>
                      </div>
                    </div>
                  </div>

                  {/* Coluna 2 */}
                  <div className="space-y-3">
                    <div className="flex gap-3 items-start rounded-xl border border-neutral-200 bg-white p-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                      <div className="h-8 w-8 rounded-full bg-[#2F4F7F] text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">6</div>
                      <div>
                        <div className="text-sm font-semibold text-neutral-900">Direitos a cadastrar</div>
                        <div className="text-sm text-neutral-600">Selecione “Direitos autorais” e cadastre um direito já registrado conosco. Escolha 1 anúncio para começar e anexe 2 PDFs: (1) imagens do anúncio agrupadas, (2) certificado do registro.</div>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start rounded-xl border border-neutral-200 bg-white p-4 animate-fade-in" style={{ animationDelay: '0.45s' }}>
                      <div className="h-8 w-8 rounded-full bg-[#2F4F7F] text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">7</div>
                      <div>
                        <div className="text-sm font-semibold text-neutral-900">Validação por e-mail</div>
                        <div className="text-sm text-neutral-600">Um código será enviado ao e-mail definido em Dados Públicos. Verifique sua caixa de entrada e informe o código para concluir.</div>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start rounded-xl border border-neutral-200 bg-white p-4 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                      <div className="h-8 w-8 rounded-full bg-[#2F4F7F] text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">8</div>
                      <div>
                        <div className="text-sm font-semibold text-neutral-900">Aguardar análise do BPP</div>
                        <div className="text-sm text-neutral-600">Após enviar, aguarde a análise do BPP e o retorno no e-mail informado em Dados Públicos com os próximos passos.</div>
                      </div>
                    </div>

                    {/* Checklist rápido */}
                    <div className="rounded-xl border border-neutral-200 bg-white p-4 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                      <div className="text-sm font-semibold text-neutral-900 mb-2">Checklist rápido (recomendado)</div>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-700">
                        <li>PDF com imagens do anúncio (agrupar imagens)</li>
                        <li>PDF do certificado de registro (Cyber Registro)</li>
                        <li>Documento pessoal do autor e do titular</li>
                        <li>E-mail de contato novo (Dados Públicos) e diferente do e-mail corporativo</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Acao principal */}
                <div className="mt-8 flex items-center justify-center">
                  <a
                    href={targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group px-8 py-3.5 bg-[#2F4F7F] text-white rounded-xl hover:bg-[#253B65] transition-all hover:shadow-xl hover:scale-[1.02] font-semibold"
                  >
                    Abrir formulário do BPP - ML
                  </a>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
