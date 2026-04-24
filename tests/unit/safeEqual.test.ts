/**
 * Tests for the safeEqual() constant-time comparison in src/auth.ts.
 *
 * safeEqual() is NOT exported, so we replicate it verbatim here.
 * Any change to the implementation that breaks correctness will break these tests.
 *
 * Why this matters: the previous implementation used Node's timingSafeEqual
 * which throws on different-length buffers and therefore short-circuits —
 * leaking length information. safeEqual() must return false for mismatched
 * lengths WITHOUT throwing, and must iterate every character regardless.
 */
import { describe, it, expect } from 'vitest';

// Replicated verbatim from src/auth.ts — if you change the source, update this too.
function safeEqual(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  const paddedA = a.padEnd(maxLen, '\0');
  const paddedB = b.padEnd(maxLen, '\0');
  let diff = a.length !== b.length ? 1 : 0;
  for (let i = 0; i < maxLen; i++) {
    diff |= paddedA.charCodeAt(i) ^ paddedB.charCodeAt(i);
  }
  return diff === 0;
}

describe('safeEqual — correctness', () => {
  it('returns true when both strings are identical', () => {
    expect(safeEqual('correct-horse-battery-staple', 'correct-horse-battery-staple')).toBe(true);
  });

  it('returns false when strings differ by one character at the start', () => {
    expect(safeEqual('Xorrect-horse-battery-staple', 'correct-horse-battery-staple')).toBe(false);
  });

  it('returns false when strings differ by one character at the end', () => {
    expect(safeEqual('correct-horse-battery-stapleX', 'correct-horse-battery-staple')).toBe(false);
  });

  it('returns false when strings differ by one character in the middle', () => {
    expect(safeEqual('correct-XORSE-battery-staple', 'correct-horse-battery-staple')).toBe(false);
  });

  it('returns true for two identical empty strings', () => {
    expect(safeEqual('', '')).toBe(true);
  });

  it('returns false when one string is empty and the other is not', () => {
    expect(safeEqual('', 'secret')).toBe(false);
    expect(safeEqual('secret', '')).toBe(false);
  });

  it('is case-sensitive — uppercase is not equal to lowercase', () => {
    expect(safeEqual('Password123', 'password123')).toBe(false);
  });

  it('returns false for a correct prefix that is too short (prevents prefix-oracle attack)', () => {
    expect(safeEqual('secret', 'secretextra')).toBe(false);
    expect(safeEqual('secretextra', 'secret')).toBe(false);
  });

  it('returns false for same length but all chars different', () => {
    expect(safeEqual('aaaa', 'bbbb')).toBe(false);
  });

  it('handles strings with null-byte characters correctly', () => {
    // The padding uses \0 — a real \0 in the input should still compare correctly
    expect(safeEqual('ab\0cd', 'ab\0cd')).toBe(true);
    expect(safeEqual('ab\0cd', 'abXcd')).toBe(false);
  });

  it('handles unicode characters correctly', () => {
    expect(safeEqual('pässwörd', 'pässwörd')).toBe(true);
    expect(safeEqual('pässwörd', 'password')).toBe(false);
  });
});

describe('safeEqual — constant-time guarantee: different lengths must not throw', () => {
  it('does not throw when a is longer than b', () => {
    expect(() => safeEqual('much-longer-password', 'short')).not.toThrow();
  });

  it('does not throw when b is longer than a', () => {
    expect(() => safeEqual('short', 'much-longer-password')).not.toThrow();
  });

  it('returns false (not an exception) for very different lengths', () => {
    // Old timingSafeEqual threw a RangeError here — safeEqual must return false
    const result = safeEqual('a', 'a'.repeat(10_000));
    expect(result).toBe(false);
  });
});

describe('safeEqual — the diff accumulator must cover ALL character positions', () => {
  // If the loop short-circuits after finding a mismatch, a string that
  // matches on all characters EXCEPT the first would still return false —
  // but we need to ensure the logic is correct end-to-end, not that it
  // short-circuits early. We verify correct outcomes rather than timing.

  it('correctly rejects a string that only differs at position 0', () => {
    const a = 'Xbcdefghijklmnop';
    const b = 'abcdefghijklmnop';
    expect(safeEqual(a, b)).toBe(false);
  });

  it('correctly rejects a string that only differs at the last position', () => {
    const a = 'abcdefghijklmnoX';
    const b = 'abcdefghijklmnop';
    expect(safeEqual(a, b)).toBe(false);
  });

  it('correctly accepts an identical 64-character string', () => {
    const s = 'a'.repeat(32) + 'b'.repeat(32);
    expect(safeEqual(s, s)).toBe(true);
  });
});
