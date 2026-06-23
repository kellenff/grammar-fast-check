/**
 * Format-agnostic grammar intermediate representation.
 *
 * Both the EBNF front-end and the nearley front-end lower their parse trees into
 * this representation, and the fast-check generator consumes it. Keeping a single
 * IR means the generator never has to know which surface syntax produced a rule.
 */

export type GrammarNode =
  | { readonly type: 'empty' }
  | { readonly type: 'literal'; readonly value: string }
  | { readonly type: 'reference'; readonly name: string }
  | { readonly type: 'charClass'; readonly source: string; readonly flags: string }
  | { readonly type: 'sequence'; readonly items: readonly GrammarNode[] }
  | { readonly type: 'choice'; readonly alternatives: readonly GrammarNode[] }
  | { readonly type: 'optional'; readonly item: GrammarNode }
  | {
      readonly type: 'repetition';
      readonly item: GrammarNode;
      readonly kind: 'zeroOrMore' | 'oneOrMore';
    };

export type Grammar = {
  /** Name of the rule a front-end considers the entry point, when known. */
  readonly start?: string;
  readonly rules: ReadonlyMap<string, GrammarNode>;
};

/** Collapse a list of nodes into a single sequence node, simplifying trivial cases. */
export function sequenceOf(items: GrammarNode[]): GrammarNode {
  if (items.length === 0) {
    return { type: 'empty' };
  }
  if (items.length === 1) {
    return items[0]!;
  }
  return { type: 'sequence', items };
}

/** Collapse a list of alternatives into a single choice node, simplifying trivial cases. */
export function choiceOf(alternatives: GrammarNode[]): GrammarNode {
  if (alternatives.length === 0) {
    throw new Error('Cannot build a choice with no alternatives');
  }
  if (alternatives.length === 1) {
    return alternatives[0]!;
  }
  return { type: 'choice', alternatives };
}

/**
 * Build a {@link Grammar} from named productions, merging repeated names into a
 * single choice. The first name encountered becomes the default start rule.
 */
export function buildGrammar(productions: Iterable<readonly [string, GrammarNode]>): Grammar {
  const grouped = new Map<string, GrammarNode[]>();
  let start: string | undefined;

  for (const [name, node] of productions) {
    if (start === undefined) {
      start = name;
    }
    const existing = grouped.get(name);
    if (existing === undefined) {
      grouped.set(name, [node]);
    } else {
      existing.push(node);
    }
  }

  const rules = new Map<string, GrammarNode>();
  for (const [name, nodes] of grouped) {
    rules.set(name, choiceOf(nodes));
  }

  return start === undefined ? { rules } : { start, rules };
}
