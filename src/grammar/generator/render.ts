import type { DerivationNode } from './types.js';

export function renderDerivation(node: DerivationNode): string {
  if (node.kind === 'literal') {
    return node.value;
  }

  return node.children.map(renderDerivation).join('');
}
