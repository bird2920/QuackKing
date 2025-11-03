import { describe, it, expect } from 'vitest';
import { parseCSV, shuffleArray } from '../src/helpers/questionUtils.js';
import { generateGameCode } from '../src/helpers/codeUtils.js';
import { getGameDocPath, getPlayersCollectionPath, getPlayerDocPath } from '../src/helpers/firebasePaths.js';

// Minimal mock Firestore db object with path accumulation
const mockDb = { __type: 'mock-firestore' };

function extractPath(ref){
  return ref.path || ref._key?.path || ref.__mockPath || ref.toString?.() || 'unknown';
}

describe('questionUtils.parseCSV', () => {
  it('parses valid CSV lines into questions', () => {
    const csv = 'Q1?, A1, B, C\nQ2?, A2, X, Y, Z';
    const result = parseCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0].question).toBe('Q1?');
    expect(result[0].options).toContain('A1');
  });

  it('filters invalid lines', () => {
    const csv = 'Incomplete\nValid?, Ans, Opt1';
    const result = parseCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].correctAnswer).toBe('Ans');
  });
});

describe('questionUtils.shuffleArray', () => {
  it('returns a new array with same items', () => {
    const input = [1,2,3,4];
    const out = shuffleArray(input);
    expect(out).toHaveLength(4);
    expect(out.sort()).toEqual(input.sort());
    expect(out).not.toBe(input); // new reference
  });
});

describe('codeUtils.generateGameCode', () => {
  it('generates 4 uppercase chars', () => {
    const code = generateGameCode();
    expect(code).toMatch(/^[A-Z0-9]{4}$/);
  });
  it('generates different codes most of the time', () => {
    const codes = new Set(Array.from({length:20}, () => generateGameCode()));
    expect(codes.size).toBeGreaterThan(15);
  });
});