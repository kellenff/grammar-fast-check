import { describe, expect, it } from 'vitest';
import { buildGrammar, choiceOf, sequenceOf, type GrammarNode } from './ir.js';

const a: GrammarNode = { type: 'literal', value: 'a' };
const b: GrammarNode = { type: 'literal', value: 'b' };

describe('sequenceOf', () => {
  it('returns an empty node for no items', () => {
    expect(sequenceOf([])).toEqual({ type: 'empty' });
  });

  it('unwraps a single item', () => {
    expect(sequenceOf([a])).toBe(a);
  });

  it('wraps multiple items in a sequence', () => {
    expect(sequenceOf([a, b])).toEqual({ type: 'sequence', items: [a, b] });
  });
});

describe('choiceOf', () => {
  it('throws when given no alternatives', () => {
    expect(() => choiceOf([])).toThrow(/no alternatives/);
  });

  it('unwraps a single alternative', () => {
    expect(choiceOf([a])).toBe(a);
  });

  it('wraps multiple alternatives in a choice', () => {
    expect(choiceOf([a, b])).toEqual({ type: 'choice', alternatives: [a, b] });
  });
});

describe('buildGrammar', () => {
  it('uses the first production name as the start rule', () => {
    const grammar = buildGrammar([
      ['first', a],
      ['second', b],
    ]);

    expect(grammar.start).toBe('first');
    expect(grammar.rules.get('second')).toBe(b);
  });

  it('merges repeated names into a single choice', () => {
    const grammar = buildGrammar([
      ['dup', a],
      ['dup', b],
    ]);

    expect(grammar.rules.get('dup')).toEqual({ type: 'choice', alternatives: [a, b] });
  });

  it('produces no start rule for an empty production list', () => {
    const grammar = buildGrammar([]);

    // The `start` key must be absent (not merely undefined) so the grammar
    // shape matches a front-end that never saw a rule.
    expect('start' in grammar).toBe(false);
    expect(grammar.rules.size).toBe(0);
  });
});
