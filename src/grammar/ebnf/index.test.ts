import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadEbnfGrammar } from './index.js';

describe('loadEbnfGrammar', () => {
  it('loads and compiles an EBNF file from disk', () => {
    const dir = mkdtempSync(join(tmpdir(), 'grammar-fast-check-ebnf-'));
    const grammarPath = join(dir, 'grammar.ebnf');
    writeFileSync(
      grammarPath,
      `
      main ::= "ok" ;
    `,
    );

    const compiled = loadEbnfGrammar(grammarPath);

    expect(compiled.ParserRules.length).toBeGreaterThan(0);
    expect(compiled.ParserStart).toContain('main');
  });
});
