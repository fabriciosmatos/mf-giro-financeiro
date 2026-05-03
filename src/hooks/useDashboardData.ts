import { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, verificarAutorizacao } from '../lib/firebase';
import { servicoDados } from '../services/servicoDados';
import { Devedor } from '../types';
import { getProximoVencimento, getInfoStatus, getDataOrdenacao } from '../lib/financeiro/statusLogic';

export type FiltroStatus = 'TODOS' | 'ATRASO' | 'DIA' | 'QUITADO';
export type TipoOrdenacao = 'PRIORIDADE' | 'VALOR_ALTO' | 'VALOR_BAIXO';

export function useDashboardData() {
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [devedores, setDevedores] = useState<Devedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('TODOS');
  const [ordenacao, setOrdenacao] = useState<TipoOrdenacao>('PRIORIDADE');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u && u.email) {
        setIsVerifying(true);
        try {
          const autorizado = await verificarAutorizacao(u.email);
          if (autorizado) {
            setUser(u);
            setAuthError(null);
            carregarDados();
          } else {
            await signOut(auth);
            setUser(null);
            setAuthError(`O e-mail ${u.email} não possui autorização ativa para este sistema.`);
          }
        } catch (e) {
          console.error('Erro na autorização:', e);
          await signOut(auth);
          setUser(null);
          setAuthError('Erro ao verificar autorização de acesso.');
        } finally {
          setIsVerifying(false);
        }
      } else {
        setUser(null);
        setDevedores([]);
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      const dados = await servicoDados.listarDevedores();
      setDevedores(dados);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const totais = useMemo(() => {
    const capitalNaRua = devedores.reduce((acc, d) => acc + d.saldoDevedorAtual, 0);
    const lucroProjetado = devedores.reduce((acc, d) => acc + (d.saldoDevedorAtual * (d.taxaJurosMensal / 100)), 0);
    const lucroRealizado = devedores.reduce((acc, d) => acc + (d.totalLucroGerado || 0), 0);
    return { capitalNaRua, lucroProjetado, lucroRealizado };
  }, [devedores]);

  const devedoresFiltrados = useMemo(() => {
    let filtrados = devedores.filter(d => 
      d.nomeCompleto.toLowerCase().includes(termoBusca.toLowerCase())
    );

    if (filtroStatus !== 'TODOS') {
      filtrados = filtrados.filter(d => {
        const info = getInfoStatus(d);
        if (filtroStatus === 'QUITADO') return d.saldoDevedorAtual === 0;
        if (filtroStatus === 'ATRASO') return info.isAtrasado;
        if (filtroStatus === 'DIA') return !info.isAtrasado && d.saldoDevedorAtual > 0;
        return true;
      });
    }

    return filtrados.sort((a, b) => {
      if (ordenacao === 'VALOR_ALTO') return b.saldoDevedorAtual - a.saldoDevedorAtual;
      if (ordenacao === 'VALOR_BAIXO') return a.saldoDevedorAtual - b.saldoDevedorAtual;
      
      // PRIORIDADE: Pela data de ordenação (atrasados têm datas passadas, quitados têm Infinity)
      const dateA = getDataOrdenacao(a);
      const dateB = getDataOrdenacao(b);
      
      if (dateA !== dateB) return dateA - dateB;
      
      // Se mesma data, sort by priority (atrasado > hoje > etc)
      const infoA = getInfoStatus(a);
      const infoB = getInfoStatus(b);
      if (infoA.prioridade !== infoB.prioridade) return infoA.prioridade - infoB.prioridade;
      
      return b.saldoDevedorAtual - a.saldoDevedorAtual;
    });
  }, [devedores, termoBusca, filtroStatus, ordenacao]);

  return {
    user,
    loading: loading || isVerifying,
    authError,
    setAuthError,
    devedores: devedoresFiltrados,
    totais,
    termoBusca,
    setTermoBusca,
    filtroStatus,
    setFiltroStatus,
    ordenacao,
    setOrdenacao,
    refresh: carregarDados
  };
}
