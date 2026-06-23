import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parseEbnf } from './parse.js';
import { ebnfToArbitrary } from './toArbitrary.js';

describe('ebnfToArbitrary', () => {
  it('generates strings that match terminal and alternation rules', () => {
    const grammar = parseEbnf(`
      digit ::= "0" | "1" | "2" ;
      number ::= digit { digit } ;
    `);
    const arb = ebnfToArbitrary(grammar, 'number');
    const samples = fc.sample(arb, 50);

    expect(samples.every((sample) => /^[012]+$/.test(sample))).toBe(true);
    expect(samples.some((sample) => sample.length > 1)).toBe(true);
  });

  it('supports recursive rules through fc.letrec', () => {
    const grammar = parseEbnf(`
      expr ::= term | expr "+" term ;
      term ::= "1" ;
    `);
    const arb = ebnfToArbitrary(grammar, 'expr');
    const samples = fc.sample(arb, 30);

    expect(samples.every((sample) => /^1(\+1)*$/.test(sample))).toBe(true);
    expect(samples.some((sample) => sample.includes('+'))).toBe(true);
  });

  it('throws for unknown start rules', () => {
    const grammar = parseEbnf(`main ::= "x" ;`);

    expect(() => ebnfToArbitrary(grammar, 'missing')).toThrow(/Unknown start rule/);
  });

  it('shrinks counterexamples through fast-check', () => {
    const grammar = parseEbnf(`
      many ::= "a"* ;
    `);
    const arb = ebnfToArbitrary(grammar, 'many', { maxRepeat: 10 });

    try {
      fc.assert(
        fc.property(arb, (source) => source.length < 3),
        { numRuns: 100 },
      );
      throw new Error('Expected property to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Counterexample: ["aaa"]');
    }
  });

  it('is reproducible for a fixed seed', () => {
    const grammar = parseEbnf(`main ::= "a" | "b" ;`);
    const arb = ebnfToArbitrary(grammar, 'main');
    const seed = 42;

    const first = fc.sample(arb, { seed, numRuns: 10 });
    const second = fc.sample(arb, { seed, numRuns: 10 });

    expect(second).toEqual(first);
  });
});
