import { describe, it, expect } from 'vitest';
import {
  buildBillDueSoonEmbed,
  buildBillOverdueEmbed,
  buildBudgetWarningEmbed,
  buildBudgetExceededEmbed,
  buildSyncCompletedEmbed,
  buildSyncFailedEmbed,
  buildDailyDigestEmbed,
  buildTestEmbed,
} from '@/lib/discord/embeds';

describe('buildBillDueSoonEmbed', () => {
  const payload = { billId: 'b1', billName: 'Rent', amount: 1200, dueDate: new Date('2026-04-01'), daysUntilDue: 2 };

  it('has title "Bill Due Soon"', () => {
    expect(buildBillDueSoonEmbed(payload).title).toBe('Bill Due Soon');
  });

  it('uses amber color (0xf59e0b)', () => {
    expect(buildBillDueSoonEmbed(payload).color).toBe(0xf59e0b);
  });

  it('includes bill name in fields', () => {
    const embed = buildBillDueSoonEmbed(payload);
    expect(embed.fields?.some((f) => f.value === 'Rent')).toBe(true);
  });

  it('includes days until due', () => {
    const embed = buildBillDueSoonEmbed(payload);
    expect(embed.fields?.some((f) => f.name === 'Days Until Due' && f.value === '2')).toBe(true);
  });
});

describe('buildBillOverdueEmbed', () => {
  const payload = { billId: 'b1', billName: 'Electric', amount: 150, daysOverdue: 5 };

  it('uses red color (0xef4444)', () => {
    expect(buildBillOverdueEmbed(payload).color).toBe(0xef4444);
  });

  it('includes days overdue in fields', () => {
    const embed = buildBillOverdueEmbed(payload);
    expect(embed.fields?.some((f) => f.name === 'Days Overdue' && f.value === '5')).toBe(true);
  });
});

describe('buildBudgetWarningEmbed', () => {
  const payload = { category: 'food', spent: 360, budget: 400, percentUsed: 90 };

  it('uses amber color', () => {
    expect(buildBudgetWarningEmbed(payload).color).toBe(0xf59e0b);
  });

  it('shows percentage used', () => {
    const embed = buildBudgetWarningEmbed(payload);
    expect(embed.fields?.some((f) => f.name === '% Used' && f.value === '90%')).toBe(true);
  });
});

describe('buildBudgetExceededEmbed', () => {
  const payload = { category: 'food', spent: 450, budget: 400, percentUsed: 112 };

  it('uses red color', () => {
    expect(buildBudgetExceededEmbed(payload).color).toBe(0xef4444);
  });

  it('shows overage amount', () => {
    const embed = buildBudgetExceededEmbed(payload);
    expect(embed.fields?.some((f) => f.name === 'Over By')).toBe(true);
  });
});

describe('buildSyncCompletedEmbed', () => {
  const payload = { accountsUpdated: 3, transactionsImported: 42, warnings: [] };

  it('uses green color (0x22c55e)', () => {
    expect(buildSyncCompletedEmbed(payload).color).toBe(0x22c55e);
  });

  it('shows accounts updated', () => {
    const embed = buildSyncCompletedEmbed(payload);
    expect(embed.fields?.some((f) => f.name === 'Accounts Updated' && f.value === '3')).toBe(true);
  });

  it('shows "None" for warnings when empty', () => {
    const embed = buildSyncCompletedEmbed(payload);
    expect(embed.fields?.some((f) => f.name === 'Warnings' && f.value === 'None')).toBe(true);
  });
});

describe('buildSyncFailedEmbed', () => {
  it('uses red color', () => {
    expect(buildSyncFailedEmbed({ errorMessage: 'Timeout' }).color).toBe(0xef4444);
  });

  it('includes error message in description', () => {
    const embed = buildSyncFailedEmbed({ errorMessage: 'Connection refused' });
    expect(embed.description).toBe('Connection refused');
  });
});

describe('buildDailyDigestEmbed', () => {
  it('uses blue color (0x3b82f6)', () => {
    const embed = buildDailyDigestEmbed({ billsDueSoon: [], overdueCount: 0, budgetWarnings: [], budgetExceeded: [] });
    expect(embed.color).toBe(0x3b82f6);
  });

  it('shows "Nothing due soon" when no bills due', () => {
    const embed = buildDailyDigestEmbed({ billsDueSoon: [], overdueCount: 0, budgetWarnings: [], budgetExceeded: [] });
    expect(embed.fields?.some((f) => f.value.includes('Nothing due soon'))).toBe(true);
  });

  it('shows bill count in field name when bills are present', () => {
    const bill = { billId: 'b1', billName: 'Rent', amount: 1200, dueDate: new Date(), daysUntilDue: 1 };
    const embed = buildDailyDigestEmbed({ billsDueSoon: [bill], overdueCount: 0, budgetWarnings: [], budgetExceeded: [] });
    expect(embed.fields?.some((f) => f.name.includes('1'))).toBe(true);
  });
});

describe('buildTestEmbed', () => {
  it('has title "Test Notification"', () => {
    expect(buildTestEmbed().title).toBe('Test Notification');
  });

  it('uses purple color (0x8b5cf6)', () => {
    expect(buildTestEmbed().color).toBe(0x8b5cf6);
  });
});
