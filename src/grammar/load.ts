import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import nearley, { type CompiledRules } from 'nearley';
import compile from 'nearley/lib/compile.js';
import generate from 'nearley/lib/generate.js';
import nearleyGrammar from 'nearley/lib/nearley-language-bootstrapped.js';
import { compileEbnfGrammar } from './ebnf/index.js';

export type CompiledNearleyGrammar = CompiledRules;
export { compileEbnfGrammar } from './ebnf/index.js';

const require = createRequire(import.meta.url);

function evalCompiledGrammar(grammarJs: string): CompiledNearleyGrammar {
  const module = { exports: {} as CompiledNearleyGrammar };
  const dirname = fileURLToPath(new URL('.', import.meta.url));
  const localRequire = (id: string): unknown => {
    if (id.startsWith('.')) {
      return require(fileURLToPath(new URL(id, dirname)));
    }
    return require(id);
  };

  const fn = new Function('module', 'require', grammarJs);
  fn(module, localRequire);
  return module.exports;
}

export function compileNearleyGrammar(grammarSource: string): CompiledNearleyGrammar {
  const grammarParser = new nearley.Parser(nearley.Grammar.fromCompiled(nearleyGrammar));
  grammarParser.feed(grammarSource);

  if (grammarParser.results.length === 0) {
    throw new Error('Failed to parse nearley grammar source');
  }

  const grammarAst = grammarParser.results[0];
  const grammarInfoObject = compile(grammarAst, {});
  const grammarJs = generate(grammarInfoObject, 'grammar');
  return evalCompiledGrammar(grammarJs);
}

export function loadGrammar(grammarPath: string): CompiledNearleyGrammar {
  const grammarSource = readFileSync(grammarPath, 'utf8');
  if (extname(grammarPath).toLowerCase() === '.ebnf') {
    return compileEbnfGrammar(grammarSource);
  }
  return compileNearleyGrammar(grammarSource);
}

export function loadEbnfGrammar(grammarPath: string): CompiledNearleyGrammar {
  const grammarSource = readFileSync(grammarPath, 'utf8');
  return compileEbnfGrammar(grammarSource);
}
