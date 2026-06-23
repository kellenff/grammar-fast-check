import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import fc from 'fast-check';
import { parseEbnf } from './ebnf/parse.js';
import { ebnfToArbitrary } from './ebnf/toArbitrary.js';
import { parseNearley } from './nearley/parse.js';

export function grammarArb(grammarPath: string, startRule: string): fc.Arbitrary<string> {
  const grammarSource = readFileSync(grammarPath, 'utf8');
  const grammar =
    extname(grammarPath).toLowerCase() === '.ebnf'
      ? parseEbnf(grammarSource)
      : parseNearley(grammarSource);
  return ebnfToArbitrary(grammar, startRule);
}
