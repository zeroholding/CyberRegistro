'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContainer';

interface MLAccount {
  id: number;
  ml_user_id: number;
  nickname: string;
  email: string;
  first_name: string;
  last_name: string;
  country_id: string;
  expires_at: string;
  created_at: string;
}

export default function ContasConectadas() {
  const [usuario, setUsuario] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accounts, setAccounts] = useState<MLAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [connectingAccount, setConnectingAccount] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [newConnectedAccount, setNewConnectedAccount] = useState<MLAccount | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<MLAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

  // Carregar contas conectadas
  useEffect(() => {
    if (usuario?.id) {
      loadAccounts();
    }
  }, [usuario]);


  const loadAccounts = async () => {
    if (!usuario?.id) return;

    try {
      setLoadingAccounts(true);
      const response = await fetch(`/api/mercadolivre/accounts?userId=${usuario.id}`);
      const data = await response.json();

      if (response.ok) {
        setAccounts(data.accounts || []);
      } else {
        console.error('Erro ao carregar contas:', data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadAccountsAndShowModal = async () => {
    if (!usuario?.id) return;

    try {
      setLoadingAccounts(true);
      const response = await fetch(`/api/mercadolivre/accounts?userId=${usuario.id}`);
      const data = await response.json();

      if (response.ok) {
        const accountsList = data.accounts || [];
        setAccounts(accountsList);

        // A última conta da lista é a recém-conectada (ORDER BY created_at DESC)
        if (accountsList.length > 0) {
          setNewConnectedAccount(accountsList[0]);
          setShowSuccessModal(true);
        }
      } else {
        console.error('Erro ao carregar contas:', data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Ouvir mensagens do popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verificar origem por segurança (opcional, mas recomendado)
      // if (event.origin !== window.location.origin) return;

      if (event.data.type === 'ML_AUTH_SUCCESS') {
        console.log('✅ Autenticação bem-sucedida!');
        setConnectingAccount(false);
        // Carregar contas e mostrar modal
        loadAccountsAndShowModal();
      } else if (event.data.type === 'ML_AUTH_ERROR') {
        console.error('❌ Erro na autenticação:', event.data.error);
        setConnectingAccount(false);
        const errorMessages: { [key: string]: string } = {
          invalid_callback: 'Callback inválido',
          token_exchange_failed: 'Falha ao obter token do Mercado Livre',
          user_data_failed: 'Falha ao obter dados do usuário',
          unexpected_error: 'Erro inesperado'
        };
        showToast(errorMessages[event.data.error] || event.data.error, 'error');
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [usuario]);

  const handleConnectAccount = async () => {
    if (!usuario?.id) return;

    try {
      setConnectingAccount(true);

      // Obter URL de autenticação
      const response = await fetch(`/api/auth/mercadolivre?userId=${usuario.id}`);
      const data = await response.json();

      if (response.ok && data.authUrl) {
        // Abrir popup
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        window.open(
          data.authUrl,
          'Conectar Mercado Livre',
          `width=${width},height=${height},left=${left},top=${top}`
        );
      } else {
        alert('Erro ao gerar URL de autenticação');
        setConnectingAccount(false);
      }
    } catch (error) {
      console.error('Erro ao conectar conta:', error);
      alert('Erro ao conectar conta');
      setConnectingAccount(false);
    }
  };

  const handleDeleteAccount = (account: MLAccount) => {
    setAccountToDelete(account);
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    if (!accountToDelete) return;

    try {
      setIsDeleting(true);

      const response = await fetch(
        `/api/mercadolivre/accounts?userId=${usuario.id}&accountId=${accountToDelete.id}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        showToast('Conta desconectada com sucesso', 'success');
        setShowDeleteModal(false);
        setAccountToDelete(null);
        loadAccounts();
      } else {
        showToast('Erro ao desconectar conta', 'error');
      }
    } catch (error) {
      console.error('Erro ao deletar conta:', error);
      showToast('Erro ao desconectar conta', 'error');
    } finally {
      setIsDeleting(false);
    }
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
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={handleLogout}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-hidden bg-neutral-50">
          {/* Header sem fundo */}
          <div className="px-6 py-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold tracking-tight text-neutral-900 mb-3">
                Contas Conectadas
              </h1>
              <p className="text-base text-neutral-600 leading-relaxed max-w-3xl">
                Conecte e gerencie suas contas do Mercado Livre para sincronizar automaticamente
                seus anúncios e manter tudo organizado em um só lugar.
              </p>
            </div>
            <div>
              <button
                onClick={handleConnectAccount}
                disabled={connectingAccount}
                className="group px-8 py-3.5 bg-[#2F4F7F] text-white rounded-xl hover:bg-[#253B65] transition-all hover:shadow-xl hover:scale-[1.02] font-semibold flex items-center gap-2.5 w-full lg:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connectingAccount ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Conectando...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Conectar Conta
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="px-6 pb-6">
            {loadingAccounts ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900"></div>
                <p className="mt-4 text-neutral-600">Carregando contas...</p>
              </div>
            ) : accounts.length === 0 ? (
              // Empty State
              <div className="relative py-20">
                {/* Elementos decorativos no fundo */}
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.03]">
                  <div className="w-[500px] h-[500px] border-[40px] border-neutral-900 rounded-full"></div>
                </div>

                {/* Grid de demonstração de contas */}
                <div className="relative">
                  {/* Texto central */}
                  <div className="text-center mb-12 animate-fade-in-up">
                    <h3 className="text-2xl font-bold text-neutral-900 tracking-tight mb-3">
                      Suas contas aparecerão aqui
                    </h3>
                    <p className="text-neutral-600 leading-relaxed max-w-xl mx-auto">
                      Após conectar, você verá todas suas contas do Mercado Livre organizadas em cards como estes:
                    </p>
                  </div>

                  {/* Cards de demonstração */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                        <div className="bg-white/40 backdrop-blur-sm border-2 border-dashed border-neutral-300 rounded-xl p-4 hover:border-neutral-400 transition-all duration-300">
                          <div className="flex items-start gap-3">
                            {/* Avatar fantasma */}
                            <div className="w-10 h-10 bg-neutral-200 rounded-lg animate-pulse flex-shrink-0"></div>

                            {/* Conteúdo fantasma */}
                            <div className="flex-1 space-y-2">
                              <div className="h-3.5 bg-neutral-200 rounded w-3/4 animate-pulse"></div>
                              <div className="h-3 bg-neutral-200 rounded w-1/2 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                              <div className="h-3 bg-neutral-200 rounded w-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>

                              <div className="flex gap-2 pt-1">
                                <div className="h-5 bg-neutral-200 rounded w-12 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                                <div className="h-5 bg-neutral-200 rounded w-8 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                              </div>
                            </div>
                          </div>

                          {/* Footer fantasma */}
                          <div className="mt-3 pt-3 border-t border-neutral-200">
                            <div className="h-3 bg-neutral-200 rounded w-2/3 animate-pulse" style={{ animationDelay: '0.6s' }}></div>
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
            ) : (
              // Lista de Contas Conectadas
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-medium text-neutral-900">
                    {accounts.length} {accounts.length === 1 ? 'conta conectada' : 'contas conectadas'}
                  </h2>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="group relative bg-white rounded-xl border border-neutral-200 p-4 hover:border-neutral-300 transition-all duration-200"
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 bg-yellow-400/20 rounded-lg flex items-center justify-center text-neutral-900 font-semibold text-base flex-shrink-0">
                          {account.first_name?.charAt(0) || account.nickname?.charAt(0) || 'M'}
                        </div>

                        {/* Informações */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-neutral-900 truncate">
                                {account.first_name} {account.last_name}
                              </h3>
                              <p className="text-xs text-neutral-500 truncate">@{account.nickname}</p>
                            </div>

                            {/* Botão Deletar */}
                            <button
                              onClick={() => handleDeleteAccount(account)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded-md text-red-600 flex-shrink-0"
                              title="Desconectar conta"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>

                          <p className="text-xs text-neutral-500 truncate mt-1">{account.email}</p>

                          <div className="flex items-center gap-2 mt-3">
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-700 rounded-md text-xs font-medium">
                              <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                              Ativa
                            </div>
                            <span className="text-xs text-neutral-500">
                              {account.country_id}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-neutral-100">
                        <p className="text-xs text-neutral-400">
                          Conectada em {new Date(account.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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

      {/* Modal de Confirmação de Delete */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => !isDeleting && setShowDeleteModal(false)}
        title="Desconectar Conta"
        maxWidth="sm"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
              className="px-4 py-2 text-sm text-neutral-700 hover:text-neutral-900 transition-colors font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDeleteAccount}
              disabled={isDeleting}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Desconectando...
                </>
              ) : (
                'Desconectar'
              )}
            </button>
          </div>
        }
      >
        {accountToDelete && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Tem certeza que deseja desconectar a conta?
            </p>

            {/* Informações da conta */}
            <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
              <div className="w-10 h-10 bg-yellow-400/20 rounded-lg flex items-center justify-center text-neutral-900 font-semibold text-base">
                {accountToDelete.first_name?.charAt(0) || accountToDelete.nickname?.charAt(0) || 'M'}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-neutral-900 truncate">
                  {accountToDelete.first_name} {accountToDelete.last_name}
                </h4>
                <p className="text-xs text-neutral-500 truncate">@{accountToDelete.nickname}</p>
              </div>
            </div>

            <p className="text-xs text-neutral-500">
              Esta ação não pode ser desfeita. Você precisará reconectar a conta se quiser usá-la novamente.
            </p>
          </div>
        )}
      </Modal>

      {/* Modal de Sucesso - Minimalista */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Conta Conectada"
        maxWidth="md"
        footer={
          <div className="flex justify-end">
            <button
              onClick={() => setShowSuccessModal(false)}
              className="px-4 py-2 text-sm bg-[#2F4F7F] text-white rounded-lg hover:bg-[#253B65] transition-colors font-medium"
            >
              Fechar
            </button>
          </div>
        }
      >
        {newConnectedAccount && (
          <div className="space-y-4">
            {/* Header Minimalista */}
            <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
              <div className="w-12 h-12 bg-yellow-400/20 rounded-xl flex items-center justify-center text-neutral-900 font-semibold text-lg">
                {newConnectedAccount.first_name?.charAt(0) || newConnectedAccount.nickname?.charAt(0) || 'M'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-neutral-900 truncate">
                  {newConnectedAccount.first_name} {newConnectedAccount.last_name}
                </h3>
                <p className="text-sm text-neutral-500 truncate">@{newConnectedAccount.nickname}</p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-md text-xs font-medium">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                Ativa
              </div>
            </div>

            {/* Informações em Lista */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <svg className="w-4 h-4 text-neutral-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-neutral-500">Email</p>
                  <p className="text-sm text-neutral-900 truncate">{newConnectedAccount.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <svg className="w-4 h-4 text-neutral-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs text-neutral-500">País</p>
                  <p className="text-sm text-neutral-900">
                    {newConnectedAccount.country_id === 'BR' ? 'Brasil' :
                     newConnectedAccount.country_id === 'AR' ? 'Argentina' :
                     newConnectedAccount.country_id === 'MX' ? 'México' :
                     newConnectedAccount.country_id}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <svg className="w-4 h-4 text-neutral-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs text-neutral-500">ID</p>
                  <p className="text-sm text-neutral-900 font-mono">{newConnectedAccount.ml_user_id}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <svg className="w-4 h-4 text-neutral-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs text-neutral-500">Conectada em</p>
                  <p className="text-sm text-neutral-900">
                    {new Date(newConnectedAccount.created_at).toLocaleDateString('pt-BR')}
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
