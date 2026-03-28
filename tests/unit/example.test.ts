import { describe, it, expect } from 'vitest';

describe('Example test', () => {
  it('basic math works', () => {
    expect(1 + 1).toBe(2);
  });

  it('string operations work', () => {
    const greeting = 'Hello, World!';
    expect(greeting).toContain('Hello');
    expect(greeting).toHaveLength(13);
  });
});
