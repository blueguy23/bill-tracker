import { describe, it, expect } from 'vitest';
import { computeMonthStats } from '@/components/MonthlySummary';
import type { BillResponse } from '@/types/bill';

function makeBill(overrides: Partial<BillResponse>): BillResponse {
  return {
    _id: 'test-id',
    name: 'Test Bill',
    amount: 100,
    dueDate: '2026-03-15T00:00:00.000Z',
    category: 'utilities',
    isPaid: false,
    isAutoPay: false,
    isRecurring: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('computeMonthStats', () => {
  describe('bill inclusion — recurring bills', () => {
    it('should include recurring bills in every month', () => {
      const bill = makeBill({ isRecurring: true, dueDate: 15, amount: 50 });
      const march = computeMonthStats([bill], '2026-03');
      const april = computeMonthStats([bill], '2026-04');
      expect(march.totalOwed).toBe(50);
      expect(april.totalOwed).toBe(50);
      expect(march.unpaidCount).toBe(1);
      expect(april.unpaidCount).toBe(1);
    });

    it('should use isPaid status when counting recurring bill as paid or unpaid', () => {
      const bill = makeBill({ isRecurring: true, dueDate: 1, amount: 200, isPaid: true });
      const stats = computeMonthStats([bill], '2026-03');
      expect(stats.totalPaid).toBe(200);
      expect(stats.totalOwed).toBe(0);
      expect(stats.unpaidCount).toBe(0);
    });
  });

  describe('bill inclusion — one-off bills', () => {
    it('should include a one-off bill only in its due month', () => {
      const bill = makeBill({ isRecurring: false, dueDate: '2026-03-15T00:00:00.000Z', amount: 300 });
      const march = computeMonthStats([bill], '2026-03');
      const april = computeMonthStats([bill], '2026-04');
      expect(march.totalOwed).toBe(300);
      expect(april.totalOwed).toBe(0);
      expect(april.unpaidCount).toBe(0);
    });

    it('should not include a one-off bill from a different year', () => {
      const bill = makeBill({ isRecurring: false, dueDate: '2025-03-15T00:00:00.000Z', amount: 150 });
      const stats = computeMonthStats([bill], '2026-03');
      expect(stats.totalOwed).toBe(0);
      expect(stats.unpaidCount).toBe(0);
    });
  });

  describe('totals calculation', () => {
    it('should sum unpaid bill amounts into totalOwed', () => {
      const bills = [
        makeBill({ amount: 100, isPaid: false }),
        makeBill({ amount: 200, isPaid: false }),
        makeBill({ amount: 50,  isPaid: false }),
      ];
      const stats = computeMonthStats(bills, '2026-03');
      expect(stats.totalOwed).toBe(350);
      expect(stats.totalPaid).toBe(0);
      expect(stats.unpaidCount).toBe(3);
    });

    it('should sum paid bill amounts into totalPaid', () => {
      const bills = [
        makeBill({ amount: 300, isPaid: true }),
        makeBill({ amount: 150, isPaid: true }),
        makeBill({ amount: 75,  isPaid: false }),
      ];
      const stats = computeMonthStats(bills, '2026-03');
      expect(stats.totalPaid).toBe(450);
      expect(stats.totalOwed).toBe(75);
      expect(stats.unpaidCount).toBe(1);
    });

    it('should return all zeros for a month with no bills', () => {
      const bill = makeBill({ isRecurring: false, dueDate: '2026-04-01T00:00:00.000Z' });
      const stats = computeMonthStats([bill], '2026-03');
      expect(stats.totalOwed).toBe(0);
      expect(stats.totalPaid).toBe(0);
      expect(stats.unpaidCount).toBe(0);
    });
  });

  describe('category breakdown', () => {
    it('should group bills by category with totals', () => {
      const bills = [
        makeBill({ category: 'utilities', amount: 50 }),
        makeBill({ category: 'utilities', amount: 75 }),
        makeBill({ category: 'rent',      amount: 1500 }),
      ];
      const stats = computeMonthStats(bills, '2026-03');
      const util = stats.categoryBreakdown.find((c) => c.category === 'utilities');
      const rent = stats.categoryBreakdown.find((c) => c.category === 'rent');
      expect(util?.total).toBe(125);
      expect(rent?.total).toBe(1500);
      expect(stats.categoryBreakdown.find((c) => c.category === 'loans')).toBeUndefined();
    });

    it('should track paid vs unpaid amounts within each category', () => {
      const bills = [
        makeBill({ category: 'utilities', amount: 50,  isPaid: true }),
        makeBill({ category: 'utilities', amount: 75,  isPaid: false }),
      ];
      const stats = computeMonthStats(bills, '2026-03');
      const util = stats.categoryBreakdown.find((c) => c.category === 'utilities');
      expect(util?.paid).toBe(50);
      expect(util?.unpaid).toBe(75);
      expect(util?.total).toBe(125);
    });

    it('should count number of bills per category', () => {
      const bills = [
        makeBill({ category: 'subscriptions' }),
        makeBill({ category: 'subscriptions' }),
        makeBill({ category: 'subscriptions' }),
      ];
      const stats = computeMonthStats(bills, '2026-03');
      const subs = stats.categoryBreakdown.find((c) => c.category === 'subscriptions');
      expect(subs?.count).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('should handle an empty bills array', () => {
      const stats = computeMonthStats([], '2026-03');
      expect(stats.totalOwed).toBe(0);
      expect(stats.totalPaid).toBe(0);
      expect(stats.unpaidCount).toBe(0);
      expect(stats.categoryBreakdown).toHaveLength(0);
    });

    it('should handle a recurring bill with dueDate day 31 in a 30-day month', () => {
      const bill = makeBill({ isRecurring: true, dueDate: 31, amount: 99 });
      const stats = computeMonthStats([bill], '2026-04'); // April has 30 days
      expect(stats.unpaidCount).toBe(1);
      expect(stats.totalOwed).toBe(99);
    });
  });
});
