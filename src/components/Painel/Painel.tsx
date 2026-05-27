/**
 * Componente Visual Painel.
 * Representa a casca visual (UI), consumindo estados do hook customizado usePainel.
 * Todas as nomenclaturas, comentários e textos estão em português.
 */

import React from 'react';
import { Devedor, Carteira } from '../../types';
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
import { CartaoDevedor } from '../CartaoDevedor';
import PainelRetratil from '../PainelRetratil';
import { FormularioDevedor } from '../FormularioDevedor';
import { FormularioTransacao } from '../FormularioTransacao';
import HistoricoLista from '../HistoricoLista';
import { CabecalhoPainel } from '../CabecalhoPainel';
import { EstadoVazio } from '../EstadoVazio';
import { motion, AnimatePresence } from 'motion/react';
import { formatarMoeda, cn } from '../../lib/utils';
import { usePainel } from './usePainel';
import { obterNomeCarteira, obterCarteiraDoDevedor } from './Painel.utils';

// Tipo para ordenação suportado no dashboard
type TipoOrdenacao = 'PRIORIDADE' | 'VALOR_ALTO' | 'VALOR_BAIXO';

interface PainelProps {
  // Dados globais fornecidos pelo serviço/hook de dados
  devedoresFiltrados: Devedor[];
  todosDevedores: Devedor[];
  carteiras: Carteira[];
  carteiraAtivaId: string | null;
  setCarteiraAtivaId: (id: string | null) => void;
  loading: boolean;
  totais: {
    capitalNaRua: number;
    lucroProjetado: number;
    lucroRealizado: number;
  };
  termoBusca: string;
  setTermoBusca: (val: string) => void;
  statusSelecionados: ('ATRASO' | 'DIA' | 'QUITADO')[];
  setStatusSelecionados: (status: ('ATRASO' | 'DIA' | 'QUITADO')[]) => void;
  ordenacao: TipoOrdenacao;
  setOrdenacao: (ord: TipoOrdenacao) => void;
  refresh: () => Promise<void>;
  handleLogout: () => void;
}

export function Painel({
  devedoresFiltrados,
  todosDevedores,
  carteiras,
  carteiraAtivaId,
  setCarteiraAtivaId,
  loading,
  totais,
  termoBusca,
  setTermoBusca,
  statusSelecionados,
  setStatusSelecionados,
  ordenacao,
  setOrdenacao,
  refresh,
  handleLogout,
}: PainelProps) {
  // Instanciando o Hook Customizado do Painel (Lógica de Apresentação)
  const {
    estaBuscando,
    setEstaBuscando,
    modalNovoDevedor,
    setModalNovoDevedor,
    modalEditarDevedor,
    setModalEditarDevedor,
    devedorSelecionado,
    setDevedorSelecionado,
    modalPagamento,
    setModalPagamento,
    modalAporte,
    setModalAporte,
    modalHistorico,
    setModalHistorico,
    modalConfirmarExclusao,
    setModalConfirmarExclusao,
    filtroAberto,
    setFiltroAberto,
    ordenacaoAberta,
    setOrdenacaoAberta,
    tratarExcluirCliente,
    alternarFiltroStatus
  } = usePainel({
    statusSelecionados,
    setStatusSelecionados,
    refresh
  });

  const carteiraAtivaNome = obterNomeCarteira(carteiraAtivaId, carteiras);

  return (
    <div className="min-h-screen flex flex-col pb-12 text-giro-text bg-gray-50/50">
      <CabecalhoPainel 
        isSearching={estaBuscando}
        setIsSearching={setEstaBuscando}
        termoBusca={termoBusca}
        setTermoBusca={setTermoBusca}
        handleLogout={handleLogout}
        carteiraAtivaNome={carteiraAtivaNome}
        onTrocarCarteira={() => setCarteiraAtivaId(null)}
      />

      {/* Seção Resumo Financeiro da Carteira */}
      <section className="bg-giro-primary text-white px-6 pb-8 pt-4 shadow-lg relative z-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 mb-0.5 opacity-60">
                <TrendingUp className="w-3 h-3" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Capital</span>
              </div>
              <span className="text-xl md:text-2xl font-black tracking-tighter">
                {formatarMoeda(totais.capitalNaRua)}
              </span>
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

      {/* Conteúdo Principal do Grid */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 -mt-6">
        {/* Barra de Filtros e Ordenamento Sticky */}
        <div className="sticky top-[52px] z-50 bg-gray-50/95 backdrop-blur-md py-4 px-2 mb-6 rounded-2xl flex items-center justify-between border border-transparent transition-all">
          <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-giro-text-muted">
            Clientes ({devedoresFiltrados.length})
          </h2>
          
          <div className="flex items-center gap-2">
            {/* Seletor de Ordenação */}
            <div className="relative">
              <button 
                onClick={() => setOrdenacaoAberta(!ordenacaoAberta)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border shadow-sm cursor-pointer",
                  ordenacao !== 'PRIORIDADE' ? "bg-blue-600 text-white border-blue-600 shadow-blue-600/20" : "bg-white text-giro-text border-gray-100 hover:border-gray-200"
                )}
              >
                {ordenacao === 'PRIORIDADE' ? (
                  <ArrowUpDown className="w-3.5 h-3.5" />
                ) : ordenacao === 'VALOR_ALTO' ? (
                  <ArrowUpZA className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownAZ className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Ordenar</span>
                <ChevronDown className={cn("hidden sm:inline w-3 h-3 transition-transform", ordenacaoAberta && "rotate-180")} />
              </button>

              <AnimatePresence>
                {ordenacaoAberta && (
                  <>
                    <div className="fixed inset-0 z-[100] bg-black/5" onClick={() => setOrdenacaoAberta(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[101] overflow-hidden py-1.5 p-1"
                    >
                      {(['PRIORIDADE', 'VALOR_ALTO', 'VALOR_BAIXO'] as const).map(opcao => (
                        <button
                          key={opcao}
                          onClick={() => { setOrdenacao(opcao); setOrdenacaoAberta(false); }}
                          className={cn(
                            "w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-between cursor-pointer",
                            ordenacao === opcao ? "bg-blue-600 text-white" : "text-giro-text-muted hover:bg-gray-50"
                          )}
                        >
                          {opcao === 'PRIORIDADE' ? 'Prazo' : opcao === 'VALOR_ALTO' ? 'Maior Saldo' : 'Menor Saldo'}
                          {ordenacao === opcao && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Menu de Filtros por Status */}
            <div className="relative">
              <button 
                onClick={() => setFiltroAberto(!filtroAberto)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border shadow-sm cursor-pointer",
                  statusSelecionados.length < 2 ? "bg-giro-primary text-white border-giro-primary shadow-giro-primary/20" : "bg-white text-giro-text border-gray-100 hover:border-gray-200"
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exibir</span>
                <ChevronDown className={cn("hidden sm:inline w-3 h-3 transition-transform", filtroAberto && "rotate-180")} />
              </button>

              <AnimatePresence>
                {filtroAberto && (
                  <>
                    <div className="fixed inset-0 z-[100] bg-black/5" onClick={() => setFiltroAberto(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[101] overflow-hidden py-3 px-4 flex flex-col gap-3"
                    >
                      <p className="text-[9px] font-black uppercase tracking-widest text-giro-text-muted">Status Disponíveis</p>
                      
                      <div className="flex flex-col gap-1">
                        {(['ATRASO', 'DIA', 'QUITADO'] as const).map(status => (
                          <label
                            key={status}
                            className="flex items-center justify-between py-2 cursor-pointer group"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-3 font-bold select-none">
                              <div className={cn(
                                "w-4 h-4 rounded-md border flex items-center justify-center transition-all",
                                statusSelecionados.includes(status) 
                                  ? "bg-giro-primary border-giro-primary text-white" 
                                  : "bg-white border-gray-200 group-hover:border-giro-primary"
                              )}>
                                {statusSelecionados.includes(status) && <Check className="w-3 h-3" />}
                              </div>
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider transition-colors",
                                statusSelecionados.includes(status) ? "text-giro-text" : "text-giro-text-muted"
                              )}>
                                {status === 'ATRASO' ? 'Atrasados' : status === 'DIA' ? 'Em Dia' : 'Quitados'}
                              </span>
                            </div>
                            <input 
                              type="checkbox" 
                              className="hidden" 
                              checked={statusSelecionados.includes(status)}
                              onChange={() => alternarFiltroStatus(status)}
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

        {/* Display da Lista ou Skeletons */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(indice => (
              <div key={indice} className="nu-card h-52 animate-pulse bg-gray-100 rounded-2xl" />
            ))}
          </div>
        ) : devedoresFiltrados.length === 0 ? (
          <EstadoVazio />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devedoresFiltrados.map(devedor => {
              const carteiraNome = obterCarteiraDoDevedor(devedor, carteiras);
              return (
                <CartaoDevedor 
                  key={devedor.id} 
                  devedor={devedor} 
                  carteiraNome={carteiraNome}
                  onPagar={(dev) => { setDevedorSelecionado(dev); setModalPagamento(true); }}
                  onAporte={(dev) => { setDevedorSelecionado(dev); setModalAporte(true); }}
                  onVerHistorico={(dev) => { setDevedorSelecionado(dev); setModalHistorico(true); }}
                  onEditar={(dev) => { setDevedorSelecionado(dev); setModalEditarDevedor(true); }}
                  onExcluir={(dev) => { setDevedorSelecionado(dev); setModalConfirmarExclusao(true); }}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Botão de Registro Rápido */}
      <button 
        onClick={() => setModalNovoDevedor(true)}
        className="fixed bottom-8 right-6 w-16 h-16 bg-giro-primary text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all z-40 cursor-pointer"
        title="Adicionar Novo Devedor"
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* Modais de Fluxos Autocontidos */}
      <PainelRetratil isOpen={modalNovoDevedor} onClose={() => setModalNovoDevedor(false)} title="Novo Devedor">
        <FormularioDevedor 
          carteiras={carteiras}
          carteiraAtivaId={carteiraAtivaId}
          onSuccess={() => { setModalNovoDevedor(false); refresh(); }} 
        />
      </PainelRetratil>

      <PainelRetratil isOpen={modalEditarDevedor} onClose={() => setModalEditarDevedor(false)} title="Editar Cadastro">
        {devedorSelecionado && (
          <FormularioDevedor 
            devedorParaEditar={devedorSelecionado} 
            carteiras={carteiras}
            carteiraAtivaId={carteiraAtivaId}
            onSuccess={() => { setModalEditarDevedor(false); refresh(); }} 
          />
        )}
      </PainelRetratil>

      <PainelRetratil isOpen={modalPagamento} onClose={() => setModalPagamento(false)} title={`Receber de ${devedorSelecionado?.nomeCompleto.split(' ')[0]}`}>
        {devedorSelecionado && (
          <FormularioTransacao 
            devedor={devedorSelecionado} 
            tipo="PAGAMENTO" 
            onSuccess={() => { setModalPagamento(false); refresh(); }} 
          />
        )}
      </PainelRetratil>

      <PainelRetratil isOpen={modalAporte} onClose={() => setModalAporte(false)} title={`Novo Aporte em ${devedorSelecionado?.nomeCompleto.split(' ')[0]}`}>
        {devedorSelecionado && (
          <FormularioTransacao 
            devedor={devedorSelecionado} 
            tipo="APORTE" 
            onSuccess={() => { setModalAporte(false); refresh(); }} 
          />
        )}
      </PainelRetratil>

      <PainelRetratil isOpen={modalHistorico} onClose={() => setModalHistorico(false)} title="Histórico de Lançamentos">
        {devedorSelecionado && (
          <HistoricoLista devedor={devedorSelecionado} />
        )}
      </PainelRetratil>

      <PainelRetratil isOpen={modalConfirmarExclusao} onClose={() => setModalConfirmarExclusao(false)} title="Confirmar Exclusão">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
             <X className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-giro-text mb-2 uppercase tracking-tight">Deseja excluir?</h3>
          <p className="text-sm text-giro-text-muted mb-6">
            Você está removendo o cadastro de <span className="font-bold text-red-600">{devedorSelecionado?.nomeCompleto}</span>. 
            Esta ação é permanente e removerá todo o histórico.
          </p>
          
          <div className="flex flex-col gap-3">
             <button 
               onClick={tratarExcluirCliente}
               className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-600/20 active:scale-95 transition-all cursor-pointer"
             >
               Confirmar Exclusão
             </button>
             <button 
               onClick={() => setModalConfirmarExclusao(false)}
               className="w-full py-4 bg-gray-100 text-giro-text rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all cursor-pointer"
             >
               Cancelar
             </button>
          </div>
        </div>
      </PainelRetratil>

      {/* Rodapé institucional */}
      <footer className="mt-8 mb-8 flex flex-col items-center justify-center gap-2 opacity-30 select-none">
        <div className="flex items-center gap-2">
          <div className="w-6 h-1 bg-giro-primary rounded-full"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Giro Dashboard</span>
        </div>
        <span className="text-[9px] font-bold">Versão 3.2.0</span>
      </footer>
    </div>
  );
}
