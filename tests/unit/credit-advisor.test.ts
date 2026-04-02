import { describe, it, expect } from 'vitest';
import { computeUtilizationTrend, computeAZEO, nextStatementCloseDate } from '@/handlers/creditAdvisor';
import type { Account, Transaction } from '@/lib/simplefin/types';
import type { AccountMeta } from '@/types/creditAdvisor';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    _id: 'acct-1',
    orgName: 'Test Bank',
    name: 'Visa',
    currency: 'USD',
    balance: 500,
    availableBalance: 1500,
    balanceDate: new Date(),
    accountType: 'credit',
    lastSyncedAt: new Date(),
    ...overrides,
  };
}

function makeTxn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    _id: 'txn-1',
    accountId: 'acct-1',
    posted: new Date(),
    amount: -50,
    description: 'Payment',
    memo: null,
    pending: false,
    importedAt: new Date(),
    ...overrides,
  };
}

function makeMeta(overrides: Partial<AccountMeta> = {}): AccountMeta {
  return { _id: 'acct-1', statementClosingDay: null, targetUtilization: 0.05, ...overrides };
}

// ── computeUtilizationTrend ───────────────────────────────────────────────────

describe('computeUtilizationTrend', () => {
  it('should return 30 data points for the last 30 days', () => {
    const account = makeAccount({ balance: 500, availableBalance: 1500 });
    const result = computeUtilizationTrend([account], []);
    expect(result).toHaveLength(30);
    expect(result[0]).toHaveProperty('date');
    expect(result[0]).toHaveProperty('utilization');
    expect(result[0]).toHaveProperty('totalBalance');
  });

  it('should reconstruct a higher past balance when purchases occurred after that date', () => {
    const account = makeAccount({ balance: 600, availableBalance: 1400 }); // limit = 2000, current bal = 600
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    // A $100 purchase posted yesterday — before that, balance was 500
    const purchase = makeTxn({ amount: 100, posted: yesterday, pending: false });
    const result = computeUtilizationTrend([account], [purchase]);
    // Day before yesterday should show balance = 600 - 100 = 500 → util = 500/2000 = 0.25
    const twoDaysAgo = result[result.length - 2]!;
    expect(twoDaysAgo.utilization).toBeCloseTo(500 / 2000, 2);
  });

  it('should reconstruct a lower past balance when payments occurred after that date', () => {
    const account = makeAccount({ balance: 300, availableBalance: 1700 }); // limit = 2000, current bal = 300
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    // A -$200 payment posted yesterday — before that, balance was 500
    const payment = makeTxn({ amount: -200, posted: yesterday, pending: false });
    const result = computeUtilizationTrend([account], [payment]);
    const twoDaysAgo = result[result.length - 2]!;
    expect(twoDaysAgo.utilization).toBeCloseTo(500 / 2000, 2);
  });

  it('should return empty array when no accounts have limit data', () => {
    const account = makeAccount({ availableBalance: null });
    expect(computeUtilizationTrend([account], [])).toEqual([]);
  });

  it('should exclude pending transactions from reconstruction', () => {
    const account = makeAccount({ balance: 500, availableBalance: 1500 });
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const pending = makeTxn({ amount: 100, posted: yesterday, pending: true });
    const result = computeUtilizationTrend([account], [pending]);
    // Pending txn excluded — all points should reflect current balance only
    result.forEach((p) => {
      expect(p.utilization).toBeCloseTo(500 / 2000, 2);
    });
  });

  it('should aggregate utilization across multiple cards weighted by credit limit', () => {
    const card1 = makeAccount({ _id: 'a1', balance: 1000, availableBalance: 1000 }); // limit 2000, util 50%
    const card2 = makeAccount({ _id: 'a2', balance: 200, availableBalance: 1800 });  // limit 2000, util 10%
    const result = computeUtilizationTrend([card1, card2], []);
    // Total balance 1200, total limit 4000 → 30%
    const today = result[result.length - 1]!;
    expect(today.utilization).toBeCloseTo(1200 / 4000, 2);
  });
});

// ── computeAZEO ───────────────────────────────────────────────────────────────

describe('computeAZEO', () => {
  it('should select the highest-limit card as the anchor', () => {
    const small = makeAccount({ _id: 'a1', name: 'Small', balance: 100, availableBalance: 900 });  // limit 1000
    const large = makeAccount({ _id: 'a2', name: 'Large', balance: 200, availableBalance: 3800 }); // limit 4000
    const plan = computeAZEO([small, large], [makeMeta({ _id: 'a1' }), makeMeta({ _id: 'a2' })], null);
    expect(plan?.anchorCard.accountId).toBe('a2');
  });

  it('should set targetBalance to 0 for all non-anchor cards', () => {
    const c1 = makeAccount({ _id: 'a1', balance: 500, availableBalance: 1500 });
    const c2 = makeAccount({ _id: 'a2', balance: 200, availableBalance: 1800 });
    const plan = computeAZEO([c1, c2], [makeMeta({ _id: 'a1' }), makeMeta({ _id: 'a2' })], null);
    const nonAnchor = plan!.cards.find((c) => !c.isAnchor)!;
    expect(nonAnchor.targetBalance).toBe(0);
  });

  it('should set targetBalance to creditLimit * targetUtilization for the anchor card', () => {
    const account = makeAccount({ balance: 500, availableBalance: 1500 }); // limit 2000
    const meta = makeMeta({ targetUtilization: 0.05 });
    const plan = computeAZEO([account], [meta], null);
    expect(plan?.anchorCard.targetBalance).toBe(Math.round(2000 * 0.05)); // $100
  });

  it('should return paydownNeeded as 0 when balance is already at or below target', () => {
    const account = makeAccount({ balance: 50, availableBalance: 1950 }); // limit 2000, bal 50 = 2.5%
    const meta = makeMeta({ targetUtilization: 0.05 }); // target $100
    const plan = computeAZEO([account], [meta], null);
    expect(plan!.cards[0]!.paydownNeeded).toBe(0);
  });

  it('should exclude accounts without limit data', () => {
    const withLimit = makeAccount({ _id: 'a1', balance: 500, availableBalance: 1500 });
    const noLimit = makeAccount({ _id: 'a2', balance: 500, availableBalance: null });
    const plan = computeAZEO([withLimit, noLimit], [makeMeta({ _id: 'a1' }), makeMeta({ _id: 'a2' })], null);
    expect(plan!.cards.every((c) => c.accountId !== 'a2')).toBe(true);
  });

  it('should return null when no accounts have limit data', () => {
    const account = makeAccount({ availableBalance: null });
    expect(computeAZEO([account], [makeMeta()], null)).toBeNull();
  });

  it('should compute correct projectedOverallUtilization after AZEO paydowns', () => {
    const c1 = makeAccount({ _id: 'a1', balance: 800, availableBalance: 1200 }); // limit 2000
    const c2 = makeAccount({ _id: 'a2', balance: 500, availableBalance: 1500 }); // limit 2000
    // c1 has higher limit (equal, alphabetical = a1 is anchor)
    const plan = computeAZEO(
      [c1, c2],
      [makeMeta({ _id: 'a1', targetUtilization: 0.05 }), makeMeta({ _id: 'a2' })],
      null,
    );
    // anchor (a1) target = 2000 * 0.05 = 100, non-anchor paid to 0
    // projected: 100 / 4000 = 0.025
    expect(plan!.projectedOverallUtilization).toBeCloseTo(100 / 4000, 3);
  });

  it('should mark isAnchor true only on the anchor card', () => {
    const c1 = makeAccount({ _id: 'a1', balance: 100, availableBalance: 900 });
    const c2 = makeAccount({ _id: 'a2', balance: 100, availableBalance: 3900 }); // bigger limit
    const plan = computeAZEO([c1, c2], [makeMeta({ _id: 'a1' }), makeMeta({ _id: 'a2' })], null);
    const anchors = plan!.cards.filter((c) => c.isAnchor);
    expect(anchors).toHaveLength(1);
    expect(anchors[0]!.accountId).toBe('a2');
  });
});

// ── nextStatementCloseDate ────────────────────────────────────────────────────

describe('nextStatementCloseDate', () => {
  it('should return this month closing date when closing day is in the future', () => {
    const from = new Date('2026-04-02T12:00:00Z'); // 2nd April
    const result = nextStatementCloseDate(15, from);   // closes 15th
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(3); // April
    expect(result.getUTCDate()).toBe(15);
  });

  it('should return next month closing date when closing day has already passed this month', () => {
    const from = new Date('2026-04-20T12:00:00Z'); // 20th April
    const result = nextStatementCloseDate(6, from);    // closes 6th — already passed
    expect(result.getUTCMonth()).toBe(4); // May
    expect(result.getUTCDate()).toBe(6);
  });

  it('should handle closing day 31 in a 30-day month by clamping to last day', () => {
    const from = new Date('2026-04-01T00:00:00Z'); // April has 30 days
    const result = nextStatementCloseDate(31, from);
    expect(result.getUTCDate()).toBe(30);
  });
});

// ── checkStatementCloseAlerts (logic tested via computeAZEO alertActive) ─────

describe('checkStatementCloseAlerts (via AZEOCard.alertActive)', () => {
  it('should not set alertActive when statementClosingDay is null', () => {
    const account = makeAccount({ balance: 800, availableBalance: 1200 });
    const meta = makeMeta({ statementClosingDay: null });
    const plan = computeAZEO([account], [meta], null);
    expect(plan!.cards[0]!.alertActive).toBe(false);
  });

  it('should not set alertActive when paydownNeeded is 0', () => {
    const account = makeAccount({ balance: 50, availableBalance: 1950 }); // already below 5%
    const from = new Date('2026-04-02T00:00:00Z');
    const meta = makeMeta({ statementClosingDay: 4, targetUtilization: 0.05 }); // closes in 2 days
    const plan = computeAZEO([account], [meta], null, from);
    expect(plan!.cards[0]!.alertActive).toBe(false);
  });

  it('should set alertActive when statement closes within alert window and paydown needed', () => {
    const account = makeAccount({ balance: 800, availableBalance: 1200 }); // 40% util
    const from = new Date('2026-04-02T00:00:00Z');
    const meta = makeMeta({ statementClosingDay: 4, targetUtilization: 0.05 }); // closes in 2 days
    const plan = computeAZEO([account], [meta], null, from);
    expect(plan!.cards[0]!.alertActive).toBe(true);
  });
});

// ── buildStatementCloseEmbed ──────────────────────────────────────────────────

describe('buildStatementCloseEmbed', () => {
  const payload = {
    accountId: 'a1', accountName: 'Chase Sapphire',
    currentBalance: 1800, creditLimit: 5000, currentUtilization: 0.36,
    targetBalance: 250, targetUtilization: 0.05, paydownToTarget: 1550,
    closeDate: new Date('2026-04-06'), daysUntilClose: 4,
    isAnchorCard: true, totalCards: 2,
  };

  it('should use amber color (0xf59e0b)', async () => {
    const { buildStatementCloseEmbed } = await import('@/lib/discord/embeds');
    expect(buildStatementCloseEmbed(payload).color).toBe(0xf59e0b);
  });

  it('should include card name in title', async () => {
    const { buildStatementCloseEmbed } = await import('@/lib/discord/embeds');
    expect(buildStatementCloseEmbed(payload).title).toContain('Chase Sapphire');
  });

  it('should include paydown amount to reach target utilization', async () => {
    const { buildStatementCloseEmbed } = await import('@/lib/discord/embeds');
    const embed = buildStatementCloseEmbed(payload);
    expect(JSON.stringify(embed.fields)).toContain('1,550');
  });

  it('should include AZEO tip when isAnchorCard is true and multiple cards exist', async () => {
    const { buildStatementCloseEmbed } = await import('@/lib/discord/embeds');
    const embed = buildStatementCloseEmbed(payload);
    const tip = embed.fields?.find((f) => f.name === 'AZEO Tip');
    expect(tip).toBeDefined();
  });
});

// ── buildCreditUtilizationAlertEmbed ─────────────────────────────────────────

describe('buildCreditUtilizationAlertEmbed', () => {
  const payload = {
    accountId: 'a1', accountName: 'Visa', currentBalance: 870,
    creditLimit: 1000, utilization: 0.87, paydownTo30Pct: 570,
  };

  it('should use red color (0xef4444)', async () => {
    const { buildCreditUtilizationAlertEmbed } = await import('@/lib/discord/embeds');
    expect(buildCreditUtilizationAlertEmbed(payload).color).toBe(0xef4444);
  });

  it('should include the current utilization percentage', async () => {
    const { buildCreditUtilizationAlertEmbed } = await import('@/lib/discord/embeds');
    const embed = buildCreditUtilizationAlertEmbed(payload);
    expect(embed.fields?.some((f) => f.name === 'Utilization' && f.value === '87%')).toBe(true);
  });

  it('should include the paydown amount to reach 30%', async () => {
    const { buildCreditUtilizationAlertEmbed } = await import('@/lib/discord/embeds');
    const embed = buildCreditUtilizationAlertEmbed(payload);
    expect(JSON.stringify(embed.fields)).toContain('570');
  });
});
