import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compileNearleyGrammar, loadEbnfGrammar, loadGrammar } from './load.js';

const calcEbnfPath = fileURLToPath(new URL('../../examples/calc/calc.ebnf', import.meta.url));
const calcNePath = fileURLToPath(new URL('../../examples/calc/calc.ne', import.meta.url));

describe('loadGrammar', () => {
  it('compiles .ebnf files through the EBNF front-end', () => {
    const grammar = loadGrammar(calcEbnfPath);

    expect(grammar.rules.has('main')).toBe(true);
    expect(grammar.start).toBe('main');
  });

  it('compiles .ne files through the nearley front-end', () => {
    const grammar = loadGrammar(calcNePath);

    expect(grammar.rules.has('main')).toBe(true);
    expect(grammar.start).toBe('main');
  });

  it('detects EBNF files case-insensitively by extension', () => {
    const dir = mkdtempSync(join(tmpdir(), 'grammar-fast-check-'));
    const grammarPath = join(dir, 'grammar.EBNF');
    writeFileSync(grammarPath, 'main ::= "x" ;');

    const grammar = loadGrammar(grammarPath);

    expect(grammar.rules.get('main')).toEqual({ type: 'literal', value: 'x' });
  });
});

describe('loadEbnfGrammar', () => {
  it('reads an EBNF file from disk and lowers it to the IR', () => {
    const grammar = loadEbnfGrammar(calcEbnfPath);

    expect(grammar.rules.has('digit')).toBe(true);
    expect(grammar.start).toBe('main');
  });
});

describe('compileNearleyGrammar', () => {
  it('throws when nearley source cannot be parsed', () => {
    expect(() => compileNearleyGrammar('')).toThrow(/Failed to parse nearley grammar source/);
  });
});
