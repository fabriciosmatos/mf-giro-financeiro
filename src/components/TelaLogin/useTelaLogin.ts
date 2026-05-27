/**
 * Hook Customizado useTelaLogin.
 * Centraliza e governa a lógica de autenticação integrada e estados do iframe.
 * Todas as nomenclaturas descritivas estão rigorosamente em PORTUGUÊS.
 */

import { useState, useEffect } from 'react';
import { loginComGoogle } from '../../lib/firebase';

interface UseTelaLoginProps {
  setError: (erro: string | null) => void;
}

export function useTelaLogin({ setError }: UseTelaLoginProps) {
  const [estaCarregando, setEstaCarregando] = useState(false);
  const [estaNoIframe, setEstaNoIframe] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEstaNoIframe(window.self !== window.top);
    }
  }, []);

  /**
   * Abre no navegador global completo para evitar problemas de iframe
   */
  const abrirEmNovaAba = () => {
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank');
    }
  };

  /**
   * Executa a autenticação federada com Google tratando erros de segurança do iframe
   */
  const iniciarAutenticacao = async () => {
    setEstaCarregando(true);
    setError(null);
    try {
      await loginComGoogle();
    } catch (erro: any) {
      console.error('Erro na autenticação:', erro);
      let erroAmigavel = erro?.message || 'Ocorreu um erro ao tentar entrar. Tente novamente.';
      if (erro?.code === 'auth/network-request-failed' || erroAmigavel.includes('network-request-failed')) {
        erroAmigavel = 'O login foi bloqueado pelo seu navegador devido ao ambiente embutido (Iframe). Para resolver esse bloqueio de segurança, clique no botão para abrir em Nova Aba!';
      }
      setError(erroAmigavel);
      setEstaCarregando(false);
    }
  };

  return {
    estaCarregando,
    estaNoIframe,
    abrirEmNovaAba,
    iniciarAutenticacao,
  };
}
