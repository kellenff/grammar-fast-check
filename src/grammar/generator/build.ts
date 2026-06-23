import fc from 'fast-check';
import type { CompiledNearleyGrammar } from '../load.js';
import { renderDerivation } from './render.js';
import type {
  DerivationNode,
  GrammarArbOptions,
  NearleyCharclassSymbol,
  NearleyProduction,
  NearleySymbol,
} from './types.js';

function groupProductions(grammar: CompiledNearleyGrammar): Map<string, NearleyProduction[]> {
  const grouped = new Map<string, NearleyProduction[]>();

  for (const rule of grammar.ParserRules) {
    const productions = grouped.get(rule.name) ?? [];
    productions.push({
      name: rule.name,
      symbols: rule.symbols as NearleySymbol[],
    });
    grouped.set(rule.name, productions);
  }

  return grouped;
}

function isEpsilonSymbol(symbol: NearleySymbol): boolean {
  return typeof symbol === 'object' && !('literal' in symbol) && !('test' in symbol);
}

function charclassArbitrary(test: (value: string) => boolean): fc.Arbitrary<DerivationNode> {
  const chars: string[] = [];

  for (let code = 0; code <= 127; code++) {
    const value = String.fromCharCode(code);
    if (test(value)) {
      chars.push(value);
    }
  }

  if (chars.length === 0) {
    throw new Error('Charclass matches no supported characters');
  }

  return fc.constantFrom(...chars).map((value) => ({ kind: 'literal', value }));
}

function regexSymbolArbitrary(regex: RegExp): fc.Arbitrary<DerivationNode> {
  const { source, flags } = regex;
  const anchoredSource =
    source.startsWith('^') && source.endsWith('$') ? source : `^(?:${source})$`;

  return fc.stringMatching(new RegExp(anchoredSource, flags)).map((value) => ({
    kind: 'literal',
    value,
  }));
}

function symbolArbitrary(
  symbol: NearleySymbol,
  tie: (name: string) => fc.Arbitrary<unknown>,
): fc.Arbitrary<DerivationNode> {
  if (typeof symbol === 'string') {
    return tie(symbol) as fc.Arbitrary<DerivationNode>;
  }

  if ('literal' in symbol) {
    return fc.constant({ kind: 'literal', value: symbol.literal });
  }

  if ('test' in symbol) {
    if (symbol.test instanceof RegExp) {
      return regexSymbolArbitrary(symbol.test);
    }

    const charclass = symbol as NearleyCharclassSymbol;
    return charclassArbitrary((value) => charclass.test.call(charclass, value));
  }

  if (isEpsilonSymbol(symbol)) {
    return fc.constant({ kind: 'seq', children: [] });
  }

  throw new Error('Unsupported nearley symbol');
}

function productionArbitrary(
  production: NearleyProduction,
  tie: (name: string) => fc.Arbitrary<unknown>,
): fc.Arbitrary<DerivationNode> {
  if (production.symbols.length === 0) {
    return fc.constant({ kind: 'seq', children: [] });
  }

  return fc
    .tuple(...production.symbols.map((symbol) => symbolArbitrary(symbol, tie)))
    .map((children) => ({
      kind: 'seq',
      children,
    }));
}

function ruleArbitrary(
  productions: NearleyProduction[],
  tie: (name: string) => fc.Arbitrary<unknown>,
  depthSize: GrammarArbOptions['depthSize'],
): fc.Arbitrary<DerivationNode> {
  const alternatives = productions.map((production) => productionArbitrary(production, tie));

  if (alternatives.length === 1) {
    return alternatives[0]!;
  }

  return fc.oneof({ depthSize }, ...alternatives);
}

export function buildGrammarDerivationArbitrary(
  grammar: CompiledNearleyGrammar,
  startRule: string,
  options: GrammarArbOptions = {},
): fc.Arbitrary<DerivationNode> {
  const grouped = groupProductions(grammar);

  if (!grouped.has(startRule)) {
    throw new Error(`Nothing matches rule: ${startRule}!`);
  }

  const depthSize = options.depthSize ?? 'small';
  const ruleNames = [...grouped.keys()];

  const arbitraries = fc.letrec((tie) => {
    const entries: Record<string, fc.Arbitrary<DerivationNode>> = {};

    for (const ruleName of ruleNames) {
      entries[ruleName] = ruleArbitrary(grouped.get(ruleName)!, tie, depthSize);
    }

    return entries;
  });

  return arbitraries[startRule]! as fc.Arbitrary<DerivationNode>;
}

export function buildGrammarArbitrary(
  grammar: CompiledNearleyGrammar,
  startRule: string,
  options: GrammarArbOptions = {},
): fc.Arbitrary<string> {
  return buildGrammarDerivationArbitrary(grammar, startRule, options).map((node) =>
    renderDerivation(node),
  );
}
