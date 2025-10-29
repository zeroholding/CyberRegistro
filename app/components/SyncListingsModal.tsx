import { useState, useEffect } from 'react';
import Modal from './Modal';

// Ensure this file is saved with UTF-8 encoding to properly display special characters

interface MLAccount {
  id: number;
  ml_user_id: number;
  nickname: string;
  email: string;
  first_name: string;
  last_name: string;
  country_id: string;
  expires_at: string;
}

interface SyncListingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  onSyncComplete: () => void;
}

interface AccountProgress {
  status: 'idle' | 'fetching' | 'saving' | 'completed' | 'error';
  totalListings: number;
  savedListings: number;
  error?: string;
}

export default function SyncListingsModal({ isOpen, onClose, userId, onSyncComplete }: SyncListingsModalProps) {
  const [accounts, setAccounts] = useState<MLAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [accountProgress, setAccountProgress] = useState<Map<number, AccountProgress>>(new Map());

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
      setSyncResult(null);
      setSelectedAccounts(new Set());
      setAccountProgress(new Map());
    }
  }, [isOpen, userId]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/mercadolivre/accounts?userId=${userId}`);
      const data = await response.json();

      if (response.ok) {
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAccount = (accountId: number) => {
    const newSelected = new Set(selectedAccounts);
    if (newSelected.has(accountId)) {
      newSelected.delete(accountId);
    } else {
      newSelected.add(accountId);
    }
    setSelectedAccounts(newSelected);
  };

  const toggleAll = () => {
    if (selectedAccounts.size === accounts.length) {
      setSelectedAccounts(new Set());
    } else {
      setSelectedAccounts(new Set(accounts.map(acc => acc.id)));
    }
  };

  const updateAccountProgress = (accountId: number, update: Partial<AccountProgress>) => {
    setAccountProgress(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(accountId) || { status: 'idle', totalListings: 0, savedListings: 0 };
      newMap.set(accountId, { ...current, ...update });
      return newMap;
    });
  };

  const handleSync = async () => {
    if (selectedAccounts.size === 0) return;

    try {
      setSyncing(true);

      const response = await fetch('/api/mercadolivre/sync-listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          accountIds: Array.from(selectedAccounts)
        })
      });

      if (!response.ok) {
        alert('Erro ao sincronizar');
        setSyncing(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        alert('Erro ao sincronizar: streaming não suportado');
        setSyncing(false);
        return;
      }

      console.log('Streaming iniciado, aguardando eventos...');
      let buffer = '';
      let currentEventType = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('Stream finalizado');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        console.log('Chunk recebido:', chunk);
        buffer += chunk;
        const lines = buffer.split('\n\n');

        // Keep the last incomplete chunk in buffer
        buffer = lines.pop() || '';

        for (const chunk of lines) {
          if (!chunk.trim()) continue;

          const eventLines = chunk.split('\n');
          let eventData = '';

          for (const line of eventLines) {
            if (line.startsWith('event:')) {
              currentEventType = line.substring(6).trim();
            } else if (line.startsWith('data:')) {
              eventData = line.substring(5).trim();
            }
          }

          if (eventData) {
            try {
              const data = JSON.parse(eventData);
              console.log('SSE Event:', currentEventType, data);

              if (currentEventType === 'fetching') {
                updateAccountProgress(data.accountId, {
                  status: 'fetching',
                  totalListings: 0,
                  savedListings: 0
                });
              } else if (currentEventType === 'found') {
                updateAccountProgress(data.accountId, {
                  status: 'saving',
                  totalListings: data.count,
                  savedListings: 0
                });
              } else if (currentEventType === 'progress') {
                updateAccountProgress(data.accountId, {
                  savedListings: data.saved
                });
              } else if (currentEventType === 'complete') {
                // Mark all synced accounts as completed
                data.synced?.forEach((item: any) => {
                  updateAccountProgress(item.accountId, {
                    status: 'completed',
                    totalListings: item.count,
                    savedListings: item.count
                  });
                });

                setSyncResult(data);
                setTimeout(() => {
                  onSyncComplete();
                  onClose();
                }, 2000);
              } else if (currentEventType === 'error') {
                if (data.accountId) {
                  updateAccountProgress(data.accountId, {
                    status: 'error',
                    error: data.error
                  });
                } else {
                  alert('Erro ao sincronizar: ' + data.error);
                }
              }
            } catch (e) {
              console.error('Erro ao parsear evento:', e, eventData);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      alert('Erro ao sincronizar anúncios');
    } finally {
      setSyncing(false);
    }
  };

  const isAccountExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !syncing && onClose()}
      title="Sincronizar Anúncios"
      maxWidth="lg"
      footer={
        !syncResult && (
          <div className="flex justify-between items-center">
            <button
              onClick={toggleAll}
              disabled={syncing || loading || accounts.length === 0}
              className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors font-medium disabled:opacity-50"
            >
              {selectedAccounts.size === accounts.length ? 'Desmarcar todas' : 'Selecionar todas'}
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={syncing}
                className="px-4 py-2 text-sm text-neutral-700 hover:text-neutral-900 transition-colors font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSync}
                disabled={syncing || selectedAccounts.size === 0}
                className="px-6 py-2 text-sm bg-[#2F4F7F] text-white rounded-lg hover:bg-[#253B65] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {syncing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    Sincronizar ({selectedAccounts.size})
                  </>
                )}
              </button>
            </div>
          </div>
        )
      }
    >
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
          <p className="mt-4 text-sm text-neutral-600">Carregando contas...</p>
        </div>
      ) : syncResult ? (
        <div className="space-y-4">
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Sincronização Concluída!</h3>
            <p className="text-sm text-neutral-600">
              {syncResult.synced?.length || 0} {(syncResult.synced?.length || 0) === 1 ? 'conta sincronizada' : 'contas sincronizadas'}
            </p>
          </div>

          <div className="space-y-2">
            {syncResult.synced?.map((item: any) => (
              <div key={item.accountId} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-medium text-neutral-900">@{item.nickname}</span>
                </div>
                <span className="text-sm text-neutral-600">
                  {item.count} {item.count === 1 ? 'anúncio' : 'anúncios'}
                </span>
              </div>
            ))}
          </div>

          {syncResult.errors && syncResult.errors.length > 0 && (
            <div className="space-y-2 mt-4">
              <p className="text-sm font-medium text-red-600">Erros:</p>
              {syncResult.errors.map((error: any, index: number) => (
                <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200 text-sm text-red-700">
                  {error.nickname && <strong>@{error.nickname}: </strong>}
                  {error.error}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-neutral-900 mb-2">Nenhuma conta conectada</h3>
          <p className="text-sm text-neutral-600 mb-4">
            Você precisa conectar pelo menos uma conta do Mercado Livre antes de sincronizar.
          </p>
          <button
            onClick={onClose}
            className="text-sm text-neutral-900 hover:text-neutral-700 font-medium"
          >
            Voltar
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-neutral-600 mb-4">
            Selecione as contas do Mercado Livre que deseja sincronizar:
          </p>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {accounts.map((account) => {
              const expired = isAccountExpired(account.expires_at);
              const isSelected = selectedAccounts.has(account.id);
              const progress = accountProgress.get(account.id);

              return (
                <button
                  key={account.id}
                  onClick={() => !expired && !syncing && toggleAccount(account.id)}
                  disabled={expired || syncing}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    expired
                      ? 'bg-neutral-50 border-neutral-200 cursor-not-allowed opacity-60'
                      : isSelected
                      ? 'bg-yellow-50 border-yellow-400'
                      : 'bg-white border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                      expired
                        ? 'border-neutral-300 bg-neutral-100'
                        : isSelected
                        ? 'border-yellow-500 bg-yellow-500'
                        : 'border-neutral-300'
                    }`}>
                      {isSelected && !expired && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="w-10 h-10 bg-yellow-400/20 rounded-lg flex items-center justify-center text-neutral-900 font-semibold text-base flex-shrink-0">
                      {account.first_name?.charAt(0) || account.nickname?.charAt(0) || 'M'}
                    </div>

                    {/* Informações */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-neutral-900 truncate">
                        {account.first_name} {account.last_name}
                      </h4>
                      <p className="text-xs text-neutral-500 truncate">@{account.nickname}</p>
                      <p className="text-xs text-neutral-500 truncate mt-1">{account.email}</p>

                      <div className="flex items-center gap-2 mt-2">
                        {expired ? (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-50 text-red-700 rounded-md text-xs font-medium">
                            <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                            Token expirado
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-700 rounded-md text-xs font-medium">
                            <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                            Ativa
                          </div>
                        )}
                        <span className="text-xs text-neutral-500">{account.country_id}</span>
                      </div>

                      {/* Progress Bar - só aparece se a conta estiver sendo sincronizada */}
                      {isSelected && progress && progress.status !== 'idle' && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              {progress.status === 'fetching' && (
                                <>
                                  <svg className="animate-spin h-3 w-3 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  <span className="text-yellow-700 font-medium">Buscando anúncios...</span>
                                </>
                              )}
                              {progress.status === 'saving' && (
                                <>
                                  <svg className="animate-spin h-3 w-3 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  <span className="text-yellow-700 font-medium">
                                    {progress.totalListings} {progress.totalListings === 1 ? 'anúncio encontrado' : 'anúncios encontrados'}
                                  </span>
                                </>
                              )}
                              {progress.status === 'completed' && (
                                <>
                                  <svg className="h-3 w-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span className="text-green-700 font-medium">Concluído!</span>
                                </>
                              )}
                              {progress.status === 'error' && (
                                <>
                                  <svg className="h-3 w-3 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  <span className="text-red-700 font-medium">Erro</span>
                                </>
                              )}
                            </div>
                            {progress.status === 'saving' && progress.totalListings > 0 && (
                              <span className="text-neutral-600 font-semibold">
                                {progress.savedListings} / {progress.totalListings}
                              </span>
                            )}
                          </div>

                          {/* Barra de Progresso */}
                          {progress.status === 'saving' && progress.totalListings > 0 && (
                            <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                                style={{ width: `${(progress.savedListings / progress.totalListings) * 100}%` }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"></div>
                              </div>
                            </div>
                          )}

                          {progress.status === 'fetching' && (
                            <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
                              <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-full rounded-full animate-pulse w-1/3"></div>
                            </div>
                          )}

                          {progress.status === 'completed' && (
                            <div className="w-full bg-green-200 rounded-full h-2 overflow-hidden">
                              <div className="bg-gradient-to-r from-green-500 to-green-600 h-full rounded-full w-full"></div>
                            </div>
                          )}

                          {progress.status === 'error' && progress.error && (
                            <p className="text-xs text-red-600">{progress.error}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {accounts.some(acc => isAccountExpired(acc.expires_at)) && (
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-xs text-yellow-800">
              <strong>Atenção:</strong> Algumas contas possuem token expirado e precisam ser reconectadas.
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
