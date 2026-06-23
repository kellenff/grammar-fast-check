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

    expect(nearleySource).toContain('opt ->');
    expect(nearleySource).toContain('many -> digit:*');
    expect(nearleySource).toContain('one -> digit:+');
  });
});
