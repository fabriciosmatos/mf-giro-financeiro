import { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, verificarAutorizacao } from '../lib/firebase';
import { servicoDados } from '../services/servicoDados';
import { Devedor, Carteira } from '../types';
import { getProximoVencimento, getInfoStatus, getDataOrdenacao } from '../lib/financeiro/statusLogic';

export type StatusDebito = 'ATRASO' | 'DIA' | 'QUITADO';
export type TipoOrdenacao = 'PRIORIDADE' | 'VALOR_ALTO' | 'VALOR_BAIXO';

export function useDashboardData() {
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [devedores, setDevedores] = useState<Devedor[]>([]);
  const [carteiras, setCarteiras] = useState<Carteira[]>([]);
  const [carteiraAtivaId, setCarteiraAtivaIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('giro_carteira_ativa_id');
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [loadingCarteiras, setLoadingCarteiras] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [statusSelecionados, setStatusSelecionados] = useState<StatusDebito[]>(['ATRASO', 'DIA']);
  const [ordenacao, setOrdenacao] = useState<TipoOrdenacao>('PRIORIDADE');

  const setCarteiraAtivaId = (id: string | null) => {
    setCarteiraAtivaIdState(id);
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem('giro_carteira_ativa_id', id);
      } else {
        localStorage.removeItem('giro_carteira_ativa_id');
      }
    }
  };

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
        setCarteiras([]);
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      // Carregar Devedores (clientes)
      const dados = await servicoDados.listarDevedores();
      setDevedores(dados);

      // Carregar Carteiras (segmentações)
      const listaCarteiras = await servicoDados.listarCarteiras();
      setCarteiras(listaCarteiras);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function criarCarteira(nome: string) {
    setLoadingCarteiras(true);
    try {
      const id = await servicoDados.criarCarteira(nome);
      const listaCarteiras = await servicoDados.listarCarteiras();
      setCarteiras(listaCarteiras);
      return id;
    } catch (e) {
      console.error(e);
      throw e;
    } finally {
      setLoadingCarteiras(false);
    }
  }

  async function excluirCarteira(id: string) {
    setLoadingCarteiras(true);
    try {
      await servicoDados.excluirCarteira(id);
      if (carteiraAtivaId === id) {
        setCarteiraAtivaId(null);
      }
      const listaCarteiras = await servicoDados.listarCarteiras();
      setCarteiras(listaCarteiras);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCarteiras(false);
    }
  }

  async function editarNomeCarteira(id: string, novoNome: string) {
    setLoadingCarteiras(true);
    try {
      await servicoDados.editarNomeCarteira(id, novoNome);
      const listaCarteiras = await servicoDados.listarCarteiras();
      setCarteiras(listaCarteiras);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCarteiras(false);
    }
  }

  const totais = useMemo(() => {
    // Calcula totais aplicados apenas aos devedores da carteira ativa
    const devedoresCarteira = devedores.filter(d => {
      if (carteiraAtivaId === 'sem-carteira') {
        return !d.carteiraId;
      }
      return d.carteiraId === carteiraAtivaId;
    });

    const capitalNaRua = devedoresCarteira.reduce((acc, d) => acc + d.saldoDevedorAtual, 0);
    const lucroProjetado = devedoresCarteira.reduce((acc, d) => acc + (d.saldoDevedorAtual * (d.taxaJurosMensal / 100)), 0);
    const lucroRealizado = devedoresCarteira.reduce((acc, d) => acc + (d.totalLucroGerado || 0), 0);
    return { capitalNaRua, lucroProjetado, lucroRealizado };
  }, [devedores, carteiraAtivaId]);

  const devedoresFiltrados = useMemo(() => {
    // 1. Filtrar pela carteira ativa
    let filtrados = devedores;
    if (carteiraAtivaId) {
      if (carteiraAtivaId === 'sem-carteira') {
        filtrados = filtrados.filter(d => !d.carteiraId);
      } else {
        filtrados = filtrados.filter(d => d.carteiraId === carteiraAtivaId);
      }
    }

    // 2. Filtro de pesquisa textual
    filtrados = filtrados.filter(d => 
      d.nomeCompleto.toLowerCase().includes(termoBusca.toLowerCase())
    );

    // 3. Filtro por status selecionados
    filtrados = filtrados.filter(d => {
      const info = getInfoStatus(d);
      let status: StatusDebito;
      const temEmprestimos = d.emprestimos && d.emprestimos.length > 0;
      
      if (d.saldoDevedorAtual <= 0 && temEmprestimos) {
        status = 'QUITADO';
      } else {
        status = info.isAtrasado ? 'ATRASO' : 'DIA';
      }
      
      return statusSelecionados.includes(status);
    });

    return filtrados.sort((a, b) => {
      if (ordenacao === 'VALOR_ALTO') return b.saldoDevedorAtual - a.saldoDevedorAtual;
      if (ordenacao === 'VALOR_BAIXO') return a.saldoDevedorAtual - b.saldoDevedorAtual;
      
      const dateA = getDataOrdenacao(a);
      const dateB = getDataOrdenacao(b);
      
      if (dateA !== dateB) return dateA - dateB;
      
      const infoA = getInfoStatus(a);
      const infoB = getInfoStatus(b);
      if (infoA.prioridade !== infoB.prioridade) return infoA.prioridade - infoB.prioridade;
      
      return b.saldoDevedorAtual - a.saldoDevedorAtual;
    });
  }, [devedores, carteiraAtivaId, termoBusca, statusSelecionados, ordenacao]);

  return {
    user,
    loading: loading || isVerifying,
    authError,
    setAuthError,
    devedores: devedoresFiltrados,
    todosDevedores: devedores,
    carteiras,
    carteiraAtivaId,
    setCarteiraAtivaId,
    loadingCarteiras,
    criarCarteira,
    excluirCarteira,
    editarNomeCarteira,
    totais,
    termoBusca,
    setTermoBusca,
    statusSelecionados,
    setStatusSelecionados,
    ordenacao,
    setOrdenacao,
    refresh: carregarDados
  };
}
