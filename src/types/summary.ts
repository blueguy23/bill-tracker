export interface MerchantStat {
  merchant: string;
  total: number;
  count: number;
}

export interface SummaryResponse {
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
  topMerchants: MerchantStat[];
}
