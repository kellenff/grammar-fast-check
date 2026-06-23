import type { EbnfExpression, EbnfGrammar } from './ast.js';

function quoteTerminal(value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function emitExpression(expression: EbnfExpression): string {
  switch (expression.type) {
    case 'identifier':
      return expression.name;
    case 'terminal':
      return quoteTerminal(expression.value);
    case 'sequence':
      return expression.items.map(emitExpression).join(' ');
    case 'alternation':
      return expression.items.map(emitExpression).join(' | ');
    case 'optional': {
      const inner = emitExpression(expression.item);
      if (needsGrouping(expression.item)) {
        return `(${inner}):?`;
      }
      return `${inner}:?`;
    }
    case 'repetition': {
      const inner = emitExpression(expression.item);
      const suffix = expression.kind === 'oneOrMore' ? ':+' : ':*';
      if (needsGrouping(expression.item)) {
        return `(${inner})${suffix}`;
      }
      return `${inner}${suffix}`;
    }
    case 'group':
      return `(${emitExpression(expression.item)})`;
  }
}

function needsGrouping(expression: EbnfExpression): boolean {
  return (
    expression.type === 'sequence' ||
    expression.type === 'alternation' ||
    expression.type === 'optional' ||
    expression.type === 'repetition' ||
    expression.type === 'group'
  );
}

function emitAlternationRule(name: string, expression: EbnfExpression): string[] {
  if (expression.type !== 'alternation') {
    return [`${name} -> ${emitExpression(expression)}`];
  }

  const lines = [`${name} -> ${emitExpression(expression.items[0]!)}`];
  for (const item of expression.items.slice(1)) {
    lines.push(`      | ${emitExpression(item)}`);
  }
  return lines;
}

export function emitNearley(grammar: EbnfGrammar): string {
  const lines: string[] = [];
  for (const rule of grammar.rules) {
    lines.push(...emitAlternationRule(rule.name, rule.definition), '');
  }
  return `${lines.join('\n').trimEnd()}\n`;
}
