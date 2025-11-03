import { describe, it, expect } from 'vitest';
import { parseCSV, shuffleArray } from '../src/helpers/questionUtils.js';

describe('questionUtils', () => {
  it('parseCSV returns empty for invalid lines', () => {
    expect(parseCSV('badline')).toEqual([]);
  });

  it('parseCSV parses valid single question', () => {
    const csv = 'What is 2+2?, 4, 3, 5, 6';
    const result = parseCSV(csv);
    expect(result.length).toBe(1);
    expect(result[0].question).toBe('What is 2+2?');
    expect(result[0].correctAnswer).toBe('4');
    expect(result[0].options).toContain('4');
  });

  it('shuffleArray returns same items different order (likely)', () => {
    const input = [1,2,3,4,5];
    const shuffled = shuffleArray(input);
    expect(shuffled.length).toBe(5);
    expect(shuffled.sort()).toEqual(input.sort());
  });
});
