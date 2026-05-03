import React, { useState } from 'react';
import { TrendingUp, Search, LogOut, User as UserIcon } from 'lucide-react';
import { formatarMoeda, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardHeaderProps {
  isSearching: boolean;
  setIsSearching: (val: boolean) => void;
  termoBusca: string;
  setTermoBusca: (val: string) => void;
  handleLogout: () => void;
}

export function DashboardHeader({
  isSearching,
  setIsSearching,
  termoBusca,
  setTermoBusca,
  handleLogout
}: DashboardHeaderProps) {
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <header className="sticky top-0 z-[60] bg-giro-primary text-white py-3 px-6 shadow-md transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight italic">Giro</span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setIsSearching(!isSearching);
              if (isSearching) setTermoBusca('');
            }} 
            className={cn("p-2 rounded-xl transition-colors", isSearching ? "bg-white/20" : "hover:bg-white/10")}
          >
            <Search className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => {
              if (confirmLogout) {
                handleLogout();
              } else {
                setConfirmLogout(true);
                // Reset after 3 seconds if not clicked again
                setTimeout(() => setConfirmLogout(false), 3000);
              }
            }} 
            className={cn(
              "flex items-center gap-2 px-2 py-2 rounded-xl transition-all duration-300",
              confirmLogout ? "bg-red-500 text-white shadow-lg scale-105" : "hover:bg-white/10"
            )}
            title={confirmLogout ? "Clique novamente para sair" : "Sair do sistema"}
          >
            {confirmLogout ? (
              <>
                <LogOut className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-tighter">Sair?</span>
              </>
            ) : (
              <LogOut className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isSearching && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3 max-w-2xl mx-auto"
          >
            <div className="relative p-1">
              <input 
                autoFocus
                type="text" 
                placeholder="Buscar devedor..."
                value={termoBusca}
                onChange={e => setTermoBusca(e.target.value)}
                className="w-full bg-white/15 border-0 rounded-2xl py-2.5 pl-4 pr-10 text-white placeholder:text-white/40 focus:ring-2 focus:ring-white/30 transition-all outline-none text-sm"
              />
              {termoBusca && (
                 <button 
                  onClick={() => setTermoBusca('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 text-xs font-bold"
                 >
                   LIMPAR
                 </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
