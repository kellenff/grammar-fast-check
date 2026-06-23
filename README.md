# grammar-fast-check

Derive [`fast-check`](https://github.com/dubzzz/fast-check) `Arbitrary<string>` values from EBNF grammars. Grammars can be written in standard [EBNF](https://en.wikipedia.org/wiki/Extended_Backus%E2%80%93Naur_form) (`.ebnf`) or [nearley](https://nearley.js.org/) syntax (`.ne`).

Grammars are lowered into a small intermediate representation and compiled into a **native fast-check generator** built entirely from fast-check primitives (`letrec`, `oneof`, `tuple`, `array`, `option`, `constantFrom`). Generated strings therefore shrink toward minimal counterexamples, and recursion depth and repetition counts can be bounded directly.

## Install

```bash
yarn add grammar-fast-check fast-check nearley
```

This package uses Yarn Plug'n'Play. If you consume it from a node_modules project, install the peer runtime dependencies above.

## Usage

### EBNF (`.ebnf`)

```ts
import fc from 'fast-check';
import { grammarArb } from 'grammar-fast-check';

const arb = grammarArb('./path/to/grammar.ebnf', 'main');

fc.assert(
  fc.property(arb, (source) => {
    myParser.parse(source);
  }),
  { numRuns: 200 },
);
```

Example grammar (`examples/calc/calc.ebnf`):

```ebnf
main ::= expr ;

expr ::= term
       | expr "+" term
       | expr "-" term ;

term ::= factor
       | term "*" factor ;

factor ::= number
         | "(" expr ")" ;

number ::= digit { digit } ;

digit ::= "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" ;
```

Supported EBNF constructs:

| Construct       | Syntax                | Example         |
| --------------- | --------------------- | --------------- |
| Definition      | `::=` or `=`          | `expr ::= term` |
| Alternation     | `\|`                  | `a \| b`        |
| Sequence        | juxtaposition         | `a b c`         |
| Optional        | `[ expr ]`            | `[ "," item ]`  |
| Repetition (0+) | `{ expr }` or `expr*` | `{ digit }`     |
| Repetition (1+) | `expr+`               | `digit+`        |
| Grouping        | `( expr )`            | `( a b )`       |
| Terminals       | `"..."` or `'...'`    | `"+"`           |
| Comments        | `(* ... *)`           | `(* note *)`    |

EBNF grammars are parsed into an intermediate representation and compiled directly into a fast-check generator.

### Nearley (`.ne`)

```ts
const arb = grammarArb('./path/to/grammar.ne', 'main');
```

Nearley grammars are parsed at call time and lowered from nearley's AST, so character classes (`[0-9]`), literals, and EBNF modifiers (`:?`, `:*`, `:+`) are all supported. For repeated use in a test suite, create the arbitrary once and reuse it.

Macros, lexer tokens (`%token`), and `@{% ... %}` post-processors are not part of the generative subset and will raise a clear error (post-processor blocks are ignored).

See [`examples/calc/`](./examples/calc/) for worked arithmetic grammars in both EBNF and nearley syntax with property tests.

## API

### `grammarArb(grammarPath, startRule, options?)`

Returns `Arbitrary<string>` that generates strings accepted by the grammar, starting from `startRule`. Auto-detects format from the file extension (`.ebnf` or `.ne`).

`options` bounds the size of generated strings:

| Option           | Effect                                                           |
| ---------------- | ---------------------------------------------------------------- |
| `maxDepth`       | Caps recursion depth through choices and optionals.              |
| `maxRepetitions` | Caps the number of elements produced for a repetition (`*`/`+`). |

```ts
const arb = grammarArb('./grammar.ebnf', 'main', { maxDepth: 5, maxRepetitions: 8 });
```

### `loadGrammar(grammarPath)` / `loadEbnfGrammar(grammarPath)`

Load a grammar file and lower it into the `Grammar` IR. `loadGrammar` auto-detects `.ebnf` vs `.ne`; `loadEbnfGrammar` always uses the EBNF front-end.

### `compileEbnfGrammar(source)` / `compileNearleyGrammar(source)`

Lower EBNF or nearley source into the `Grammar` IR without reading from disk.

### `buildGrammarArbitrary(grammar, startRule, options?)`

Build a fast-check `Arbitrary<string>` from a `Grammar` IR. This is the core of the generator; `grammarArb` is a thin wrapper over `loadGrammar` + `buildGrammarArbitrary`.

### `parseEbnf(source)` / `ebnfToGrammar(grammar)`

Lower-level EBNF parser and IR lowering step. Useful for inspecting or debugging the translation.

### `Grammar` / `GrammarNode` and `buildGrammar` / `sequenceOf` / `choiceOf`

The intermediate representation and helpers for constructing it programmatically.

## Scripts

| Script                        | Description                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `yarn build`                  | Bundle library output with [tsdown](https://tsdown.dev/)                                 |
| `yarn test`                   | Run vitest property and unit tests                                                       |
| `yarn test:mutation`          | Run Stryker mutation tests locally (also runs in the `Mutation testing` workflow on PRs) |
| `yarn lint`                   | Type-aware [oxlint](https://oxc.rs/docs/guide/usage/linter/type-aware.html)              |
| `yarn fmt` / `yarn fmt:check` | Format with [oxfmt](https://oxc.rs/docs/guide/usage/formatter/quickstart.html)           |
| `yarn typecheck`              | `tsc --noEmit` with strict settings                                                      |

## Known limitations

The generator is native fast-check, so shrinking, depth control, and repetition bounds all work. Remaining trade-offs:

| Limitation               | Impact                                                                                                               |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Strings only**         | No AST output. Cannot assert on generated structure without re-parsing.                                              |
| **Char-class range**     | Character classes are sampled over code points U+0000–U+00FF (ASCII + Latin-1). Astral / wide ranges aren't sampled. |
| **No nearley macros**    | Macros, lexer tokens (`%token`), and `@{% %}` post-processors are outside the generative subset.                     |
| **Uniform alternatives** | Choices are weighted uniformly; there is no per-alternative biasing yet.                                             |

## Development

```bash
yarn install
yarn build
yarn test
yarn lint
yarn fmt:check
```

Requires Node ≥ 18 and TypeScript ≥ 5 with `isolatedDeclarations` enabled in `tsconfig.json`.

## License

MIT
