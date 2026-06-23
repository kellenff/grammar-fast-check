import fc from 'fast-check';
import { buildGrammarArbitrary } from './generator/index.js';
import { loadGrammar, type CompiledNearleyGrammar } from './load.js';
import type { GrammarArbOptions } from './generator/types.js';

export function grammarArb(
  grammarPath: string,
  startRule: string,
  options?: GrammarArbOptions,
): fc.Arbitrary<string> {
  const grammar = loadGrammar(grammarPath);
  return buildGrammarArbitrary(grammar, startRule, options);
}

export function grammarArbFromCompiled(
  grammar: CompiledNearleyGrammar,
  startRule: string,
  options?: GrammarArbOptions,
): fc.Arbitrary<string> {
  return buildGrammarArbitrary(grammar, startRule, options);
}

export type { GrammarArbOptions } from './generator/types.js';
