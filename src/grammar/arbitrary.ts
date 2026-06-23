import fc from 'fast-check';
import unparse from 'nearley-unparse';
import { loadGrammar, type CompiledNearleyGrammar } from './load.js';

export function grammarArb(grammarPath: string, startRule: string): fc.Arbitrary<string> {
  const grammar = loadGrammar(grammarPath);
  return fc.constant(undefined).map(() => generateFromGrammar(grammar, startRule));
}

function generateFromGrammar(grammar: CompiledNearleyGrammar, startRule: string): string {
  return unparse(grammar, {
    start: startRule,
    max_stack_size: 10,
    max_loops: 200,
  });
}
