/**
 * Componente Visual Seletor de Carteiras (SeletorCarteiras).
 * Mantém apenas o design JSX consumindo dados do hook useSeletorCarteiras.
 * Todas as nomenclaturas, termos e textos estão rigorosamente em português.
 */

import React from 'react';
import { Carteira, Devedor } from '../../types';
import { useSeletorCarteiras } from './useSeletorCarteiras';
import { 
  calcularSaldoSemCarteira, 
  contarDevedoresSemCarteira, 
  calcularSaldoPorCarteira, 
  contarDevedoresPorCarteira 
} from './SeletorCarteiras.utils';
import { formatarMoeda } from '../../lib/utils';
import { 
  Wallet, 
  Plus, 
  Trash2, 
  LogOut, 
  Loader2, 
  Sparkles, 
  FolderDown 
} from 'lucide-react';

interface SeletorCarteirasProps {
  carteiras: Carteira[];
  todosDevedores: Devedor[];
  onSelectWallet: (id: string | null) => void;
  onCreateWallet: (nome: string) => Promise<string>;
  onDeleteWallet: (id: string) => Promise<void>;
  loading: boolean;
  onLogout: () => void;
  userEmail: string | null;
}

export function SeletorCarteiras({
  carteiras,
  todosDevedores,
  onSelectWallet,
  onCreateWallet,
  onDeleteWallet,
  loading,
  onLogout,
  userEmail,
}: SeletorCarteirasProps) {
  const {
    novaCarteiraNome,
    setNovaCarteiraNome,
    estaCriando,
    idConfirmarExclusao,
    setIdConfirmarExclusao,
    lidarComCriacao,
    lidarComExclusao,
  } = useSeletorCarteiras({
    onCreateWallet,
    onDeleteWallet,
  });

  const qtdeSemCarteira = contarDevedoresSemCarteira(todosDevedores);
  const saldoSemCarteira = calcularSaldoSemCarteira(todosDevedores);

  return (
    <div className="min-h-screen bg-gray-50/50 text-giro-text flex flex-col pb-12">
      {/* Topo / Perfil */}
      <header className="bg-giro-primary text-white py-4 px-6 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight italic">Giro</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] sm:text-xs font-bold text-white/80 hidden sm:inline-block">
              {userEmail}
            </span>
            <button
              onClick={onLogout}
              className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-white cursor-pointer"
              title="Sair do sistema"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 pt-10">
        <div className="mb-8">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-giro-primary bg-giro-primary/10 px-2.5 py-1 rounded-full">
            Selecione ou Crie
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-giro-text mt-3">
            Minhas Carteiras
          </h1>
          <p className="text-sm text-giro-text-muted mt-1.5 max-w-lg">
            Escolha uma segmentação de investimento para operar seus lançamentos e taxas neste momento.
          </p>
        </div>

        {/* Grid de Carteiras */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card: Clientes Sem Carteira */}
          <div
            onClick={() => onSelectWallet('sem-carteira')}
            className="nu-card bg-white border border-gray-100 hover:border-giro-primary/50 cursor-pointer shadow-sm hover:shadow-md transition-all flex flex-col justify-between p-6 group h-44 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500/70" />
            <div className="flex items-start justify-between">
              <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                <FolderDown className="w-6 h-6 animate-pulse" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/50">
                Geral
              </span>
            </div>
            <div className="mt-4">
              <h3 className="font-black text-giro-text text-sm leading-tight uppercase group-hover:text-giro-primary transition-colors">
                Geral
              </h3>
            </div>
            <div className="flex items-end justify-between border-t border-gray-50 pt-2.5 mt-2.5">
              <span className="text-[10px] font-bold text-giro-text-muted">
                {qtdeSemCarteira} {qtdeSemCarteira === 1 ? 'cliente' : 'clientes'}
              </span>
              <span className="text-sm font-black text-amber-600 font-mono">
                {formatarMoeda(saldoSemCarteira)}
              </span>
            </div>
          </div>

          {/* Custom user portfolios */}
          {carteiras.map(c => {
            const count = contarDevedoresPorCarteira(todosDevedores, c.id);
            const totalSaldo = calcularSaldoPorCarteira(todosDevedores, c.id);
            const isConfirming = idConfirmarExclusao === c.id;

            return (
              <div
                key={c.id}
                onClick={() => !isConfirming && onSelectWallet(c.id)}
                className="nu-card bg-white border border-gray-100 hover:border-giro-primary/50 cursor-pointer shadow-sm hover:shadow-md transition-all flex flex-col justify-between p-6 group h-44 relative"
              >
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-giro-primary/5 rounded-xl text-giro-primary">
                    <Wallet className="w-6 h-6" />
                  </div>

                  {isConfirming ? (
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={(e) => lidarComExclusao(c.id, e)}
                        className="text-[8px] font-black uppercase py-1 px-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors cursor-pointer"
                      >
                        Sim
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setIdConfirmarExclusao(null); }}
                        className="text-[8px] font-black uppercase py-1 px-2 bg-gray-100 text-giro-text rounded-md hover:bg-gray-200 transition-colors cursor-pointer"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIdConfirmarExclusao(c.id);
                      }}
                      className="p-2 text-giro-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                      title="Excluir Carteira"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="mt-3">
                  <h3 className="font-black text-giro-text text-sm leading-tight uppercase group-hover:text-giro-primary transition-colors truncate">
                    {c.nome}
                  </h3>
                </div>

                <div className="flex items-end justify-between border-t border-gray-50 pt-2.5 mt-2.5">
                  <span className="text-[10px] font-bold text-giro-text-muted">
                    {count} {count === 1 ? 'cliente' : 'clientes'}
                  </span>
                  <span className="text-sm font-black text-giro-primary font-mono">
                    {formatarMoeda(totalSaldo)}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Form Card: Criar Nova Carteira */}
          <div className="nu-card bg-gray-50/50 border border-dashed border-gray-300 flex flex-col justify-center p-6 h-44 relative">
            <form onSubmit={lidarComCriacao} className="flex flex-col h-full justify-between">
              <div>
                <span className="text-[8px] font-black text-giro-primary uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 animate-bounce" /> Criar Carteira
                </span>
                <input
                  type="text"
                  required
                  placeholder="Nome Ex: Consórcios"
                  value={novaCarteiraNome}
                  onChange={e => setNovaCarteiraNome(e.target.value)}
                  disabled={estaCriando}
                  className="w-full mt-3 p-3 bg-white rounded-xl border border-gray-200 text-xs font-bold outline-none focus:ring-2 focus:ring-giro-primary focus:border-transparent transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={estaCriando || !novaCarteiraNome.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-giro-primary text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all hover:bg-giro-primary-dark active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {estaCriando ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="mt-16 text-center opacity-30 select-none flex flex-col items-center justify-center gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-1 bg-giro-primary rounded-full"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Giro Dashboard</span>
        </div>
        <span className="text-[9px] font-bold">Versão 3.2.0</span>
      </footer>
    </div>
  );
}
