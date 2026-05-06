/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import { logout } from './lib/firebase';
import { servicoDados } from './services/servicoDados';
import { Devedor } from './types';
import { cn } from './lib/utils';
import { 
  Plus, 
  ChevronDown,
  Check,
  ArrowUpZA,
  ArrowDownAZ,
  ArrowUpDown,
  Filter,
  X,
  TrendingUp,
  DollarSign,
  Calendar
} from 'lucide-react';
import { DevedorCard } from './components/DevedorCard';
import BottomSheet from './components/BottomSheet';
import FormDevedor from './components/FormDevedor';
import FormTransacao from './components/FormTransacao';
import HistoricoLista from './components/HistoricoLista';
import { DashboardHeader } from './components/DashboardHeader';
import { EmptyState } from './components/EmptyState';
import { LoginView } from './components/LoginView';
import { motion, AnimatePresence } from 'motion/react';
import { formatarMoeda } from './lib/utils';
// ... (mantenha os outros imports conforme estão)

export default function App() {
  const {
    user,
    loading,
    authError,
    setAuthError,
    devedores: devedoresFiltrados,
    totais,
    termoBusca,
    setTermoBusca,
    statusSelecionados,
    setStatusSelecionados,
    ordenacao,
    setOrdenacao,
    refresh
  } = useDashboardData();

// ... (states omitidos por brevidade, mantidos na implementação)
  const [isSearching, setIsSearching] = useState(false);
  const [modalNovoDevedor, setModalNovoDevedor] = useState(false);
  const [modalEditarDevedor, setModalEditarDevedor] = useState(false);
  const [selectedDevedor, setSelectedDevedor] = useState<Devedor | null>(null);
  const [modalPagamento, setModalPagamento] = useState(false);
  const [modalAporte, setModalAporte] = useState(false);
  const [modalHistorico, setModalHistorico] = useState(false);
  const [modalConfirmarExclusao, setModalConfirmarExclusao] = useState(false);
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const handleExcluir = async () => {
    if (!selectedDevedor) return;
    try {
      await servicoDados.excluirDevedor(selectedDevedor.id);
      setModalConfirmarExclusao(false);
      refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleStatus = (status: 'ATRASO' | 'DIA' | 'QUITADO') => {
    if (statusSelecionados.includes(status)) {
      if (statusSelecionados.length > 1) {
        setStatusSelecionados(statusSelecionados.filter(s => s !== status));
      }
    } else {
      setStatusSelecionados([...statusSelecionados, status]);
    }
  };

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

  if (!user) {
    return <LoginView error={authError} setError={setAuthError} />;
  }

  return (
    <div className="min-h-screen flex flex-col pb-12 text-giro-text bg-gray-50/50">
      <DashboardHeader 
        isSearching={isSearching}
        setIsSearching={setIsSearching}
        termoBusca={termoBusca}
        setTermoBusca={setTermoBusca}
        handleLogout={handleLogout}
      />

      <section className="bg-giro-primary text-white px-6 pb-8 pt-4 shadow-lg relative z-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 mb-0.5 opacity-60">
                <TrendingUp className="w-3 h-3" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Capital</span>
              </div>
              <span className="text-xl md:text-2xl font-black tracking-tighter">{formatarMoeda(totais.capitalNaRua)}</span>
            </div>
            
            <div className="flex flex-col border-l border-white/10 pl-4">
               <div className="flex items-center gap-1.5 mb-0.5 opacity-60">
                <DollarSign className="w-3 h-3 text-green-300" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Lucro</span>
              </div>
              <span className="text-xl md:text-2xl font-black tracking-tighter text-green-300">
                {formatarMoeda(totais.lucroRealizado)}
              </span>
            </div>

            <div className="hidden md:flex flex-col border-l border-white/10 pl-4">
               <div className="flex items-center gap-1.5 mb-0.5 opacity-60">
                <Calendar className="w-3 h-3" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Estimado</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-blue-200">
                {formatarMoeda(totais.lucroProjetado)}
              </span>
            </div>
          </div>
          
          <div className="mt-4 md:hidden flex items-center justify-between py-2 border-t border-white/5 text-[9px] font-bold opacity-60 uppercase tracking-widest">
            <span>Estimado Mensal</span>
            <span className="text-blue-200">{formatarMoeda(totais.lucroProjetado)}</span>
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 -mt-6">
        {/* Barra de Filtros Sticky */}
        <div className="sticky top-[52px] z-50 bg-gray-50/95 backdrop-blur-md py-4 px-2 mb-6 rounded-2xl flex items-center justify-between border border-transparent transition-all">
          <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-giro-text-muted">
            Clientes ({devedoresFiltrados.length})
          </h2>
          
          <div className="flex items-center gap-2">
            {/* Menu de Ordenação */}
            <div className="relative">
              <button 
                onClick={() => setIsSortOpen(!isSortOpen)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border shadow-sm",
                  ordenacao !== 'PRIORIDADE' ? "bg-blue-600 text-white border-blue-600 shadow-blue-600/20" : "bg-white text-giro-text border-gray-100 hover:border-gray-200"
                )}
              >
                {ordenacao === 'PRIORIDADE' ? <ArrowUpDown className="w-3.5 h-3.5" /> : ordenacao === 'VALOR_ALTO' ? <ArrowUpZA className="w-3.5 h-3.5" /> : <ArrowDownAZ className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Ordenar</span>
                <ChevronDown className={cn("hidden sm:inline w-3 h-3 transition-transform", isSortOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isSortOpen && (
                  <>
                    <div className="fixed inset-0 z-[100] bg-black/5" onClick={() => setIsSortOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[101] overflow-hidden py-1.5 p-1"
                    >
                      {(['PRIORIDADE', 'VALOR_ALTO', 'VALOR_BAIXO'] as const).map(o => (
                        <button
                          key={o}
                          onClick={() => { setOrdenacao(o); setIsSortOpen(false); }}
                          className={cn(
                            "w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-between",
                            ordenacao === o ? "bg-blue-600 text-white" : "text-giro-text-muted hover:bg-gray-50"
                          )}
                        >
                          {o === 'PRIORIDADE' ? 'Prazo' : o === 'VALOR_ALTO' ? 'Maior Saldo' : 'Menor Saldo'}
                          {ordenacao === o && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Menu de Filtro */}
            <div className="relative">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border shadow-sm",
                  statusSelecionados.length < 2 ? "bg-giro-primary text-white border-giro-primary shadow-giro-primary/20" : "bg-white text-giro-text border-gray-100 hover:border-gray-200"
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exibir</span>
                <ChevronDown className={cn("hidden sm:inline w-3 h-3 transition-transform", isFilterOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-[100] bg-black/5" onClick={() => setIsFilterOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[101] overflow-hidden py-3 px-4 flex flex-col gap-3"
                    >
                      <p className="text-[9px] font-black uppercase tracking-widest text-giro-text-muted">Status Disponíveis</p>
                      
                      <div className="flex flex-col gap-1">
                        {(['ATRASO', 'DIA', 'QUITADO'] as const).map(s => (
                          <label
                            key={s}
                            className="flex items-center justify-between py-2 cursor-pointer group"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-4 h-4 rounded-md border flex items-center justify-center transition-all",
                                statusSelecionados.includes(s) 
                                  ? "bg-giro-primary border-giro-primary text-white" 
                                  : "bg-white border-gray-200 group-hover:border-giro-primary"
                              )}>
                                {statusSelecionados.includes(s) && <Check className="w-3 h-3" />}
                              </div>
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider transition-colors",
                                statusSelecionados.includes(s) ? "text-giro-text" : "text-giro-text-muted"
                              )}>
                                {s === 'ATRASO' ? 'Atrasados' : s === 'DIA' ? 'Em Dia' : 'Quitados'}
                              </span>
                            </div>
                            <input 
                              type="checkbox" 
                              className="hidden" 
                              checked={statusSelecionados.includes(s)}
                              onChange={() => toggleStatus(s as any)}
                            />
                          </label>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="nu-card h-52 animate-pulse bg-gray-100" />
            ))}
          </div>
        ) : devedoresFiltrados.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devedoresFiltrados.map(d => (
              <DevedorCard 
                key={d.id} 
                devedor={d} 
                onPagar={(dev) => { setSelectedDevedor(dev); setModalPagamento(true); }}
                onAporte={(dev) => { setSelectedDevedor(dev); setModalAporte(true); }}
                onVerHistorico={(dev) => { setSelectedDevedor(dev); setModalHistorico(true); }}
                onEditar={(dev) => { setSelectedDevedor(dev); setModalEditarDevedor(true); }}
                onExcluir={(dev) => { setSelectedDevedor(dev); setModalConfirmarExclusao(true); }}
              />
            ))}
          </div>
        )}
      </main>

      <button 
        onClick={() => setModalNovoDevedor(true)}
        className="fixed bottom-8 right-6 w-16 h-16 bg-giro-primary text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all z-40"
      >
        <Plus className="w-8 h-8" />
      </button>

      <BottomSheet isOpen={modalNovoDevedor} onClose={() => setModalNovoDevedor(false)} title="Novo Devedor">
        <FormDevedor onSuccess={() => { setModalNovoDevedor(false); refresh(); }} />
      </BottomSheet>

      <BottomSheet isOpen={modalEditarDevedor} onClose={() => setModalEditarDevedor(false)} title="Editar Cadastro">
        {selectedDevedor && <FormDevedor devedorParaEditar={selectedDevedor} onSuccess={() => { setModalEditarDevedor(false); refresh(); }} />}
      </BottomSheet>

      <BottomSheet isOpen={modalPagamento} onClose={() => setModalPagamento(false)} title={`Receber de ${selectedDevedor?.nomeCompleto.split(' ')[0]}`}>
        {selectedDevedor && <FormTransacao devedor={selectedDevedor} tipo="PAGAMENTO" onSuccess={() => { setModalPagamento(false); refresh(); }} />}
      </BottomSheet>

      <BottomSheet isOpen={modalAporte} onClose={() => setModalAporte(false)} title={`Novo Aporte em ${selectedDevedor?.nomeCompleto.split(' ')[0]}`}>
        {selectedDevedor && <FormTransacao devedor={selectedDevedor} tipo="APORTE" onSuccess={() => { setModalAporte(false); refresh(); }} />}
      </BottomSheet>

      <BottomSheet isOpen={modalHistorico} onClose={() => setModalHistorico(false)} title="Histórico de Lançamentos">
        {selectedDevedor && <HistoricoLista devedor={selectedDevedor} />}
      </BottomSheet>

      <BottomSheet isOpen={modalConfirmarExclusao} onClose={() => setModalConfirmarExclusao(false)} title="Confirmar Exclusão">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
             <X className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-giro-text mb-2 uppercase tracking-tight">Deseja excluir?</h3>
          <p className="text-sm text-giro-text-muted mb-6">
            Você está removendo o cadastro de <span className="font-bold text-red-600">{selectedDevedor?.nomeCompleto}</span>. 
            Esta ação é permanente e removerá todo o histórico.
          </p>
          
          <div className="flex flex-col gap-3">
             <button 
               onClick={handleExcluir}
               className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-600/20 active:scale-95 transition-all"
             >
               Confirmar Exclusão
             </button>
             <button 
               onClick={() => setModalConfirmarExclusao(false)}
               className="w-full py-4 bg-gray-100 text-giro-text rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all"
             >
               Cancelar
             </button>
          </div>
        </div>
      </BottomSheet>

      <footer className="mt-8 mb-8 flex flex-col items-center justify-center gap-2 opacity-30">
        <div className="flex items-center gap-2">
          <div className="w-6 h-1 bg-giro-primary rounded-full"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Giro Dashboard</span>
        </div>
        <span className="text-[9px] font-bold">Versão 3.0.0 (SRP Architecture)</span>
      </footer>
    </div>
  );
}
