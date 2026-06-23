import { describe, expect, it } from 'vitest';
import { compileEbnfGrammar } from './index.js';

const calcEbnf = `
main ::= expr ;

expr ::= term
       | expr "+" term
       | expr "-" term ;

term ::= factor
       | term "*" factor ;

factor ::= number
         | "(" expr ")" ;

number ::= digit { digit } ;

digit ::= "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" ;
`;

describe('compileEbnfGrammar', () => {
  it('compiles EBNF source into a nearley grammar object', () => {
    const compiled = compileEbnfGrammar(calcEbnf);

    expect(compiled.ParserRules.length).toBeGreaterThan(0);
    expect(compiled.ParserStart).toContain('main');
  });
});
