export interface Devedor {
  id?: string;
  idDevedor?: string;
  ownerId: string;
  nomeCompleto: string;
  whatsapp: string;
  taxaJurosMensal: number;
  saldoDevedorAtual: number;
  totalLucroGerado: number;
  dataCriacao: any;
  diaVencimento?: number;
  ultimoPagamento?: any;
  endereco?: string;
  observacoes?: string;
}

export type TipoTransacao = 'PAGAMENTO' | 'APORTE';

export interface Historico {
  id?: string;
  data: any;
  tipo: TipoTransacao;
  valorTotal: number;
  valorJuros: number;
  valorAmortizado: number;
  saldoRestante: number;
  observacao: string;
}
