export interface AccountMeta {
  _id: string;                        // matches accounts._id
  statementClosingDay: number | null; // 1–31, null = not configured
  targetUtilization: number;          // 0–1, default from env
  manualCreditLimit: number | null;   // manually entered limit (used when SimpleFIN doesn't provide one)
  customOrgName?: string | null;      // user-set display name overriding inferOrgName()
}

export interface UtilizationDataPoint {
  date: string;           // YYYY-MM-DD
  utilization: number;    // 0–1 aggregate
  totalBalance: number;
}

export interface AZEOCard {
  accountId: string;
  accountName: string;
  currentBalance: number;
  creditLimit: number;
  currentUtilization: number;
  targetBalance: number;
  targetUtilization: number;
  paydownNeeded: number;
  isAnchor: boolean;
  statementClosingDay: number | null;
  daysUntilClose: number | null;
  alertActive: boolean;   // true when within CREDIT_ALERT_DAYS of close
}

export interface AZEOPlan {
  anchorCard: {
    accountId: string;
    accountName: string;
    creditLimit: number;
    targetBalance: number;
    targetUtilization: number;
  };
  cards: AZEOCard[];
  projectedOverallUtilization: number;
  projectedScore: number | null;
}

export interface CreditAdvisorResponse {
  trend: UtilizationDataPoint[];
  azeo: AZEOPlan | null;
}

export interface CreditSettingsEntry {
  accountId: string;
  accountName: string;
  statementClosingDay: number | null;
  targetUtilization: number;
  manualCreditLimit: number | null;
}

export interface CreditSettingsResponse {
  settings: CreditSettingsEntry[];
}

export interface SaveCreditSettingsDto {
  settings: Array<{
    accountId: string;
    statementClosingDay: number | null;
    targetUtilization: number;
    manualCreditLimit: number | null;
  }>;
}

export interface StatementAlertPayload {
  accountId: string;
  accountName: string;
  currentBalance: number;
  creditLimit: number;
  currentUtilization: number;
  targetBalance: number;
  targetUtilization: number;
  paydownToTarget: number;
  closeDate: Date;
  daysUntilClose: number;
  isAnchorCard: boolean;
  totalCards: number;
}

export interface CreditUtilizationAlertPayload {
  accountId: string;
  accountName: string;
  currentBalance: number;
  creditLimit: number;
  utilization: number;
  paydownTo30Pct: number;
}
