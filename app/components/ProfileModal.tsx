import { useState, useEffect } from 'react';
import Modal from './Modal';
import { useToast } from './ToastContainer';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuario: any;
  onUpdateUsuario: (novoUsuario: any, novoToken: string) => void;
}

export default function ProfileModal({ isOpen, onClose, usuario, onUpdateUsuario }: ProfileModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');

  // Sincronizar com os props iniciais
  useEffect(() => {
    if (usuario && isOpen) {
      setNome(usuario.nome || '');
      setEmail(usuario.email || '');
      setSenhaAtual('');
      setNovaSenha('');
    }
  }, [usuario, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) {
      showToast('Nome e e-mail são obrigatórios.', 'error');
      return;
    }
    if (novaSenha && !senhaAtual) {
      showToast('Digite sua senha atual para realizar a troca de senha.', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/perfil', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim(),
          senhaAtual: senhaAtual,
          novaSenha: novaSenha
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.erro || 'Falha ao atualizar o perfil.', 'error');
      } else {
        showToast('Perfil atualizado com sucesso!', 'success');
        // Notificar pai e limpar senhas visuais
        onUpdateUsuario(data.usuario, data.token);
        setSenhaAtual('');
        setNovaSenha('');
        onClose();
      }
    } catch (error) {
      console.error(error);
      showToast('Ocorreu um erro inesperado.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configurações de Perfil"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Nome Completo
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
            placeholder="Seu nome"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            E-mail
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
            placeholder="seu@email.com"
          />
        </div>

        <div className="border-t border-neutral-100 pt-4 mt-4">
          <h4 className="text-sm font-semibold text-neutral-900 mb-3">Alterar Senha</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Senha Atual
              </label>
              <input
                type="password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                autoComplete="new-password" // evitar preenchimento indesejado
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
                placeholder="Exigido apenas se for trocar a senha..."
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Nova Senha
              </label>
              <input
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
                placeholder="No mínimo 6 caracteres"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-neutral-100 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition-colors border border-transparent"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-[#2F4F7F] text-white text-sm font-semibold rounded-lg hover:bg-[#253B65] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
