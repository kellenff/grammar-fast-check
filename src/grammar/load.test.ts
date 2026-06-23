import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compileNearleyGrammar, loadEbnfGrammar, loadGrammar } from './load.js';

const calcEbnfPath = fileURLToPath(new URL('../../examples/calc/calc.ebnf', import.meta.url));
const calcNePath = fileURLToPath(new URL('../../examples/calc/calc.ne', import.meta.url));

describe('loadGrammar', () => {
  it('compiles .ebnf files through the EBNF pipeline', () => {
    const compiled = loadGrammar(calcEbnfPath);

    expect(compiled.ParserRules.length).toBeGreaterThan(0);
    expect(compiled.ParserStart).toContain('main');
  });

  it('compiles .ne files as nearley source', () => {
    const compiled = loadGrammar(calcNePath);

    expect(compiled.ParserRules.length).toBeGreaterThan(0);
    expect(compiled.ParserStart).toContain('main');
  });

  it('detects EBNF files case-insensitively by extension', () => {
    const dir = mkdtempSync(join(tmpdir(), 'grammar-fast-check-'));
    const grammarPath = join(dir, 'grammar.EBNF');
    writeFileSync(
      grammarPath,
      `
      main ::= "x" ;
    `,
    );

    const compiled = loadGrammar(grammarPath);

    expect(compiled.ParserRules.length).toBeGreaterThan(0);
    expect(compiled.ParserStart).toContain('main');
  });
});

describe('loadEbnfGrammar', () => {
  it('reads an EBNF file from disk and compiles it', () => {
    const compiled = loadEbnfGrammar(calcEbnfPath);

    expect(compiled.ParserRules.length).toBeGreaterThan(0);
    expect(compiled.ParserStart).toContain('main');
  });
});

describe('compileNearleyGrammar', () => {
  it('throws when nearley source cannot be parsed', () => {
    expect(() => compileNearleyGrammar('')).toThrow(/Failed to parse nearley grammar source/);
  });
});
