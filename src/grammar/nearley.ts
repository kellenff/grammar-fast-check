import nearley from 'nearley';
import nearleyGrammar from 'nearley/lib/nearley-language-bootstrapped.js';
import type { Grammar, GrammarNode } from './ir.js';
import { buildGrammar, choiceOf, sequenceOf } from './ir.js';

type NearleyProduction = { readonly tokens: readonly unknown[] };
type NearleyRuleEntry = { readonly name: string; readonly rules: readonly NearleyProduction[] };

/**
 * Parse nearley (`.ne`) grammar source into the {@link Grammar} IR.
 *
 * The bootstrapped nearley parser produces an AST that still carries character
 * classes, literals, and EBNF modifiers (`:?`, `:*`, `:+`) before they are
 * desugared into helper rules. Lowering from that AST — rather than from
 * nearley's compiled output — keeps character classes recoverable for
 * generation.
 */
export function compileNearleyGrammar(grammarSource: string): Grammar {
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(nearleyGrammar));
  parser.feed(grammarSource);

  if (parser.results.length === 0) {
    throw new Error('Failed to parse nearley grammar source');
  }

  const ast = parser.results[0] as readonly unknown[];
  return nearleyAstToGrammar(ast);
}

/**
 * Lower a parsed nearley AST (the array of rule/macro/directive entries the
 * bootstrapped parser produces) into the {@link Grammar} IR. Exposed separately
 * from {@link compileNearleyGrammar} so the lowering can be exercised directly.
 */
export function nearleyAstToGrammar(ast: readonly unknown[]): Grammar {
  const productions: Array<readonly [string, GrammarNode]> = [];

  for (const entry of ast) {
    if (isMacroEntry(entry)) {
      throw new Error('nearley macros are not supported by grammar-fast-check');
    }
    if (!isRuleEntry(entry)) {
      continue;
    }
    for (const production of entry.rules) {
      productions.push([entry.name, sequenceOf(production.tokens.map(tokenToNode))]);
    }
  }

  if (productions.length === 0) {
    throw new Error('nearley grammar defines no rules');
  }

  return buildGrammar(productions);
}

function tokenToNode(token: unknown): GrammarNode {
  if (typeof token === 'string') {
    // nearley spells the empty production as the keyword `null`.
    return token === 'null' ? { type: 'empty' } : { type: 'reference', name: token };
  }
  if (token === null) {
    return { type: 'empty' };
  }
  if (token instanceof RegExp) {
    return { type: 'charClass', source: token.source, flags: token.flags };
  }
  if (typeof token === 'object') {
    const record = token as Record<string, unknown>;

    if (typeof record['literal'] === 'string') {
      return { type: 'literal', value: record['literal'] };
    }

    if ('ebnf' in record && 'modifier' in record) {
      return modifierToNode(tokenToNode(record['ebnf']), record['modifier']);
    }

    if (Array.isArray(record['subexpression'])) {
      const alternatives = record['subexpression'].map((production) =>
        sequenceOf(productionTokens(production).map(tokenToNode)),
      );
      return choiceOf(alternatives);
    }
  }

  throw new Error(`Unsupported nearley token: ${describe(token)}`);
}

function modifierToNode(item: GrammarNode, modifier: unknown): GrammarNode {
  switch (modifier) {
    case ':?':
      return { type: 'optional', item };
    case ':*':
      return { type: 'repetition', item, kind: 'zeroOrMore' };
    case ':+':
      return { type: 'repetition', item, kind: 'oneOrMore' };
    default:
      throw new Error(`Unsupported nearley EBNF modifier: ${describe(modifier)}`);
  }
}

function productionTokens(production: unknown): readonly unknown[] {
  if (
    typeof production === 'object' &&
    production !== null &&
    Array.isArray((production as { tokens?: unknown }).tokens)
  ) {
    return (production as NearleyProduction).tokens;
  }
  return [];
}

function isRuleEntry(entry: unknown): entry is NearleyRuleEntry {
  if (typeof entry !== 'object' || entry === null) {
    return false;
  }
  const record = entry as Record<string, unknown>;
  return typeof record['name'] === 'string' && Array.isArray(record['rules']);
}

function isMacroEntry(entry: unknown): boolean {
  if (typeof entry !== 'object' || entry === null) {
    return false;
  }
  return typeof (entry as Record<string, unknown>)['macro'] === 'string';
}

function describe(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}
