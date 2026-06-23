import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { buildGrammarArbitrary } from './generate.js';
import type { Grammar, GrammarNode } from './ir.js';

function grammarFrom(rules: Record<string, GrammarNode>, start?: string): Grammar {
  const map = new Map<string, GrammarNode>(Object.entries(rules));
  return start === undefined ? { rules: map } : { start, rules: map };
}

describe('buildGrammarArbitrary', () => {
  it('emits literal values verbatim', () => {
    const arb = buildGrammarArbitrary(
      grammarFrom({ main: { type: 'literal', value: 'hi' } }),
      'main',
    );

    expect(fc.sample(arb, 5)).toEqual(['hi', 'hi', 'hi', 'hi', 'hi']);
  });

  it('emits the empty string for empty nodes', () => {
    const arb = buildGrammarArbitrary(grammarFrom({ main: { type: 'empty' } }), 'main');

    expect(fc.sample(arb, 3)).toEqual(['', '', '']);
  });

  it('concatenates sequences in order', () => {
    const arb = buildGrammarArbitrary(
      grammarFrom({
        main: {
          type: 'sequence',
          items: [
            { type: 'literal', value: 'a' },
            { type: 'literal', value: 'b' },
            { type: 'literal', value: 'c' },
          ],
        },
      }),
      'main',
    );

    expect(fc.sample(arb, 3)).toEqual(['abc', 'abc', 'abc']);
  });

  it('resolves references between rules', () => {
    const arb = buildGrammarArbitrary(
      grammarFrom({
        main: {
          type: 'sequence',
          items: [
            { type: 'reference', name: 'x' },
            { type: 'reference', name: 'x' },
          ],
        },
        x: { type: 'literal', value: 'z' },
      }),
      'main',
    );

    expect(fc.sample(arb, 3)).toEqual(['zz', 'zz', 'zz']);
  });

  it('selects among choice alternatives', () => {
    const arb = buildGrammarArbitrary(
      grammarFrom({
        main: {
          type: 'choice',
          alternatives: [
            { type: 'literal', value: 'a' },
            { type: 'literal', value: 'b' },
          ],
        },
      }),
      'main',
    );

    const samples = fc.sample(arb, 100);
    expect(samples.every((s) => s === 'a' || s === 'b')).toBe(true);
    expect(new Set(samples).size).toBe(2);
  });

  it('generates present and absent values for optionals', () => {
    const arb = buildGrammarArbitrary(
      grammarFrom({ main: { type: 'optional', item: { type: 'literal', value: 'x' } } }),
      'main',
    );

    const samples = fc.sample(arb, 100);
    expect(samples.every((s) => s === '' || s === 'x')).toBe(true);
    expect(samples).toContain('');
    expect(samples).toContain('x');
  });

  it('honours repetition lower bounds', () => {
    const zeroOrMore = buildGrammarArbitrary(
      grammarFrom({
        main: { type: 'repetition', item: { type: 'literal', value: 'a' }, kind: 'zeroOrMore' },
      }),
      'main',
    );
    const oneOrMore = buildGrammarArbitrary(
      grammarFrom({
        main: { type: 'repetition', item: { type: 'literal', value: 'a' }, kind: 'oneOrMore' },
      }),
      'main',
    );

    expect(fc.sample(zeroOrMore, 200).every((s) => /^a*$/.test(s))).toBe(true);
    expect(fc.sample(zeroOrMore, 200)).toContain('');
    expect(fc.sample(oneOrMore, 200).every((s) => /^a+$/.test(s))).toBe(true);
    expect(fc.sample(oneOrMore, 200)).not.toContain('');
  });

  it('generates characters matching a character class', () => {
    const arb = buildGrammarArbitrary(
      grammarFrom({ main: { type: 'charClass', source: '[a-c]', flags: '' } }),
      'main',
    );

    const samples = fc.sample(arb, 200);
    expect(samples.every((s) => /^[a-c]$/.test(s))).toBe(true);
    // Every character in the class must be reachable.
    expect(new Set(samples)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('samples the inclusive upper bound of the scanned code point range', () => {
    const arb = buildGrammarArbitrary(
      // U+00FF is the last scanned code point; an exclusive loop bound would miss it.
      grammarFrom({ main: { type: 'charClass', source: '\u00ff', flags: '' } }),
      'main',
    );

    expect(fc.sample(arb, 10)).toEqual(Array.from({ length: 10 }, () => '\u00ff'));
  });

  it('strips stateful regex flags when sampling a character class', () => {
    const arb = buildGrammarArbitrary(
      grammarFrom({ main: { type: 'charClass', source: '[a-c]', flags: 'g' } }),
      'main',
    );

    // A retained global flag would make `.test` stateful and drop matches.
    expect(new Set(fc.sample(arb, 200))).toEqual(new Set(['a', 'b', 'c']));
  });

  it('caps repetition length with maxRepetitions', () => {
    const arb = buildGrammarArbitrary(
      grammarFrom({
        main: { type: 'repetition', item: { type: 'literal', value: 'a' }, kind: 'zeroOrMore' },
      }),
      'main',
      { maxRepetitions: 3 },
    );

    expect(fc.sample(arb, 200).every((s) => s.length <= 3)).toBe(true);
  });

  it('terminates and bounds recursive grammars with maxDepth', () => {
    const recursive = grammarFrom({
      expr: {
        type: 'choice',
        alternatives: [
          { type: 'literal', value: '1' },
          {
            type: 'sequence',
            items: [
              { type: 'reference', name: 'expr' },
              { type: 'literal', value: '+' },
              { type: 'reference', name: 'expr' },
            ],
          },
        ],
      },
    });

    const bounded = buildGrammarArbitrary(recursive, 'expr', { maxDepth: 1 });
    const samples = fc.sample(bounded, 500);
    expect(samples.every((s) => /^[1+]+$/.test(s))).toBe(true);
    // A depth bound of 1 permits at most a single recursive expansion, so no
    // sample can contain more than one operator. Without the bound, recursive
    // expansion produces many more.
    expect(samples.every((s) => (s.match(/\+/g) ?? []).length <= 1)).toBe(true);

    const unbounded = buildGrammarArbitrary(recursive, 'expr');
    const unboundedMaxPluses = Math.max(
      ...fc.sample(unbounded, 500).map((s) => (s.match(/\+/g) ?? []).length),
    );
    expect(unboundedMaxPluses).toBeGreaterThan(1);
  });

  it('terminates recursive grammars even without explicit depth bounds', () => {
    const recursive = grammarFrom({
      list: {
        type: 'choice',
        alternatives: [
          { type: 'literal', value: 'x' },
          {
            type: 'sequence',
            items: [
              { type: 'literal', value: 'x' },
              { type: 'reference', name: 'list' },
            ],
          },
        ],
      },
    });

    const arb = buildGrammarArbitrary(recursive, 'list');
    const samples = fc.sample(arb, 200);
    expect(samples.every((s) => /^x+$/.test(s))).toBe(true);
  });

  it('shrinks failing counterexamples toward minimal strings', () => {
    const recursive = grammarFrom({
      expr: {
        type: 'choice',
        alternatives: [
          { type: 'literal', value: '1' },
          {
            type: 'sequence',
            items: [
              { type: 'reference', name: 'expr' },
              { type: 'literal', value: '+' },
              { type: 'literal', value: '1' },
            ],
          },
        ],
      },
    });
    const arb = buildGrammarArbitrary(recursive, 'expr');

    const run = fc.check(
      fc.property(arb, (source) => !source.includes('+')),
      { numRuns: 500, seed: 42 },
    );

    expect(run.failed).toBe(true);
    // Because the arbitrary is composed from fast-check primitives, the reported
    // counterexample is a minimal well-formed expression rather than the large
    // random string a black-box generator would surface.
    const counterexample = run.counterexample?.[0] ?? '';
    expect(counterexample).toMatch(/^1(\+1)+$/);
    expect(counterexample.length).toBeLessThanOrEqual(5);
  });

  it('throws when the start rule is missing', () => {
    expect(() =>
      buildGrammarArbitrary(grammarFrom({ main: { type: 'literal', value: 'x' } }), 'missing'),
    ).toThrow(/no rule named "missing"/);
  });

  it('throws when a rule references an undefined rule', () => {
    expect(() =>
      buildGrammarArbitrary(grammarFrom({ main: { type: 'reference', name: 'ghost' } }), 'main'),
    ).toThrow(/references undefined rule "ghost"/);
  });

  it('detects undefined references nested inside every composite node', () => {
    const ghost: GrammarNode = { type: 'reference', name: 'ghost' };

    const cases: GrammarNode[] = [
      { type: 'sequence', items: [{ type: 'literal', value: 'a' }, ghost] },
      { type: 'choice', alternatives: [{ type: 'literal', value: 'a' }, ghost] },
      { type: 'optional', item: ghost },
      { type: 'repetition', item: ghost, kind: 'zeroOrMore' },
    ];

    for (const node of cases) {
      expect(() => buildGrammarArbitrary(grammarFrom({ main: node }), 'main')).toThrow(
        /references undefined rule "ghost"/,
      );
    }
  });

  it('treats literal, empty, and char-class nodes as reference-free', () => {
    const node: GrammarNode = {
      type: 'sequence',
      items: [
        { type: 'empty' },
        { type: 'literal', value: 'x' },
        { type: 'charClass', source: '[0-9]', flags: '' },
      ],
    };

    expect(() => buildGrammarArbitrary(grammarFrom({ main: node }), 'main')).not.toThrow();
  });

  it('throws when a character class matches nothing in range', () => {
    expect(() =>
      buildGrammarArbitrary(
        grammarFrom({ main: { type: 'charClass', source: '[\\u{1F600}]', flags: 'u' } }),
        'main',
      ),
    ).toThrow(/matches no characters/);
  });
});
