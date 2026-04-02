import type { BillCategory } from '@/types/bill';

// ─── Description normalization ────────────────────────────────────────────────

export function normalizeDescription(raw: string): string {
  return raw
    .toLowerCase()
    // Strip trailing *SUFFIX (e.g. "amzn*abc123", "apple*subscription")
    .replace(/\*[a-z0-9]+$/gi, '')
    // Strip trailing #receipt codes
    .replace(/#[a-z0-9]+$/gi, '')
    // Strip trailing transaction ID numbers (space + 8+ digits)
    .replace(/\s+\d{8,}$/g, '')
    // Collapse multiple whitespace chars
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Merchant display name mapping ────────────────────────────────────────────

export const MERCHANT_MAP: Record<string, string> = {
  netflix: 'Netflix',
  spotify: 'Spotify',
  amazon: 'Amazon',
  amzn: 'Amazon',
  hulu: 'Hulu',
  'apple.com': 'Apple',
  'apple subscription': 'Apple',
  'apple services': 'Apple',
  google: 'Google',
  youtube: 'YouTube',
  disney: 'Disney+',
  paramount: 'Paramount+',
  peacock: 'Peacock',
  hbomax: 'Max',
  'max.com': 'Max',
  microsoft: 'Microsoft',
  adobe: 'Adobe',
  dropbox: 'Dropbox',
  github: 'GitHub',
  chatgpt: 'OpenAI',
  openai: 'OpenAI',
  'claude.ai': 'Anthropic',
  anthropic: 'Anthropic',
  notion: 'Notion',
  slack: 'Slack',
  zoom: 'Zoom',
  'amazon prime': 'Amazon Prime',
  audible: 'Audible',
  kindle: 'Kindle',
  icloud: 'iCloud',
  'one drive': 'OneDrive',
  onedrive: 'OneDrive',
};

export function toDisplayName(normalized: string): string {
  for (const [fragment, name] of Object.entries(MERCHANT_MAP)) {
    if (normalized.includes(fragment)) return name;
  }
  // Fallback: title-case
  return normalized.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Category inference ───────────────────────────────────────────────────────

export const CATEGORY_KEYWORDS: Record<BillCategory, string[]> = {
  subscriptions: [
    'netflix', 'spotify', 'hulu', 'disney', 'amazon prime', 'apple', 'youtube',
    'paramount', 'peacock', 'hbomax', 'max.com', 'chatgpt', 'openai', 'anthropic',
    'adobe', 'dropbox', 'github', 'microsoft 365', 'audible', 'kindle', 'icloud',
    'onedrive', 'notion', 'slack', 'zoom', 'subscription', 'streaming',
  ],
  utilities: [
    'electric', 'electricity', 'gas', 'water', 'internet', 'comcast', 'verizon',
    'att', 'at&t', 'xfinity', 'spectrum', 'tmobile', 't-mobile', 'utility',
  ],
  insurance: [
    'insurance', 'geico', 'progressive', 'allstate', 'lemonade', 'state farm',
    'statefarm', 'nationwide', 'aetna', 'humana', 'cigna', 'anthem',
  ],
  loans: [
    'loan', 'mortgage', 'student loan', 'navient', 'sallie mae', 'car payment',
    'auto loan', 'credit', 'finance charge',
  ],
  rent: ['rent', 'apartment', 'lease', 'property'],
  other: [],
};

export function inferCategory(normalized: string): BillCategory {
  const order: BillCategory[] = [
    'subscriptions', 'utilities', 'insurance', 'loans', 'rent',
  ];
  for (const cat of order) {
    const keywords = CATEGORY_KEYWORDS[cat];
    if (keywords.some((kw) => normalized.includes(kw))) return cat;
  }
  return 'subscriptions'; // default for this module — recurring charges are usually subscriptions
}
