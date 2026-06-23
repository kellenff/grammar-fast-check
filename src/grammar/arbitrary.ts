import type fc from 'fast-check';
import { buildGrammarArbitrary, type GrammarArbitraryOptions } from './generate.js';
import { loadGrammar } from './load.js';

export type { GrammarArbitraryOptions } from './generate.js';

/**
 * Build a native fast-check `Arbitrary<string>` from a grammar file.
 *
 * The grammar is parsed into a format-agnostic IR and compiled into an
 * arbitrary built entirely from fast-check primitives, so generated strings
 * shrink toward minimal counterexamples and recursion depth / repetition counts
 * can be bounded through `options`.
 *
 * @param grammarPath Path to an `.ebnf` or `.ne` grammar file.
 * @param startRule Name of the rule to generate from.
 * @param options Optional bounds on recursion depth and repetition length.
 */
export function grammarArb(
  grammarPath: string,
  startRule: string,
  options?: GrammarArbitraryOptions,
): fc.Arbitrary<string> {
  const grammar = loadGrammar(grammarPath);
  return buildGrammarArbitrary(grammar, startRule, options);
}
