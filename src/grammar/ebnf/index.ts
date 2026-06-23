import { readFileSync } from 'node:fs';
import type { Grammar } from '../ir.js';
import { ebnfToGrammar } from './ir.js';
import { parseEbnf } from './parse.js';

export type { EbnfExpression, EbnfGrammar, EbnfRule } from './ast.js';
export { ebnfToGrammar } from './ir.js';
export { parseEbnf } from './parse.js';

/** Parse EBNF source and lower it into the {@link Grammar} IR. */
export function compileEbnfGrammar(source: string): Grammar {
  return ebnfToGrammar(parseEbnf(source));
}

/** Read an EBNF grammar file from disk and lower it into the {@link Grammar} IR. */
export function loadEbnfGrammar(grammarPath: string): Grammar {
  return compileEbnfGrammar(readFileSync(grammarPath, 'utf8'));
}
