import fc from 'fast-check';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { grammarArb } from './arbitrary.js';

const calcNePath = fileURLToPath(new URL('../../examples/calc/calc.ne', import.meta.url));
const calcEbnfPath = fileURLToPath(new URL('../../examples/calc/calc.ebnf', import.meta.url));

describe('grammarArb', () => {
  it('generates digit strings for the number rule of a .ne grammar', () => {
    const samples = fc.sample(grammarArb(calcNePath, 'number'), 50);

    expect(samples.every((sample) => /^\d+$/.test(sample))).toBe(true);
  });

  it('generates well-formed expressions from a .ebnf grammar', () => {
    const samples = fc.sample(grammarArb(calcEbnfPath, 'main'), 50);

    expect(samples.every((sample) => /^[0-9+\-*()]+$/.test(sample))).toBe(true);
  });

  it('forwards options to the generator to bound output size', () => {
    // `number ::= digit { digit }`, so capping the repetition at 2 yields 1..3 digits.
    const samples = fc.sample(grammarArb(calcEbnfPath, 'number', { maxRepetitions: 2 }), 200);

    expect(samples.every((sample) => /^\d{1,3}$/.test(sample))).toBe(true);
  });

  it('throws for an unknown start rule', () => {
    expect(() => grammarArb(calcNePath, 'nope')).toThrow(/no rule named "nope"/);
  });
});
