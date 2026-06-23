import fc from 'fast-check';
import type { EbnfExpression, EbnfGrammar } from './ast.js';

export type GrammarArbitraryOptions = {
  maxRepeat?: number;
  depthSize?: 'small' | 'medium' | 'large';
  maxDepth?: number;
};

const DEFAULT_MAX_REPEAT = 5;

type ResolvedOptions = {
  maxRepeat: number;
  depthSize: 'small' | 'medium' | 'large';
  maxDepth?: number | undefined;
};

function resolveOptions(options: GrammarArbitraryOptions): ResolvedOptions {
  return {
    maxRepeat: options.maxRepeat ?? DEFAULT_MAX_REPEAT,
    depthSize: options.depthSize ?? 'small',
    maxDepth: options.maxDepth,
  };
}

function oneofOptions(opts: ResolvedOptions): {
  depthSize: 'small' | 'medium' | 'large';
  maxDepth?: number;
} {
  if (opts.maxDepth === undefined) {
    return { depthSize: opts.depthSize };
  }
  return { depthSize: opts.depthSize, maxDepth: opts.maxDepth };
}

function joinParts(parts: string[]): string {
  return parts.join('');
}

function compileExpression(
  expression: EbnfExpression,
  tie: (name: string) => fc.Arbitrary<string>,
  opts: ResolvedOptions,
): fc.Arbitrary<string> {
  switch (expression.type) {
    case 'terminal':
      return fc.constant(expression.value);
    case 'charClass': {
      if (expression.chars.length === 0) {
        throw new Error('Cannot compile an empty character class');
      }
      const branches = expression.chars.map((char) => fc.constant(char));
      if (branches.length === 1) {
        return branches[0]!;
      }
      return fc.oneof(...branches);
    }
    case 'identifier':
      return tie(expression.name);
    case 'sequence': {
      const parts = expression.items.map((item) => compileExpression(item, tie, opts));
      if (parts.length === 0) {
        return fc.constant('');
      }
      if (parts.length === 1) {
        return parts[0]!;
      }
      return fc.tuple(...parts).map(joinParts);
    }
    case 'alternation': {
      const branches = expression.items.map((item) => compileExpression(item, tie, opts));
      if (branches.length === 0) {
        throw new Error('Cannot compile an empty alternation');
      }
      if (branches.length === 1) {
        return branches[0]!;
      }
      return fc.oneof(oneofOptions(opts), ...branches);
    }
    case 'optional':
      return fc.option(compileExpression(expression.item, tie, opts)).map((value) => value ?? '');
    case 'repetition':
      return fc
        .array(compileExpression(expression.item, tie, opts), {
          minLength: expression.kind === 'oneOrMore' ? 1 : 0,
          maxLength: opts.maxRepeat,
        })
        .map(joinParts);
    case 'group':
      return compileExpression(expression.item, tie, opts);
  }
}

export function ebnfToArbitrary(
  grammar: EbnfGrammar,
  startRule: string,
  options: GrammarArbitraryOptions = {},
): fc.Arbitrary<string> {
  const ruleNames = new Set(grammar.rules.map((rule) => rule.name));
  if (!ruleNames.has(startRule)) {
    throw new Error(`Unknown start rule: ${startRule}`);
  }

  const opts = resolveOptions(options);
  const rules = fc.letrec<{ [key: string]: string }>((tie) => {
    const entries: Record<string, fc.Arbitrary<string>> = {};
    for (const rule of grammar.rules) {
      entries[rule.name] = compileExpression(rule.definition, tie, opts);
    }
    return entries;
  });

  return rules[startRule]!;
}
