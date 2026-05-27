import React from 'react';
import { Devedor } from '../../types';
import { formatarMoeda, formatarData, cn } from '../../lib/utils';
import { Download } from 'lucide-react';
import { gerarCSVHistorico } from '../../services/servicoExportacao';
import { useHistoricoLista } from './useHistoricoLista';

interface HistoricoListaProps {
  devedor: Devedor;
}

export function HistoricoLista({ devedor }: HistoricoListaProps) {
  const { historico, carregando } = useHistoricoLista({ devedor });

  if (carregando) {
    return <div className="p-10 text-center text-giro-text-muted">Carregando histórico...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-giro-text-muted">{historico.length} lançamentos</span>
        <button 
          onClick={() => gerarCSVHistorico(devedor.nomeCompleto, historico)}
          className="flex items-center gap-1 text-sm text-giro-primary font-semibold hover:underline cursor-pointer"
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
              <div key={h.id} className="border-b border-gray-100 pb-3 last:border-0 text-giro-text">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <span className={cn(
                      "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mr-2",
                      h.tipo === 'PAGAMENTO' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {h.tipo === 'PAGAMENTO' ? 'Recebimento' : 'Aporte'}
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
                {(h.criadoPorNome || h.criadoPorEmail) && (
                  <div className="text-[9px] text-giro-primary font-bold mt-0.5">
                    Operado por: {h.criadoPorNome || h.criadoPorEmail}
                  </div>
                )}
                <div className="text-[10px] text-right text-gray-400">Saldo: {formatarMoeda(h.saldoRestante)}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
