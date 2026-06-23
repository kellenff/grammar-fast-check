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
  it('lowers EBNF source into the grammar IR', () => {
    const grammar = compileEbnfGrammar(calcEbnf);

    expect(grammar.start).toBe('main');
    expect([...grammar.rules.keys()]).toEqual([
      'main',
      'expr',
      'term',
      'factor',
      'number',
      'digit',
    ]);
    expect(grammar.rules.get('main')).toEqual({ type: 'reference', name: 'expr' });
  });
});
