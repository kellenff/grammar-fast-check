import fc from 'fast-check';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compileEbnfGrammar } from '../ebnf/index.js';
import { loadGrammar } from '../load.js';
import { buildGrammarArbitrary, buildGrammarDerivationArbitrary } from './build.js';
import { renderDerivation } from './render.js';

const calcNePath = fileURLToPath(new URL('../../../examples/calc/calc.ne', import.meta.url));
const calcEbnfPath = fileURLToPath(new URL('../../../examples/calc/calc.ebnf', import.meta.url));

describe('buildGrammarArbitrary', () => {
  it('generates digit strings for the number rule in nearley calc', () => {
    const grammar = loadGrammar(calcNePath);
    const samples = fc.sample(buildGrammarArbitrary(grammar, 'number'), 20);

    expect(samples.every((sample) => /^\d+$/.test(sample))).toBe(true);
  });

  it('generates digit strings for the number rule in EBNF calc', () => {
    const grammar = loadGrammar(calcEbnfPath);
    const samples = fc.sample(buildGrammarArbitrary(grammar, 'number'), 20);

    expect(samples.every((sample) => /^\d+$/.test(sample))).toBe(true);
  });

  it('throws when the start rule does not exist', () => {
    const grammar = compileEbnfGrammar('main ::= "x" ;');

    expect(() => buildGrammarArbitrary(grammar, 'missing')).toThrow(
      /Nothing matches rule: missing!/,
    );
  });

  it('is reproducible under a fixed random seed', () => {
    const grammar = loadGrammar(calcNePath);
    const arb = buildGrammarArbitrary(grammar, 'main');
    const first = fc.sample(arb, { numRuns: 5, seed: 42 });
    const second = fc.sample(arb, { numRuns: 5, seed: 42 });

    expect(first).toEqual(second);
  });

  it('generates shorter strings when depthSize is small', () => {
    const grammar = loadGrammar(calcNePath);
    const small = fc.sample(buildGrammarArbitrary(grammar, 'main', { depthSize: 'small' }), {
      numRuns: 40,
      seed: 7,
    });
    const large = fc.sample(buildGrammarArbitrary(grammar, 'main', { depthSize: 'large' }), {
      numRuns: 40,
      seed: 7,
    });
    const averageLength = (samples: string[]) =>
      samples.reduce((total, sample) => total + sample.length, 0) / samples.length;

    expect(averageLength(small)).toBeLessThan(averageLength(large));
  });
});

describe('buildGrammarDerivationArbitrary', () => {
  it('renders derivation trees into grammar strings', () => {
    const grammar = compileEbnfGrammar('main ::= "a" | "b" ;');
    const samples = fc
      .sample(buildGrammarDerivationArbitrary(grammar, 'main'), 10)
      .map(renderDerivation);

    expect(samples.every((sample) => sample === 'a' || sample === 'b')).toBe(true);
  });
});
