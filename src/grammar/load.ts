import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { compileEbnfGrammar } from './ebnf/index.js';
import type { Grammar } from './ir.js';
import { compileNearleyGrammar } from './nearley.js';

export { compileEbnfGrammar } from './ebnf/index.js';
export { compileNearleyGrammar } from './nearley.js';

/**
 * Load a grammar file and lower it into the {@link Grammar} IR. The surface
 * syntax is detected from the file extension: `.ebnf` files use the EBNF
 * front-end, everything else is treated as nearley (`.ne`) source.
 */
export function loadGrammar(grammarPath: string): Grammar {
  const grammarSource = readFileSync(grammarPath, 'utf8');
  if (extname(grammarPath).toLowerCase() === '.ebnf') {
    return compileEbnfGrammar(grammarSource);
  }
  return compileNearleyGrammar(grammarSource);
}

/** Load an EBNF grammar file and lower it into the {@link Grammar} IR. */
export function loadEbnfGrammar(grammarPath: string): Grammar {
  return compileEbnfGrammar(readFileSync(grammarPath, 'utf8'));
}
