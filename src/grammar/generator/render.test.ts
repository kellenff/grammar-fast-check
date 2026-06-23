import { describe, expect, it } from 'vitest';
import { renderDerivation } from './render.js';

describe('renderDerivation', () => {
  it('concatenates literal and nested sequence nodes', () => {
    const rendered = renderDerivation({
      kind: 'seq',
      children: [
        { kind: 'literal', value: '1' },
        {
          kind: 'seq',
          children: [
            { kind: 'literal', value: '+' },
            { kind: 'literal', value: '2' },
          ],
        },
      ],
    });

    expect(rendered).toBe('1+2');
  });
});
