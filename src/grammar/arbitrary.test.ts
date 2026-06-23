import fc from 'fast-check';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { grammarArb } from './arbitrary.js';

const calcNePath = fileURLToPath(new URL('../../examples/calc/calc.ne', import.meta.url));
const calcEbnfPath = fileURLToPath(new URL('../../examples/calc/calc.ebnf', import.meta.url));

describe('grammarArb', () => {
  it('generates strings for the requested start rule from nearley grammars', () => {
    const samples = fc.sample(grammarArb(calcNePath, 'number'), 20);

    expect(samples.every((sample) => /^\d+$/.test(sample))).toBe(true);
  });

  it('generates strings for the requested start rule from EBNF grammars', () => {
    const samples = fc.sample(grammarArb(calcEbnfPath, 'number'), 20);

    expect(samples.every((sample) => /^\d+$/.test(sample))).toBe(true);
  });

  it('uses fast-check shrinking for generated strings', () => {
    const arb = grammarArb(calcEbnfPath, 'main');

    try {
      fc.assert(
        fc.property(arb, (source) => source.length < 1),
        { numRuns: 50 },
      );
      throw new Error('Expected property to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/Counterexample: \[".+"\]/);
      expect((error as Error).message).toContain('Shrunk');
    }
  });
});
