import { describe, expect, it } from 'vitest';
import { parseNearley } from './parse.js';

describe('parseNearley', () => {
  it('parses alternation, grouping, and nearley postfix modifiers', () => {
    const grammar = parseNearley(`
      expr -> term
            | expr "+" term
      opt -> "x":?
      many -> digit:*
      one -> digit:+
    `);

    expect(grammar.rules).toHaveLength(4);
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
    expect(grammar.rules[1]?.definition).toEqual({
      type: 'optional',
      item: { type: 'terminal', value: 'x' },
    });
    expect(grammar.rules[2]?.definition).toEqual({
      type: 'repetition',
      item: { type: 'identifier', name: 'digit' },
      kind: 'zeroOrMore',
    });
    expect(grammar.rules[3]?.definition).toEqual({
      type: 'repetition',
      item: { type: 'identifier', name: 'digit' },
      kind: 'oneOrMore',
    });
  });

  it('parses character classes and expands simple ranges', () => {
    const grammar = parseNearley(`number -> [0-9]:+`);

    expect(grammar.rules[0]?.definition).toEqual({
      type: 'repetition',
      item: {
        type: 'charClass',
        chars: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
      },
      kind: 'oneOrMore',
    });
  });

  it('ignores line comments', () => {
    const grammar = parseNearley(`
      # leading comment
      main -> "x" # trailing comment
    `);

    expect(grammar.rules).toHaveLength(1);
    expect(grammar.rules[0]?.definition).toEqual({ type: 'terminal', value: 'x' });
  });
});
