import { describe, it, expect } from 'vitest';
import {
  normalizeDescription,
  toDisplayName,
  inferCategory,
} from '@/lib/subscriptions/normalize';

describe('normalizeDescription', () => {
  it('lowercases the input', () => {
    expect(normalizeDescription('NETFLIX')).toBe('netflix');
  });

  it('strips trailing *SUFFIX', () => {
    expect(normalizeDescription('AMZN*ABC123')).toBe('amzn');
  });

  it('strips trailing #receipt code', () => {
    expect(normalizeDescription('SPOTIFY#A1B2C3')).toBe('spotify');
  });

  it('strips trailing transaction ID (8+ digits)', () => {
    expect(normalizeDescription('HULU 12345678')).toBe('hulu');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeDescription('APPLE   SERVICES')).toBe('apple   services'.replace(/\s+/g, ' '));
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeDescription('  netflix  ')).toBe('netflix');
  });

  it('handles a realistic bank description', () => {
    const result = normalizeDescription('NETFLIX.COM *1234567890');
    expect(result).not.toContain('1234567890');
    expect(result).toContain('netflix');
  });
});

describe('toDisplayName', () => {
  it('returns mapped display name for netflix', () => {
    expect(toDisplayName('netflix')).toBe('Netflix');
  });

  it('returns mapped display name for spotify', () => {
    expect(toDisplayName('spotify')).toBe('Spotify');
  });

  it('returns mapped display name for amazon', () => {
    expect(toDisplayName('amazon prime')).toBe('Amazon');
  });

  it('returns title-cased fallback for unknown merchant', () => {
    expect(toDisplayName('acme widgets co')).toBe('Acme Widgets Co');
  });

  it('returns mapped name when fragment appears in longer string', () => {
    expect(toDisplayName('pay netflix monthly')).toBe('Netflix');
  });
});

describe('inferCategory', () => {
  it('returns subscriptions for netflix', () => {
    expect(inferCategory('netflix')).toBe('subscriptions');
  });

  it('returns utilities for electric', () => {
    expect(inferCategory('electric bill payment')).toBe('utilities');
  });

  it('returns insurance for geico', () => {
    expect(inferCategory('geico auto insurance')).toBe('insurance');
  });

  it('returns loans for mortgage', () => {
    expect(inferCategory('quicken loans mortgage')).toBe('loans');
  });

  it('returns rent for apartment', () => {
    expect(inferCategory('riverside apartment rent')).toBe('rent');
  });

  it('defaults to subscriptions for unknown recurring charge', () => {
    expect(inferCategory('mystery charge monthly')).toBe('subscriptions');
  });
});
