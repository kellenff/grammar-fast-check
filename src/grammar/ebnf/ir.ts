import type { Grammar, GrammarNode } from '../ir.js';
import { buildGrammar, choiceOf, sequenceOf } from '../ir.js';
import type { EbnfExpression, EbnfGrammar } from './ast.js';

/** Lower a parsed EBNF grammar into the format-agnostic {@link Grammar} IR. */
export function ebnfToGrammar(grammar: EbnfGrammar): Grammar {
  return buildGrammar(
    grammar.rules.map((rule) => [rule.name, expressionToNode(rule.definition)] as const),
  );
}

function expressionToNode(expression: EbnfExpression): GrammarNode {
  switch (expression.type) {
    case 'identifier':
      return { type: 'reference', name: expression.name };
    case 'terminal':
      return expression.value === ''
        ? { type: 'empty' }
        : { type: 'literal', value: expression.value };
    case 'sequence':
      return sequenceOf(expression.items.map(expressionToNode));
    case 'alternation':
      return choiceOf(expression.items.map(expressionToNode));
    case 'optional':
      return { type: 'optional', item: expressionToNode(expression.item) };
    case 'repetition':
      return { type: 'repetition', item: expressionToNode(expression.item), kind: expression.kind };
    case 'group':
      return expressionToNode(expression.item);
  }
}
