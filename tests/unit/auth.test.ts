import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { timingSafeEqual } from 'crypto';

// Replicate the authorize logic from src/auth.ts for unit testing
function authorizePassword(submitted: string | undefined, expected: string | undefined): boolean {
  if (!submitted || !expected) return false;
  const a = Buffer.from(submitted);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

describe('auth — password comparison', () => {
  it('returns true for correct password', () => {
    expect(authorizePassword('mysecret', 'mysecret')).toBe(true);
  });

  it('returns false for wrong password', () => {
    expect(authorizePassword('wrongpass', 'mysecret')).toBe(false);
  });

  it('returns false when submitted is empty', () => {
    expect(authorizePassword('', 'mysecret')).toBe(false);
  });

  it('returns false when expected is undefined', () => {
    expect(authorizePassword('mysecret', undefined)).toBe(false);
  });

  it('returns false when submitted is undefined', () => {
    expect(authorizePassword(undefined, 'mysecret')).toBe(false);
  });

  it('returns false for same-prefix but longer password', () => {
    expect(authorizePassword('mysecretextra', 'mysecret')).toBe(false);
  });

  it('returns false for same-prefix but shorter password', () => {
    expect(authorizePassword('myse', 'mysecret')).toBe(false);
  });

  it('is case-sensitive', () => {
    expect(authorizePassword('MySecret', 'mysecret')).toBe(false);
  });
});

describe('auth — env var presence', () => {
  const original = process.env['AUTH_PASSWORD'];

  afterEach(() => {
    if (original === undefined) {
      delete process.env['AUTH_PASSWORD'];
    } else {
      process.env['AUTH_PASSWORD'] = original;
    }
  });

  it('returns false when AUTH_PASSWORD env var is not set', () => {
    delete process.env['AUTH_PASSWORD'];
    expect(authorizePassword('anything', process.env['AUTH_PASSWORD'])).toBe(false);
  });

  it('returns true when submitted matches AUTH_PASSWORD env var', () => {
    process.env['AUTH_PASSWORD'] = 'testpass';
    expect(authorizePassword('testpass', process.env['AUTH_PASSWORD'])).toBe(true);
  });
});
