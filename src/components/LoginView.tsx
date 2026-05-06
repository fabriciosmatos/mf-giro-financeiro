import React, { useState } from 'react';
import { TrendingUp, User as UserIcon, Loader2, AlertCircle } from 'lucide-react';
import { loginComGoogle } from '../lib/firebase';

interface LoginViewProps {
  error: string | null;
  setError: (err: string | null) => void;
}

export function LoginView({ error, setError }: LoginViewProps) {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginComGoogle();
      // O hook useDashboardData cuidará da verificação de autorização e do estado global
    } catch (err: any) {
      console.error('Erro no login:', err);
      setError(err?.message || 'Ocorreu um erro ao tentar entrar. Tente novamente.');
      setLoading(false);
    }
    // Não damos setLoading(false) aqui se o login for bem-decidido pois o componente será
    // desmontado ou o loading global do useDashboardData assumirá o controle
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-white">
      <div className="w-20 h-20 bg-giro-primary rounded-3xl flex items-center justify-center mb-8 shadow-xl rotate-12">
        <TrendingUp className="w-12 h-12 text-white" />
      </div>
      <h1 className="text-4xl font-extrabold text-giro-primary mb-2 text-center">Giro</h1>
      <p className="text-giro-text-muted text-center mb-10 max-w-[280px]">
        Gestão inteligente de capital e microcrédito.
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col gap-2 max-w-sm w-full animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <p className="text-sm font-semibold text-red-900 leading-tight">Problema no Acesso</p>
          </div>
          <p className="text-xs text-red-700 ml-8">{error}</p>
          <p className="text-[10px] text-red-400 ml-8 mt-2 italic">Se for erro de permissão, contate o administrador. Se for erro técnico, tente recarregar a página.</p>
        </div>
      )}

      <button 
        onClick={handleLogin} 
        disabled={loading}
        className="nu-button-primary w-full max-w-sm flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-95"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <UserIcon className="w-5 h-5" />
        )}
        {loading ? 'Verificando...' : 'Entrar com Google'}
      </button>
    </div>
  );
}
