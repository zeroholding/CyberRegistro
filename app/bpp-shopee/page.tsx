'use client';

import { ReactNode, useEffect, useState } from 'react';
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

  // Shopee Brand IP Portal — entrada de titulares de direitos.
  const targetUrl = 'https://brandipp.shopee.com/';

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
          <div className="px-6 py-4 max-w-6xl mx-auto">
            {/* Cabeçalho */}
            <div className="flex-shrink-0">
              <h1 className="flex flex-wrap items-center gap-2">
                <span className="inline-block rounded-lg bg-[#EE4D2D] text-white px-4 py-1.5 shadow-lg">
                  <span className="block text-base md:text-lg font-bold leading-tight tracking-wide">SHOPEE BRAND IP PORTAL</span>
                </span>
                <span className="inline-block rounded-full bg-emerald-500 text-white px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider shadow">novo</span>
              </h1>
              <p className="text-xs text-neutral-500 mt-1">
                O portal da Shopee abre em uma nova aba (não permite incorporação em iframe).
              </p>
            </div>

            {/* Introdução */}
            <div className="text-left mt-4 mb-4">
              <h3 className="text-2xl font-bold text-neutral-900 tracking-tight mb-1.5">
                Abra o Brand IP Portal para continuar
              </h3>
              <p className="text-base text-neutral-600">
                Siga o passo a passo abaixo para cadastrar seu direito autoral no Shopee Brand IP Portal.
                O fluxo é praticamente idêntico ao do BPP do Mercado Livre.
              </p>
              <p className="mt-1.5 text-sm text-neutral-500">
                Use os mesmos dados de autor e titular já registrados na CYBER REGISTRO.
              </p>
            </div>

            {/* Botão de ação (topo) */}
            <div className="mb-6">
              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3 bg-[#EE4D2D] text-white rounded-lg hover:bg-[#d8431f] transition-all hover:shadow-lg font-semibold text-base"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Abrir Portal Brand IP - Shopee
              </a>
            </div>

            {/* Passo a passo */}
            <div className="grid lg:grid-cols-2 gap-4">
              <Step n="01" title="Abrir o Portal">
                Clique em <strong>&quot;Abrir Portal Brand IP - Shopee&quot;</strong>.{' '}
                <a href={targetUrl} target="_blank" rel="noopener noreferrer" className="text-[#EE4D2D] font-medium hover:underline break-all">
                  https://brandipp.shopee.com/
                </a>
              </Step>

              <Step n="02" title="Cadastro no Brand IP Portal">
                Cadastre-se no <strong>BRAND IP GLOBAL</strong> e, na sequência, faça login para ser direcionado
                à plataforma, onde estará: <em>&quot;Junte-se ao nosso Brand IP Portal&quot;</em>. Preencha os campos para cadastro:
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li><strong>Tipo de usuário:</strong> Proprietário da marca / Titular dos direitos.</li>
                  <li><strong>Nome da empresa</strong> / Nome da loja Shopee Oficial.</li>
                  <li><strong>E-mail corporativo:</strong> pode usar o mesmo e-mail da sua conta Shopee.</li>
                  <li><strong>Número de telefone:</strong> pode usar o mesmo telefone da sua conta Shopee.</li>
                  <li><strong>Nome oficial do contato:</strong> informe seu nome completo.</li>
                  <li><strong>País/Região</strong> de emissão do documento.</li>
                </ul>
                <p className="mt-2">Após preencher todas as informações, envie o cadastro.</p>
              </Step>

              <Step n="03" title="Gestão de IP da Marca">
                Após acessar o portal, no menu lateral, clique em: <strong>Gestão de IP da Marca</strong>.
              </Step>

              <Step n="04" title="Registro de Propriedade Intelectual">
                Dentro da Gestão de IP da Marca, clique em: <strong>Registro de propriedade intelectual da marca</strong>.
              </Step>

              <Step n="05" title="Cadastro do Direito Autoral">
                <div className="space-y-2">
                  <div>
                    <div className="font-medium text-neutral-800">Tipo de Propriedade Intelectual</div>
                    <div>Selecione: <strong>Direitos Autorais / ISBN</strong>.</div>
                  </div>
                  <div>
                    <div className="font-medium text-neutral-800">Número de registro da Propriedade Intelectual</div>
                    <div>Informe o nº do registro emitido pela <strong>Cyber Registro</strong>.</div>
                  </div>
                  <div>
                    <div className="font-medium text-neutral-800">Certificado de Registro de Direitos Autorais</div>
                    <div>Anexe o Certificado de Registro emitido pela <strong>Cyber Registro</strong>.</div>
                  </div>
                  <div>
                    <div className="font-medium text-neutral-800">Documentos de Suporte Adicionais</div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Anexe o PDF complementar emitido pela Cyber Registro.</li>
                      <li>Anexe o documento pessoal do titular da obra.</li>
                    </ul>
                  </div>
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-2.5 text-sm text-amber-800">
                    <strong>Importante:</strong> o arquivo deve ter até <strong>5 MB</strong>. Se for maior, compacte o PDF antes do envio.
                  </div>
                  <div>
                    <div className="font-medium text-neutral-800">Os campos abaixo não precisam ser preenchidos:</div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Link do site oficial.</li>
                      <li>Data de expiração.</li>
                    </ul>
                    <div className="text-sm text-neutral-500 mt-1">Esses campos podem permanecer em branco.</div>
                  </div>
                </div>
              </Step>

              <Step n="06" title="Enviar para análise">
                Após conferir todas as informações, clique em <strong>Enviar</strong>. Seu cadastro será encaminhado
                para análise da equipe da Shopee. Durante esse período, basta aguardar a validação do seu cadastro.
              </Step>

              <Step n="07" title="Análise concluída">
                Após a aprovação, seu direito autoral estará cadastrado no Shopee Brand IP Portal. A partir desse
                momento, você poderá registrar denúncias de anúncios que utilizem indevidamente sua obra protegida,
                acessando: <strong>Gestão de Caso → Envie uma violação</strong>.
              </Step>
            </div>

            {/* Checklist rápido */}
            <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-5">
              <div className="text-lg font-semibold text-neutral-900 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Checklist rápido (recomendado)
              </div>
              <ul className="list-disc pl-5 space-y-1.5 text-base text-neutral-700">
                <li>Certificado de Registro da Cyber Registro.</li>
                <li>PDF complementar da Cyber Registro (máximo de 5 MB).</li>
                <li>Número do Registro da Propriedade Intelectual.</li>
                <li>Conta Shopee ativa.</li>
                <li>Tipo de propriedade: Direitos Autorais / ISBN.</li>
              </ul>
            </div>

            {/* Ação principal (rodapé) */}
            <div className="my-6 flex items-center justify-center">
              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group px-10 py-3.5 bg-[#EE4D2D] text-white rounded-lg hover:bg-[#d8431f] transition-all hover:shadow-lg font-semibold text-lg"
              >
                Abrir Portal Brand IP - Shopee
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3.5 items-start rounded-lg border border-neutral-200 bg-white p-4">
      <div className="h-9 w-9 rounded-full bg-[#EE4D2D] text-white flex items-center justify-center text-base font-bold flex-shrink-0">{n}</div>
      <div className="min-w-0">
        <div className="text-lg font-semibold text-neutral-900">{title}</div>
        <div className="text-base text-neutral-600 mt-1">{children}</div>
      </div>
    </div>
  );
}
