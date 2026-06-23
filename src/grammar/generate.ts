import fc from 'fast-check';
import type { Grammar, GrammarNode } from './ir.js';

export type GrammarArbitraryOptions = {
  /**
   * Upper bound on recursion depth through {@link GrammarNode} choices and
   * optionals. Lower values keep generated strings small; omit for fast-check's
   * size-driven default, which already terminates recursive grammars.
   */
  readonly maxDepth?: number;
  /** Upper bound on the number of elements produced for a repetition (`*`/`+`). */
  readonly maxRepetitions?: number;
};

const MAX_SCANNED_CODE_POINT = 0xff;

/**
 * Build an `Arbitrary<string>` that emits strings accepted by `grammar`,
 * starting from `startRule`.
 *
 * Recursion is wired through {@link fc.letrec} so mutually recursive rules
 * resolve lazily, and every choice shares a single depth identifier so callers
 * can bound recursion with {@link GrammarArbitraryOptions.maxDepth}. Because the
 * arbitrary is composed entirely from fast-check primitives, shrinking works
 * natively: counterexamples reduce toward shorter strings and earlier
 * alternatives.
 */
export function buildGrammarArbitrary(
  grammar: Grammar,
  startRule: string,
  options: GrammarArbitraryOptions = {},
): fc.Arbitrary<string> {
  validateReferences(grammar, startRule);

  const depthIdentifier = fc.createDepthIdentifier();
  const arbitraries = fc.letrec<Record<string, string>>((tie) => {
    const record: Record<string, fc.Arbitrary<string>> = {};
    for (const [name, node] of grammar.rules) {
      record[name] = nodeToArbitrary(node, tie, depthIdentifier, options);
    }
    return record;
  });

  // validateReferences has already guaranteed the start rule exists.
  return arbitraries[startRule]!;
}

function nodeToArbitrary(
  node: GrammarNode,
  tie: (name: string) => fc.Arbitrary<string>,
  depthIdentifier: fc.DepthIdentifier,
  options: GrammarArbitraryOptions,
): fc.Arbitrary<string> {
  switch (node.type) {
    case 'empty':
      return fc.constant('');
    case 'literal':
      return fc.constant(node.value);
    case 'reference':
      return tie(node.name);
    case 'charClass':
      return charClassArbitrary(node.source, node.flags);
    case 'sequence':
      return concat(node.items.map((item) => nodeToArbitrary(item, tie, depthIdentifier, options)));
    case 'choice': {
      const alternatives = node.alternatives.map((alternative) =>
        nodeToArbitrary(alternative, tie, depthIdentifier, options),
      );
      return fc.oneof(depthConstraints(depthIdentifier, options), ...alternatives);
    }
    case 'optional': {
      const item = nodeToArbitrary(node.item, tie, depthIdentifier, options);
      return fc.option(item, { nil: '', ...depthConstraints(depthIdentifier, options) });
    }
    case 'repetition': {
      const item = nodeToArbitrary(node.item, tie, depthIdentifier, options);
      const minLength = node.kind === 'oneOrMore' ? 1 : 0;
      const constraints =
        options.maxRepetitions === undefined
          ? { minLength }
          : { minLength, maxLength: options.maxRepetitions };
      return fc.array(item, constraints).map((parts) => parts.join(''));
    }
  }
}

function depthConstraints(
  depthIdentifier: fc.DepthIdentifier,
  options: GrammarArbitraryOptions,
): { depthIdentifier: fc.DepthIdentifier; maxDepth?: number } {
  return options.maxDepth === undefined
    ? { depthIdentifier }
    : { depthIdentifier, maxDepth: options.maxDepth };
}

// Sequence nodes always carry at least two items (the IR collapses shorter
// sequences), so concatenation only needs the multi-element case.
function concat(arbitraries: fc.Arbitrary<string>[]): fc.Arbitrary<string> {
  return fc.tuple(...arbitraries).map((parts) => parts.join(''));
}

/**
 * Turn a regular-expression character class into an arbitrary that emits a
 * single matching character. The class is sampled by scanning code points
 * U+0000..U+00FF, which covers the ASCII and Latin-1 ranges used by typical
 * grammars (`[0-9]`, `[a-zA-Z]`, `\d`, `.`, ...).
 */
function charClassArbitrary(source: string, flags: string): fc.Arbitrary<string> {
  const regex = new RegExp(source, flags.replace(/[gy]/g, ''));
  const matches: string[] = [];
  for (let codePoint = 0; codePoint <= MAX_SCANNED_CODE_POINT; codePoint += 1) {
    const character = String.fromCodePoint(codePoint);
    if (regex.test(character)) {
      matches.push(character);
    }
  }
  if (matches.length === 0) {
    throw new Error(
      `Character class /${source}/ matches no characters in the scanned range (U+0000..U+00FF)`,
    );
  }
  return fc.constantFrom(...matches);
}

function validateReferences(grammar: Grammar, startRule: string): void {
  if (!grammar.rules.has(startRule)) {
    throw new Error(`Grammar has no rule named "${startRule}"`);
  }
  for (const [name, node] of grammar.rules) {
    for (const reference of collectReferences(node)) {
      if (!grammar.rules.has(reference)) {
        throw new Error(`Rule "${name}" references undefined rule "${reference}"`);
      }
    }
  }
}

function collectReferences(node: GrammarNode, acc: Set<string> = new Set()): Set<string> {
  switch (node.type) {
    case 'reference':
      acc.add(node.name);
      break;
    case 'sequence':
      for (const item of node.items) {
        collectReferences(item, acc);
      }
      break;
    case 'choice':
      for (const alternative of node.alternatives) {
        collectReferences(alternative, acc);
      }
      break;
    case 'optional':
      collectReferences(node.item, acc);
      break;
    case 'repetition':
      collectReferences(node.item, acc);
      break;
    case 'empty':
    case 'literal':
    case 'charClass':
      break;
  }
  return acc;
}
