import fc from 'fast-check';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUnparse = vi.hoisted(() => vi.fn());

vi.mock('nearley-unparse', async (importOriginal) => {
  const actual = await importOriginal<typeof import('nearley-unparse')>();
  mockUnparse.mockImplementation(actual.default);
  return { default: mockUnparse };
});

import { grammarArb } from './arbitrary.js';

const calcNePath = fileURLToPath(new URL('../../examples/calc/calc.ne', import.meta.url));

describe('grammarArb', () => {
  beforeEach(() => {
    mockUnparse.mockClear();
  });

  it('forwards generation options to nearley-unparse', () => {
    fc.sample(grammarArb(calcNePath, 'expr'), 1);

    expect(mockUnparse).toHaveBeenCalledWith(
      expect.objectContaining({ ParserRules: expect.any(Array) }),
      {
        start: 'expr',
        max_stack_size: 10,
        max_loops: 200,
      },
    );
  });

  it('generates strings for the requested start rule', () => {
    const samples = fc.sample(grammarArb(calcNePath, 'number'), 20);

    expect(samples.every((sample) => /^\d+$/.test(sample))).toBe(true);
  });
});
