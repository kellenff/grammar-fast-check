import { describe, expect, it } from 'vitest';
import { compileNearleyGrammar } from '../load.js';
import { emitNearley } from './emit.js';
import { parseEbnf } from './parse.js';

describe('emitNearley', () => {
  it('transpiles alternation and terminals to nearley syntax', () => {
    const grammar = parseEbnf(`
      expr ::= term | expr "+" term ;
      term ::= "1" ;
    `);

    const nearleySource = emitNearley(grammar);

    expect(nearleySource).toContain('expr -> term');
    expect(nearleySource).toContain('| expr "+" term');
    expect(nearleySource).toContain('term -> "1"');

    const compiled = compileNearleyGrammar(nearleySource);
    expect(compiled.ParserRules.length).toBeGreaterThan(0);
  });

  it('transpiles optional and repetition constructs', () => {
    const grammar = parseEbnf(`
      opt ::= [ "x" ] ;
      many ::= digit* ;
      one ::= digit+ ;
    `);

    const nearleySource = emitNearley(grammar);

    expect(nearleySource).toContain('opt -> "x":?');
    expect(nearleySource).toContain('many -> digit:*');
    expect(nearleySource).toContain('one -> digit:+');
  });

  it('formats alternation as multi-line nearley rules', () => {
    const grammar = parseEbnf(`
      choice ::= "a" | "b" | "c" ;
    `);

    const nearleySource = emitNearley(grammar);

    expect(nearleySource).toBe(`choice -> "a"
      | "b"
      | "c"
`);
  });

  it('wraps grouped and composite expressions when emitting optionals', () => {
    const grammar = parseEbnf(`
      opt_seq ::= [ a b ] ;
      opt_alt ::= [ a | b ] ;
    `);

    const nearleySource = emitNearley(grammar);

    expect(nearleySource).toContain('opt_seq -> (a b):?');
    expect(nearleySource).toContain('opt_alt -> (a | b):?');
  });

  it('wraps grouped and composite expressions when emitting repetitions', () => {
    const grammar = parseEbnf(`
      rep_seq ::= ( a b )+ ;
      rep_alt ::= ( a | b )* ;
    `);

    const nearleySource = emitNearley(grammar);

    expect(nearleySource).toContain('rep_seq -> ((a b)):+');
    expect(nearleySource).toContain('rep_alt -> ((a | b)):*');
  });

  it('emits grouped expressions and escapes terminal metacharacters', () => {
    const grammar = parseEbnf(`
      group ::= ( a | b ) ;
      quote ::= "\\" \\\\" ;
    `);

    const nearleySource = emitNearley(grammar);

    expect(nearleySource).toContain('group -> (a | b)');
    expect(nearleySource).toContain('quote -> "\\" \\\\"');
  });

  it('groups nested optional and repeated expressions', () => {
    const grammar = parseEbnf(`
      nested_opt ::= [ [ "x" ] ] ;
      nested_rep ::= ( digit* )+ ;
    `);

    const nearleySource = emitNearley(grammar);

    expect(nearleySource).toContain('nested_opt -> ("x":?):?');
    expect(nearleySource).toContain('nested_rep -> ((digit:*)):+');
  });
});
