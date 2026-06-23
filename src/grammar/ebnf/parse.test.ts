import { describe, expect, it } from 'vitest';
import { parseEbnf } from './parse.js';

describe('parseEbnf', () => {
  it('parses a simple rule with alternation', () => {
    const grammar = parseEbnf(`
      expr ::= term | expr "+" term ;
    `);

    expect(grammar.rules).toHaveLength(1);
    expect(grammar.rules[0]?.name).toBe('expr');
    expect(grammar.rules[0]?.definition).toEqual({
      type: 'alternation',
      items: [
        { type: 'identifier', name: 'term' },
        {
          type: 'sequence',
          items: [
            { type: 'identifier', name: 'expr' },
            { type: 'terminal', value: '+' },
            { type: 'identifier', name: 'term' },
          ],
        },
      ],
    });
  });

  it('parses optional, repetition, and grouping', () => {
    const grammar = parseEbnf(`
      list ::= item { "," item } ;
      opt  ::= [ "x" ] ;
      grp  ::= ( a b ) ;
    `);

    expect(grammar.rules).toHaveLength(3);
    expect(grammar.rules[1]?.definition).toEqual({
      type: 'optional',
      item: { type: 'terminal', value: 'x' },
    });
    expect(grammar.rules[2]?.definition).toEqual({
      type: 'group',
      item: {
        type: 'sequence',
        items: [
          { type: 'identifier', name: 'a' },
          { type: 'identifier', name: 'b' },
        ],
      },
    });
  });

  it('parses postfix repetition operators', () => {
    const grammar = parseEbnf(`
      many ::= digit* ;
      one_or_more ::= digit+ ;
    `);

    expect(grammar.rules[0]?.definition).toEqual({
      type: 'repetition',
      item: { type: 'identifier', name: 'digit' },
      kind: 'zeroOrMore',
    });
    expect(grammar.rules[1]?.definition).toEqual({
      type: 'repetition',
      item: { type: 'identifier', name: 'digit' },
      kind: 'oneOrMore',
    });
  });

  it('accepts = as the defining symbol and omits optional terminators', () => {
    const grammar = parseEbnf(`
      main = expr
      expr = term
    `);

    expect(grammar.rules).toHaveLength(2);
    expect(grammar.rules[0]?.name).toBe('main');
    expect(grammar.rules[1]?.name).toBe('expr');
  });

  it('skips ISO-style comments', () => {
    const grammar = parseEbnf(`
      (* leading comment *)
      main ::= expr ; (* trailing comment *)
    `);

    expect(grammar.rules).toHaveLength(1);
    expect(grammar.rules[0]?.name).toBe('main');
  });

  it('throws on invalid input', () => {
    expect(() => parseEbnf('not a grammar')).toThrow(/Failed to parse EBNF/);
  });
});
