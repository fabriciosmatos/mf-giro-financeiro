import { Historico } from '../types';
import { formatarMoeda, formatarData } from '../lib/utils';

export function gerarCSVHistorico(nomeDevedor: string, historico: Historico[]): void {
  const cabecalho = ['Data', 'Tipo', 'Valor Total', 'Juros', 'Amortização', 'Saldo Restante', 'Observação'];
  
  const linhas = historico.map(h => {
    // Converter timestamp firebase para Date se necessário
    const dataObj = h.data?.toDate ? h.data.toDate() : new Date(h.data);
    return [
      formatarData(dataObj),
      h.tipo,
      h.valorTotal.toString(),
      h.valorJuros.toString(),
      h.valorAmortizado.toString(),
      h.saldoRestante.toString(),
      `"${h.observacao.replace(/"/g, '""')}"`
    ].join(',');
  });

  const conteudo = [cabecalho.join(','), ...linhas].join('\n');
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `giro_historico_${nomeDevedor.toLowerCase().replace(/\s+/g, '_')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
