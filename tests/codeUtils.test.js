import { describe, it, expect } from 'vitest';
import { generateGameCode } from '../src/helpers/codeUtils.js';

describe('codeUtils', () => {
  it('generateGameCode returns 4 uppercase chars', () => {
    const code = generateGameCode();
    expect(code).toMatch(/^[A-Z0-9]{4}$/);
  });

  it('codes are usually different', () => {
    const a = generateGameCode();
    const b = generateGameCode();
    expect(a).not.toEqual(b); // Very low collision probability
  });
});
