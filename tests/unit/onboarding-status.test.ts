import { describe, it, expect } from 'vitest';

// ── Pure step-derivation logic extracted for testing ──────────────────────────

type OnboardingStep = 1 | 2 | 3 | 4 | 5;

function deriveStep(
  simplefinConfigured: boolean,
  accountCount: number,
  billCount: number,
  hasBudget: boolean,
): OnboardingStep {
  if (!simplefinConfigured) return 1;
  if (accountCount === 0) return 2;
  if (billCount === 0) return 3;
  if (!hasBudget) return 4;
  return 5;
}

function isComplete(
  simplefinConfigured: boolean,
  accountCount: number,
  billCount: number,
  hasBudget: boolean,
): boolean {
  return simplefinConfigured && accountCount > 0 && billCount > 0 && hasBudget;
}

describe('deriveStep', () => {
  it('returns step 1 when SimpleFIN is not configured', () => {
    expect(deriveStep(false, 0, 0, false)).toBe(1);
  });

  it('returns step 2 when SimpleFIN configured but no accounts', () => {
    expect(deriveStep(true, 0, 0, false)).toBe(2);
  });

  it('returns step 3 when accounts exist but no bills', () => {
    expect(deriveStep(true, 3, 0, false)).toBe(3);
  });

  it('returns step 4 when bills exist but no budget', () => {
    expect(deriveStep(true, 3, 5, false)).toBe(4);
  });

  it('returns step 5 (complete) when all conditions met', () => {
    expect(deriveStep(true, 3, 5, true)).toBe(5);
  });
});

describe('isComplete', () => {
  it('returns false when any condition is missing', () => {
    expect(isComplete(false, 3, 5, true)).toBe(false);
    expect(isComplete(true, 0, 5, true)).toBe(false);
    expect(isComplete(true, 3, 0, true)).toBe(false);
    expect(isComplete(true, 3, 5, false)).toBe(false);
  });

  it('returns true only when all conditions are met', () => {
    expect(isComplete(true, 1, 1, true)).toBe(true);
  });
});

describe('progress percentage', () => {
  function progressPercent(steps: boolean[]): number {
    return (steps.filter(Boolean).length / steps.length) * 100;
  }

  it('is 0% when no steps done', () => {
    expect(progressPercent([false, false, false, false])).toBe(0);
  });

  it('is 25% when 1 of 4 steps done', () => {
    expect(progressPercent([true, false, false, false])).toBe(25);
  });

  it('is 75% when 3 of 4 steps done', () => {
    expect(progressPercent([true, true, true, false])).toBe(75);
  });

  it('is 100% when all 4 steps done', () => {
    expect(progressPercent([true, true, true, true])).toBe(100);
  });
});
