import React, { useState, useEffect } from 'react';
import { Devedor, Historico } from '../types';
import { formatarMoeda, formatarData, cn } from '../lib/utils';
import { Download } from 'lucide-react';
import { servicoDados } from '../services/servicoDados';
import { gerarCSVHistorico } from '../services/servicoExportacao';

interface HistoricoListaProps {
  devedor: Devedor;
}

export default function HistoricoLista({ devedor }: HistoricoListaProps) {
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      if (!devedor.id) return;
      const dados = await servicoDados.listarHistorico(devedor.id);
      setHistorico(dados);
      setLoading(false);
    }
    carregar();
  }, [devedor.id]);

  if (loading) return <div className="p-10 text-center text-giro-text-muted">Carregando histórico...</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-giro-text-muted">{historico.length} lançamentos</span>
        <button 
          onClick={() => gerarCSVHistorico(devedor.nomeCompleto, historico)}
          className="flex items-center gap-1 text-sm text-giro-primary font-semibold hover:underline"
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {historico.length === 0 ? (
          <div className="text-center py-6 text-giro-text-muted">Nenhum registro encontrado.</div>
        ) : (
          historico.map(h => {
             const dataObj = h.data?.toDate ? h.data.toDate() : new Date(h.data);
             return (
              <div key={h.id} className="border-b border-gray-100 pb-3 last:border-0">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <span className={cn(
                      "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mr-2",
                      h.tipo === 'PAGAMENTO' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {h.tipo}
                    </span>
                    <span className="text-xs text-giro-text-muted">{formatarData(dataObj)}</span>
                  </div>
                  <span className={cn(
                    "font-bold",
                    h.tipo === 'PAGAMENTO' ? "text-green-600" : "text-blue-600"
                  )}>
                    {h.tipo === 'PAGAMENTO' ? '-' : '+'}{formatarMoeda(h.valorTotal)}
                  </span>
                </div>
                {h.tipo === 'PAGAMENTO' && (
                  <div className="text-[10px] text-giro-text-muted mb-1">
                    Juros: {formatarMoeda(h.valorJuros)} | Amortização: {formatarMoeda(h.valorAmortizado)}
                  </div>
                )}
                <div className="text-sm text-giro-text-muted">{h.observacao || 'Sem observação'}</div>
                <div className="text-[10px] text-right text-gray-400">Saldo: {formatarMoeda(h.saldoRestante)}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
