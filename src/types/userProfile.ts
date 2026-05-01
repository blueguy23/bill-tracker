export interface UserProfile {
  _id: 'singleton';
  displayName: string;
  payday: number | null;
  currency: string;
  timezone: string;
  theme: 'dark' | 'light' | 'auto';
  defaultDateRange: '7d' | '30d' | '90d' | '1y';
  hideTransfers: boolean;
  compactRows: boolean;
  numberFormat: 'en-US' | 'en-GB' | 'de-DE';
}

export type UserProfilePatch = Partial<Omit<UserProfile, '_id'>>;
