import { fileURLToPath } from 'node:url';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { grammarArb } from '../../src/grammar/arbitrary.js';
import { evaluate } from './eval.js';

const calcGrammarPath = fileURLToPath(new URL('./calc.ebnf', import.meta.url));
const arb = grammarArb(calcGrammarPath, 'main');

describe('calc EBNF grammar arbitrary', () => {
  it('eval never throws and always returns a finite number', () => {
    fc.assert(
      fc.property(arb, (source) => {
        const value = evaluate(source);
        expect(Number.isFinite(value)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});
