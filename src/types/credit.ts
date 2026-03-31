export interface CreditAccountSummary {
  id: string;
  orgName: string;
  name: string;
  balance: number;
  creditLimit: number | null;
  availableBalance: number | null;
  utilization: number | null;
  hasLimitData: boolean;
  balanceDate: string;
}

export interface OverallCreditStats {
  totalBalance: number;
  totalLimit: number;
  utilization: number | null;
  accountCount: number;
  accountsWithLimitData: number;
}

export interface CreditPaymentRecord {
  id: string;
  accountId: string;
  accountName: string;
  orgName: string;
  amount: number;
  posted: string;
  description: string;
}

export interface CreditSummaryResponse {
  accounts: CreditAccountSummary[];
  overall: OverallCreditStats;
  recentPayments: CreditPaymentRecord[];
  score: number | null;
}
