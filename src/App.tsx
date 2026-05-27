/**
 * Componente Principal de Guarda e Fluxo da Aplicação (App).
 * Direciona o fluxo do usuário baseado no estado de autenticação e carteira ativa.
 * Todas as nomenclaturas e funções estão rigorosamente em PORTUGUÊS.
 */

import React from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import { logout } from './lib/firebase';
import { TelaLogin } from './components/TelaLogin';
import { SeletorCarteiras } from './components/SeletorCarteiras';
import Painel from './components/Painel';
import { motion } from 'motion/react';

export default function App() {
  const {
    user,
    loading,
    authError,
    setAuthError,
    devedores: devedoresFiltrados,
    todosDevedores,
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
    refresh
  } = useDashboardData();

  const handleLogout = () => {
    logout();
  };

  // 1. Tela de Carregamento Inicial
  if (loading && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-giro-primary">
         <motion.div 
           animate={{ scale: [1, 1.1, 1] }} 
           transition={{ repeat: Infinity, duration: 1.5 }}
           className="text-white text-3xl font-bold italic"
         >
           Giro
         </motion.div>
      </div>
    );
  }

  // 2. Fluxo não autenticado: View de Login
  if (!user) {
    return <TelaLogin error={authError} setError={setAuthError} />;
  }

  // 3. Usuário autenticado, mas sem carteira escolhida
  if (user && !carteiraAtivaId) {
    return (
      <SeletorCarteiras 
        carteiras={carteiras}
        todosDevedores={todosDevedores}
        onSelectWallet={(id) => setCarteiraAtivaId(id)}
        onCreateWallet={criarCarteira}
        onDeleteWallet={excluirCarteira}
        onEditWalletName={editarNomeCarteira}
        loading={loadingCarteiras}
        onLogout={handleLogout}
        userEmail={user.email}
        refreshCarteiras={refresh}
      />
    );
  }

  // 4. Usuário autenticado e carteira ativa definida: Carrega o Painel Refatorado
  return (
    <Painel
      devedoresFiltrados={devedoresFiltrados}
      todosDevedores={todosDevedores}
      carteiras={carteiras}
      carteiraAtivaId={carteiraAtivaId}
      setCarteiraAtivaId={setCarteiraAtivaId}
      loading={loading}
      totais={totais}
      termoBusca={termoBusca}
      setTermoBusca={setTermoBusca}
      statusSelecionados={statusSelecionados}
      setStatusSelecionados={setStatusSelecionados}
      ordenacao={ordenacao}
      setOrdenacao={setOrdenacao}
      refresh={refresh}
      handleLogout={handleLogout}
    />
  );
}
