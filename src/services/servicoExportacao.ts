import { Historico, Devedor } from '../types';
import { formatarMoeda, formatarData } from '../lib/utils';
import { obterInfoContrato } from '../components/HistoricoLista/HistoricoLista';

export function gerarCSVHistorico(nomeDevedor: string, historico: Historico[], devedor?: Devedor): void {
  const cabecalho = ['Data', 'Tipo', 'Contrato / Referência', 'Dia Vencimento', 'Valor Total', 'Juros', 'Amortização', 'Saldo Restante', 'Observação'];
  
  const linhas = historico.map(h => {
    // Converter timestamp firebase para Date se necessário
    const dataObj = h.data?.toDate ? h.data.toDate() : new Date(h.data);

    let infoContrato = h.descricaoContrato || '';
    let diaVenc = h.diaVencimento ? `Dia ${h.diaVencimento}` : '';

    if (devedor) {
      const info = obterInfoContrato(h, devedor);
      if (info) {
        infoContrato = info.descricao;
        if (info.diaVencimento) diaVenc = `Dia ${info.diaVencimento}`;
      }
    }

    return [
      formatarData(dataObj),
      h.tipo,
      `"${(infoContrato || '-').replace(/"/g, '""')}"`,
      `"${(diaVenc || '-').replace(/"/g, '""')}"`,
      h.valorTotal.toString(),
      h.valorJuros.toString(),
      h.valorAmortizado.toString(),
      h.saldoRestante.toString(),
      `"${(h.observacao || '').replace(/"/g, '""')}"`
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
