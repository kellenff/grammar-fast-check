import { readFileSync } from 'node:fs';
import { compileNearleyGrammar } from '../load.js';
import type { CompiledNearleyGrammar } from '../load.js';
import { emitNearley } from './emit.js';
import { parseEbnf } from './parse.js';

export type { EbnfExpression, EbnfGrammar, EbnfRule } from './ast.js';
export { emitNearley } from './emit.js';
export { parseEbnf } from './parse.js';

export function compileEbnfGrammar(source: string): CompiledNearleyGrammar {
  const grammar = parseEbnf(source);
  const nearleySource = emitNearley(grammar);
  return compileNearleyGrammar(nearleySource);
}

export function loadEbnfGrammar(grammarPath: string): CompiledNearleyGrammar {
  const grammarSource = readFileSync(grammarPath, 'utf8');
  return compileEbnfGrammar(grammarSource);
}
