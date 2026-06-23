import { describe, expect, it } from 'vitest';
import { parseEbnf } from './parse.js';
import { ebnfToGrammar } from './ir.js';

describe('ebnfToGrammar', () => {
  it('uses the first rule as the start rule', () => {
    const grammar = ebnfToGrammar(parseEbnf('main ::= a ; a ::= "x" ;'));

    expect(grammar.start).toBe('main');
  });

  it('maps every EBNF construct to its IR node', () => {
    const grammar = ebnfToGrammar(
      parseEbnf(`
        ident ::= other ;
        term ::= "x" ;
        seq ::= "a" "b" ;
        alt ::= "a" | "b" ;
        opt ::= [ "a" ] ;
        star ::= "a"* ;
        plus ::= "a"+ ;
        grp ::= ( "a" "b" ) ;
        other ::= "o" ;
      `),
    );

    expect(grammar.rules.get('ident')).toEqual({ type: 'reference', name: 'other' });
    expect(grammar.rules.get('term')).toEqual({ type: 'literal', value: 'x' });
    expect(grammar.rules.get('seq')).toEqual({
      type: 'sequence',
      items: [
        { type: 'literal', value: 'a' },
        { type: 'literal', value: 'b' },
      ],
    });
    expect(grammar.rules.get('alt')).toEqual({
      type: 'choice',
      alternatives: [
        { type: 'literal', value: 'a' },
        { type: 'literal', value: 'b' },
      ],
    });
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
    // A group is transparent: it lowers to the node it wraps.
    expect(grammar.rules.get('grp')).toEqual({
      type: 'sequence',
      items: [
        { type: 'literal', value: 'a' },
        { type: 'literal', value: 'b' },
      ],
    });
  });

  it('lowers an empty terminal to an empty node', () => {
    const grammar = ebnfToGrammar(parseEbnf('main ::= "" ;'));

    expect(grammar.rules.get('main')).toEqual({ type: 'empty' });
  });

  it('merges repeated rule names into a single choice', () => {
    const grammar = ebnfToGrammar(parseEbnf('dup ::= "a" ; dup ::= "b" ;'));

    expect(grammar.rules.get('dup')).toEqual({
      type: 'choice',
      alternatives: [
        { type: 'literal', value: 'a' },
        { type: 'literal', value: 'b' },
      ],
    });
  });
});
