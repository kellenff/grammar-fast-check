import { describe, expect, it } from 'vitest';
import { compileNearleyGrammar } from './nearley.js';

describe('compileNearleyGrammar', () => {
  it('throws when nearley source cannot be parsed', () => {
    expect(() => compileNearleyGrammar('')).toThrow(/Failed to parse nearley grammar source/);
  });

  it('throws when no rules are defined', () => {
    expect(() => compileNearleyGrammar('@{% const x = 1; %}')).toThrow(/defines no rules/);
  });

  it('lowers references and literals', () => {
    const grammar = compileNearleyGrammar('main -> "a" foo\nfoo -> "b"\n');

    expect(grammar.start).toBe('main');
    expect(grammar.rules.get('main')).toEqual({
      type: 'sequence',
      items: [
        { type: 'literal', value: 'a' },
        { type: 'reference', name: 'foo' },
      ],
    });
    expect(grammar.rules.get('foo')).toEqual({ type: 'literal', value: 'b' });
  });

  it('lowers character classes into charClass nodes', () => {
    const grammar = compileNearleyGrammar('digit -> [0-9]\n');

    expect(grammar.rules.get('digit')).toEqual({ type: 'charClass', source: '[0-9]', flags: '' });
  });

  it('lowers alternations into choice nodes', () => {
    const grammar = compileNearleyGrammar('choice -> "a" | "b"\n');

    expect(grammar.rules.get('choice')).toEqual({
      type: 'choice',
      alternatives: [
        { type: 'literal', value: 'a' },
        { type: 'literal', value: 'b' },
      ],
    });
  });

  it('lowers EBNF modifiers into optional and repetition nodes', () => {
    const grammar = compileNearleyGrammar('opt -> "a":?\nstar -> "a":*\nplus -> "a":+\n');

    expect(grammar.rules.get('opt')).toEqual({
      type: 'optional',
      item: { type: 'literal', value: 'a' },
    });
    expect(grammar.rules.get('star')).toEqual({
      type: 'repetition',
      item: { type: 'literal', value: 'a' },
      kind: 'zeroOrMore',
    });
    expect(grammar.rules.get('plus')).toEqual({
      type: 'repetition',
      item: { type: 'literal', value: 'a' },
      kind: 'oneOrMore',
    });
  });

  it('lowers subexpressions into nested nodes', () => {
    const grammar = compileNearleyGrammar('grp -> ("a" "b"):+\n');

    expect(grammar.rules.get('grp')).toEqual({
      type: 'repetition',
      kind: 'oneOrMore',
      item: {
        type: 'sequence',
        items: [
          { type: 'literal', value: 'a' },
          { type: 'literal', value: 'b' },
        ],
      },
    });
  });

  it('lowers the null keyword into an empty node', () => {
    const grammar = compileNearleyGrammar('main -> null\n');

    expect(grammar.rules.get('main')).toEqual({ type: 'empty' });
  });

  it('rejects macros', () => {
    expect(() => compileNearleyGrammar('foo[X] -> $X\nmain -> foo["a"]\n')).toThrow(
      /macros are not supported/,
    );
  });

  it('rejects unsupported token types such as lexer tokens', () => {
    expect(() => compileNearleyGrammar('main -> %tok\n')).toThrow(/Unsupported nearley token/);
  });
});
