/**
 * Componente Visual TelaLogin.
 * Representa a interface visual limpa e elegante para autenticação de acesso.
 * Todas as nomenclaturas, termos e textos estão em português.
 */

import React from 'react';
import { useTelaLogin } from './useTelaLogin';
import { TrendingUp, User as UserIcon, Loader2, AlertCircle, ExternalLink } from 'lucide-react';

interface TelaLoginProps {
  error: string | null;
  setError: (err: string | null) => void;
}

export function TelaLogin({ error, setError }: TelaLoginProps) {
  const {
    estaCarregando,
    estaNoIframe,
    abrirEmNovaAba,
    iniciarAutenticacao,
  } = useTelaLogin({ setError });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-white text-giro-text">
      <div className="w-20 h-20 bg-giro-primary rounded-3xl flex items-center justify-center mb-8 shadow-xl rotate-12">
        <TrendingUp className="w-12 h-12 text-white" />
      </div>
      <h1 className="text-4xl font-extrabold text-giro-primary mb-2 text-center">Giro</h1>
      <p className="text-giro-text-muted text-center mb-10 max-w-[280px]">
        Gestão inteligente de capital e microcrédito.
      </p>

      {estaNoIframe && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col gap-2 max-w-sm w-full animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm font-bold text-amber-900 leading-tight">Painel Incorporado (Iframe)</p>
          </div>
          <p className="text-xs text-amber-700 ml-8 leading-relaxed">
            Navegadores modernos (como Chrome/Safari) bloqueiam acessos de segurança quando abertos em mini-telas embutidas. Se o login falhar, por favor utilize uma nova aba.
          </p>
          <button
            onClick={abrirEmNovaAba}
            className="mt-2 ml-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-amber-950 bg-amber-200/60 hover:bg-amber-200 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Abrir em Nova Aba
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col gap-2 max-w-sm w-full animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <p className="text-sm font-semibold text-red-900 leading-tight">Problema no Acesso</p>
          </div>
          <p className="text-xs text-red-700 ml-8 leading-relaxed">{error}</p>
          {error.includes('Iframe') && (
            <button
              onClick={abrirEmNovaAba}
              className="mt-2 ml-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-red-950 bg-red-100 hover:bg-red-200/80 px-3.5 py-2.5 rounded-xl transition-all animate-pulse cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Entrar via Nova Aba
            </button>
          )}
          {!error.includes('Iframe') && (
            <p className="text-[10px] text-red-400 ml-8 mt-2 italic">Se for erro de permissão, contate o administrador. Se for erro técnico, tente recarregar a página ou abrir em nova aba.</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button 
          onClick={iniciarAutenticacao} 
          disabled={estaCarregando}
          className="nu-button-primary w-full flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-95 animate-in fade-in zoom-in-95 duration-200 cursor-pointer"
        >
          {estaCarregando ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <UserIcon className="w-5 h-5" />
          )}
          {estaCarregando ? 'Verificando...' : 'Entrar com Google'}
        </button>

        {estaNoIframe && (
          <button 
            onClick={abrirEmNovaAba}
            className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all active:scale-95 border border-gray-200/80 mt-1 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir em Tela Cheia
          </button>
        )}
      </div>

      {/* Rodapé institucional */}
      <footer className="mt-16 text-center opacity-30 select-none flex flex-col items-center justify-center gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-1 bg-giro-primary rounded-full"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Giro Dashboard</span>
        </div>
        <span className="text-[9px] font-bold">Versão 3.6.0</span>
      </footer>
    </div>
  );
}
