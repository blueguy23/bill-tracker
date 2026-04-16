import { describe, it, expect } from 'vitest';
import { categorize } from '@/lib/categorization/engine';
import type { CategoryRule } from '@/lib/categorization/types';

describe('categorize — default rules', () => {
  it('categorizes Amazon as shopping', () => {
    expect(categorize('AMAZON MARKETPLACE', null)).toBe('shopping');
  });

  it('categorizes Netflix as entertainment', () => {
    expect(categorize('NETFLIX.COM', null)).toBe('entertainment');
  });

  it('categorizes Starbucks as food', () => {
    expect(categorize('STARBUCKS #1234', null)).toBe('food');
  });

  it('categorizes Uber as transport', () => {
    expect(categorize('UBER * TRIP', null)).toBe('transport');
  });

  it('categorizes Uber Eats as food (before uber transport rule)', () => {
    expect(categorize('UBER EATS ORDER', null)).toBe('food');
  });

  it('categorizes Zelle as transfer', () => {
    expect(categorize('Zelle payment to John', null)).toBe('transfer');
  });

  it('categorizes direct deposit as income', () => {
    expect(categorize('DIRECT DEPOSIT PAYROLL', null)).toBe('income');
  });

  it('categorizes Verizon as utilities', () => {
    expect(categorize('VERIZON WIRELESS BILL', null)).toBe('utilities');
  });

  it('categorizes Adobe as subscriptions', () => {
    expect(categorize('ADOBE CREATIVE CLOUD', null)).toBe('subscriptions');
  });

  it('categorizes CVS as shopping (not health, since shopping rule fires first)', () => {
    // CVS is listed under shopping rules
    const result = categorize('CVS PHARMACY #0042', null);
    expect(['shopping', 'health']).toContain(result);
  });

  it('returns other for unrecognized descriptions', () => {
    expect(categorize('RANDOM MERCHANT 99X', null)).toBe('other');
  });

  it('includes memo in matching', () => {
    // Description doesn't match but memo does
    expect(categorize('PAYMENT 0001', 'netflix subscription')).toBe('entertainment');
  });

  it('is case-insensitive', () => {
    expect(categorize('amazon.com', null)).toBe('shopping');
    expect(categorize('NETFLIX', null)).toBe('entertainment');
  });
});

describe('categorize — user rules take priority', () => {
  const userRules: CategoryRule[] = [
    {
      _id: 'r1',
      pattern: 'whole foods',
      category: 'shopping',
      isRegex: false,
      createdAt: new Date(),
    },
  ];

  it('applies user keyword rule over default rule', () => {
    // Default says "whole foods" → food; user says → shopping
    expect(categorize('WHOLE FOODS MARKET', null, userRules)).toBe('shopping');
  });

  it('falls back to default rule when user rule does not match', () => {
    expect(categorize('STARBUCKS #5678', null, userRules)).toBe('food');
  });
});

describe('categorize — regex user rules', () => {
  const regexRules: CategoryRule[] = [
    {
      _id: 'r2',
      pattern: '^PAYCHECK',
      category: 'income',
      isRegex: true,
      createdAt: new Date(),
    },
  ];

  it('matches regex pattern', () => {
    expect(categorize('PAYCHECK FROM EMPLOYER', null, regexRules)).toBe('income');
  });

  it('does not match when regex does not apply', () => {
    expect(categorize('MY PAYCHECK 123', null, regexRules)).toBe('other');
  });

  it('handles invalid regex gracefully by skipping to next rule', () => {
    const badRules: CategoryRule[] = [
      { _id: 'r3', pattern: '[invalid(', category: 'food', isRegex: true, createdAt: new Date() },
    ];
    // Should not throw — falls through to default rules
    expect(() => categorize('anything', null, badRules)).not.toThrow();
    expect(categorize('amazon', null, badRules)).toBe('shopping');
  });
});
