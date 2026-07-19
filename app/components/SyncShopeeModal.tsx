import { useState, useEffect } from 'react';
import Modal from './Modal';

interface ShopeeAccount {
  id: number;
  shop_id: number;
  shop_name: string;
  expires_at: string;
}

interface SyncShopeeModalProps {
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

export default function SyncShopeeModal({ isOpen, onClose, userId, onSyncComplete }: SyncShopeeModalProps) {
  const [accounts, setAccounts] = useState<ShopeeAccount[]>([]);
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
      const response = await fetch(`/api/shopee/accounts?userId=${userId}`);
      const data = await response.json();
      if (response.ok) {
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Erro ao carregar contas Shopee:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAccount = (accountId: number) => {
    const newSelected = new Set(selectedAccounts);
    if (newSelected.has(accountId)) newSelected.delete(accountId);
    else newSelected.add(accountId);
    setSelectedAccounts(newSelected);
  };

  const toggleAll = () => {
    setSelectedAccounts(
      selectedAccounts.size === accounts.length ? new Set() : new Set(accounts.map((a) => a.id)),
    );
  };

  const updateAccountProgress = (accountId: number, update: Partial<AccountProgress>) => {
    setAccountProgress((prev) => {
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
      const accountIds = Array.from(selectedAccounts);
      const allSynced: any[] = [];
      const allErrors: any[] = [];

      for (const accountId of accountIds) {
        try {
          const response = await fetch('/api/shopee/sync-listings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, accountIds: [accountId] }),
          });

          if (!response.ok) {
            const accountInfo = accounts.find((acc) => acc.id === accountId);
            const errorMsg = `Erro HTTP ${response.status}`;
            allErrors.push({ accountId, nickname: accountInfo?.shop_name, error: errorMsg });
            updateAccountProgress(accountId, { status: 'error', error: errorMsg });
            continue;
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          if (!reader) continue;

          let buffer = '';
          let currentEventType = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const chunk of lines) {
              if (!chunk.trim()) continue;
              const eventLines = chunk.split('\n');
              let eventData = '';

              for (const line of eventLines) {
                if (line.startsWith('event:')) currentEventType = line.substring(6).trim();
                else if (line.startsWith('data:')) eventData = line.substring(5).trim();
              }

              if (eventData) {
                try {
                  const data = JSON.parse(eventData);
                  if (currentEventType === 'fetching') {
                    updateAccountProgress(data.accountId, { status: 'fetching', totalListings: 0, savedListings: 0 });
                  } else if (currentEventType === 'found') {
                    updateAccountProgress(data.accountId, { status: 'saving', totalListings: data.count, savedListings: 0 });
                  } else if (currentEventType === 'progress') {
                    updateAccountProgress(data.accountId, { savedListings: data.saved });
                  } else if (currentEventType === 'complete') {
                    data.synced?.forEach((item: any) => {
                      updateAccountProgress(item.accountId, {
                        status: 'completed',
                        totalListings: item.count,
                        savedListings: item.count,
                      });
                      allSynced.push(item);
                    });
                  } else if (currentEventType === 'error' && data.accountId) {
                    updateAccountProgress(data.accountId, { status: 'error', error: data.error });
                    allErrors.push(data);
                  }
                } catch (e) {
                  console.error('Erro ao parsear evento:', e, eventData);
                }
              }
            }
          }
        } catch (error: any) {
          const accountInfo = accounts.find((acc) => acc.id === accountId);
          allErrors.push({ accountId, nickname: accountInfo?.shop_name, error: error.message || 'Erro desconhecido' });
          updateAccountProgress(accountId, { status: 'error', error: error.message || 'Erro desconhecido' });
        }
      }

      setSyncResult({ success: true, synced: allSynced, errors: allErrors.length > 0 ? allErrors : undefined });

      setTimeout(() => {
        onSyncComplete();
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Erro ao sincronizar Shopee:', error);
      alert('Erro ao sincronizar anúncios da Shopee');
    } finally {
      setSyncing(false);
    }
  };

  const isAccountExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !syncing && onClose()}
      title="Sincronizar Anúncios Shopee"
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
                className="px-6 py-2 text-sm bg-[#EE4D2D] text-white rounded-lg hover:bg-[#d8431f] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {syncing ? 'Sincronizando...' : `Sincronizar (${selectedAccounts.size})`}
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
              {syncResult.synced?.length || 0} {(syncResult.synced?.length || 0) === 1 ? 'loja sincronizada' : 'lojas sincronizadas'}
            </p>
          </div>
          <div className="space-y-2">
            {syncResult.synced?.map((item: any) => (
              <div key={item.accountId} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <span className="text-sm font-medium text-neutral-900">{item.nickname}</span>
                <span className="text-sm text-neutral-600">{item.count} {item.count === 1 ? 'anúncio' : 'anúncios'}</span>
              </div>
            ))}
          </div>
          {syncResult.errors && syncResult.errors.length > 0 && (
            <div className="space-y-2 mt-4">
              <p className="text-sm font-medium text-red-600">Erros:</p>
              {syncResult.errors.map((error: any, index: number) => (
                <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200 text-sm text-red-700">
                  {error.nickname && <strong>{error.nickname}: </strong>}
                  {error.error}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-base font-semibold text-neutral-900 mb-2">Nenhuma loja Shopee conectada</h3>
          <p className="text-sm text-neutral-600 mb-4">
            Você precisa conectar pelo menos uma loja da Shopee antes de sincronizar.
          </p>
          <button onClick={onClose} className="text-sm text-neutral-900 hover:text-neutral-700 font-medium">
            Voltar
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-neutral-600 mb-4">Selecione as lojas da Shopee que deseja sincronizar:</p>
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
                      ? 'bg-orange-50 border-[#EE4D2D]'
                      : 'bg-white border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                        expired ? 'border-neutral-300 bg-neutral-100' : isSelected ? 'border-[#EE4D2D] bg-[#EE4D2D]' : 'border-neutral-300'
                      }`}
                    >
                      {isSelected && !expired && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-[#EE4D2D] font-semibold text-base flex-shrink-0">
                      {account.shop_name?.charAt(0) || 'S'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-neutral-900 truncate">{account.shop_name}</h4>
                      <p className="text-xs text-neutral-500 truncate">Shop ID: {account.shop_id}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {expired ? (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-50 text-red-700 rounded-md text-xs font-medium">
                            Token expirado
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-700 rounded-md text-xs font-medium">
                            Ativa
                          </div>
                        )}
                      </div>

                      {isSelected && progress && progress.status !== 'idle' && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            {progress.status === 'fetching' && <span className="text-orange-700 font-medium">Buscando anúncios...</span>}
                            {progress.status === 'saving' && (
                              <span className="text-orange-700 font-medium">
                                {progress.totalListings} {progress.totalListings === 1 ? 'anúncio encontrado' : 'anúncios encontrados'}
                              </span>
                            )}
                            {progress.status === 'completed' && <span className="text-green-700 font-medium">Concluído!</span>}
                            {progress.status === 'error' && <span className="text-red-700 font-medium">Erro</span>}
                          </div>
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
        </div>
      )}
    </Modal>
  );
}
