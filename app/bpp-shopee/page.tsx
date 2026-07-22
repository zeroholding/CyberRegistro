'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function BppShopeePage() {
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

  // Brand IP Portal da Shopee — entrada de titulares de direitos.
  const targetUrl = 'https://brandprotection.shopee.com/rights-holders';

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
        <main className="flex-1 overflow-hidden bg-neutral-50">
          <div className="h-full px-6 py-3 flex flex-col overflow-hidden">
            <div className="flex-shrink-0">
              <h1 className="flex flex-wrap items-center gap-2">
                <span className="inline-block rounded-lg bg-[#EE4D2D] text-white px-4 py-1.5 shadow-lg">
                  <span className="block text-base md:text-lg font-bold leading-tight tracking-wide">BRAND IP PORTAL</span>
                </span>
                <span className="inline-block rounded-lg bg-[#EE4D2D] text-white px-3 py-1 shadow-lg">
                  <span className="block text-sm font-semibold tracking-wide">SHOPEE</span>
                </span>
                <span className="inline-block rounded-full bg-emerald-500 text-white px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider shadow">novo</span>
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                O portal da Shopee abre em uma nova aba (não permite incorporação em iframe).
              </p>
            </div>

            {/* Conteudo principal */}
            <div className="flex-1 overflow-hidden flex flex-col mt-2">
              <div className="text-left mb-3">
                <h3 className="text-2xl font-bold text-neutral-900 tracking-tight mb-1.5">
                  Abra o Brand IP Portal para continuar
                </h3>
                <p className="text-base text-neutral-600">
                  O portal de proteção de propriedade intelectual da Shopee será aberto em uma nova aba. Após concluir, você pode retornar aqui.
                </p>
                <p className="mt-1.5 text-sm text-neutral-500">Use os mesmos dados de autor e titular já registrados na CYBER REGISTRO.</p>
              </div>

              {/* Passo a passo */}
              <div className="flex-1 overflow-hidden">
                <div className="grid lg:grid-cols-2 gap-4 h-full">
                  {/* Coluna 1 */}
                  <div className="space-y-3 overflow-y-auto">
                    <Step n={1} title="Abrir o Brand IP Portal" desc='Clique em "Abrir Brand IP Portal - Shopee" (nova aba) e faça login ou crie sua conta de titular de direitos.' />
                    <Step n={2} title="Cadastrar como titular de direitos" desc='Selecione o perfil de "rights holder" (titular de direitos) e informe os dados da pessoa ou empresa.' />
                    <Step n={3} title="Informações da pessoa ou empresa" desc="Use os mesmos dados de autor e titular da obra registrados na CYBER REGISTRO e anexe o documento pessoal do autor e do titular." />
                    <Step n={4} title="Tipo de direito" desc='Selecione "Direitos autorais" (copyright) e cadastre um direito já registrado conosco.' />
                  </div>

                  {/* Coluna 2 */}
                  <div className="space-y-3 overflow-y-auto">
                    <Step n={5} title="Cadastrar o anúncio a proteger" desc="Escolha 1 anúncio para começar e anexe 2 PDFs: (1) imagens do anúncio agrupadas, (2) certificado do registro Cyber Registro." />
                    <Step n={6} title="Validação por e-mail" desc="A Shopee envia um código ao e-mail cadastrado. Verifique a caixa de entrada e informe o código para concluir." />
                    <Step n={7} title="Aguardar análise da Shopee" desc="Após enviar, aguarde a análise da equipe de proteção de marca da Shopee e o retorno por e-mail com os próximos passos." />

                    {/* Checklist rápido */}
                    <div className="rounded-lg border border-neutral-200 bg-white p-4">
                      <div className="text-lg font-semibold text-neutral-900 mb-2">Checklist rápido (recomendado)</div>
                      <ul className="list-disc pl-5 space-y-1.5 text-base text-neutral-700">
                        <li>PDF com imagens do anúncio (agrupar imagens)</li>
                        <li>PDF do certificado de registro (Cyber Registro)</li>
                        <li>Documento pessoal do autor e do titular</li>
                        <li>E-mail de contato válido para a validação</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Acao principal */}
              <div className="mt-4 flex items-center justify-center flex-shrink-0">
                <a
                  href={targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group px-10 py-3.5 bg-[#EE4D2D] text-white rounded-lg hover:bg-[#d8431f] transition-all hover:shadow-lg font-semibold text-lg"
                >
                  Abrir Brand IP Portal - Shopee
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex gap-3.5 items-start rounded-lg border border-neutral-200 bg-white p-4">
      <div className="h-9 w-9 rounded-full bg-[#EE4D2D] text-white flex items-center justify-center text-lg font-semibold flex-shrink-0">{n}</div>
      <div>
        <div className="text-lg font-semibold text-neutral-900">{title}</div>
        <div className="text-base text-neutral-600 mt-1">{desc}</div>
      </div>
    </div>
  );
}
