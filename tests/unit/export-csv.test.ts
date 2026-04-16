import { describe, it, expect } from 'vitest';

// ── Pure CSV helpers extracted for testing ────────────────────────────────────

function escapeCSV(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

describe('escapeCSV', () => {
  it('returns empty string for null', () => {
    expect(escapeCSV(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(escapeCSV(undefined)).toBe('');
  });

  it('returns plain string unchanged', () => {
    expect(escapeCSV('hello')).toBe('hello');
  });

  it('wraps strings containing commas in quotes', () => {
    expect(escapeCSV('hello, world')).toBe('"hello, world"');
  });

  it('wraps strings containing double quotes and escapes them', () => {
    expect(escapeCSV('say "hello"')).toBe('"say ""hello"""');
  });

  it('wraps strings containing newlines in quotes', () => {
    expect(escapeCSV('line1\nline2')).toBe('"line1\nline2"');
  });

  it('converts numbers to strings', () => {
    expect(escapeCSV(42.5)).toBe('42.5');
  });

  it('converts negative numbers to strings', () => {
    expect(escapeCSV(-99.99)).toBe('-99.99');
  });
});

describe('CSV output shape', () => {
  // Replicate buildCSV logic inline to test the output contract
  function buildCSV(rows: Array<string[]>): string {
    const headers = ['Date', 'Description', 'Memo', 'Amount', 'Account', 'Institution', 'Pending'];
    const lines = rows.map((r) => r.map(escapeCSV).join(','));
    return [headers.join(','), ...lines].join('\r\n');
  }

  it('starts with the correct header row', () => {
    const csv = buildCSV([]);
    const firstLine = csv.split('\r\n')[0];
    expect(firstLine).toBe('Date,Description,Memo,Amount,Account,Institution,Pending');
  });

  it('produces one line per transaction plus header', () => {
    const csv = buildCSV([
      ['2026-04-01', 'AMAZON', '', '-42.50', 'Checking', 'Chase', 'No'],
      ['2026-04-02', 'NETFLIX', '', '-15.99', 'Checking', 'Chase', 'No'],
    ]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(3); // header + 2 rows
  });

  it('uses CRLF line endings', () => {
    const csv = buildCSV([['2026-04-01', 'TEST', '', '-1.00', 'Acc', 'Bank', 'No']]);
    expect(csv).toContain('\r\n');
  });

  it('escapes commas in description field', () => {
    const csv = buildCSV([['2026-04-01', 'SHOP, INC', '', '-10.00', 'Acc', 'Bank', 'No']]);
    expect(csv).toContain('"SHOP, INC"');
  });
});
