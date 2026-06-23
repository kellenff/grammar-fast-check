import fc from 'fast-check';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { grammarArb, grammarArbFromCompiled } from './arbitrary.js';
import { loadGrammar } from './load.js';

const calcNePath = fileURLToPath(new URL('../../examples/calc/calc.ne', import.meta.url));
const calcEbnfPath = fileURLToPath(new URL('../../examples/calc/calc.ebnf', import.meta.url));

describe('grammarArb', () => {
  it('generates strings for the requested start rule', () => {
    const samples = fc.sample(grammarArb(calcNePath, 'number'), 20);

    expect(samples.every((sample) => /^\d+$/.test(sample))).toBe(true);
  });

  it('accepts depthSize options for recursive grammars', () => {
    const samples = fc.sample(grammarArb(calcNePath, 'main', { depthSize: 'small' }), 20);

    expect(samples.every((sample) => sample.length > 0)).toBe(true);
  });

  it('reuses a compiled grammar via grammarArbFromCompiled', () => {
    const grammar = loadGrammar(calcEbnfPath);
    const samples = fc.sample(grammarArbFromCompiled(grammar, 'number'), 10);

    expect(samples.every((sample) => /^\d+$/.test(sample))).toBe(true);
  });
});
