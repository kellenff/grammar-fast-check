# grammar-fast-check

Derive [`fast-check`](https://github.com/dubzzz/fast-check) `Arbitrary<string>` values from EBNF grammars. Grammars can be written in standard [EBNF](https://en.wikipedia.org/wiki/Extended_Backus%E2%80%93Naur_form) (`.ebnf`) or [nearley](https://nearley.js.org/) syntax (`.ne`).

Phase 2 builds a native generator from compiled nearley rules using fast-check primitives (`letrec`, `oneof`, `tuple`, and friends). Generated strings participate in fast-check shrinking and depth control.

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

EBNF grammars are transpiled to nearley syntax and compiled via nearley's compiler API.

### Nearley (`.ne`)

```ts
const arb = grammarArb('./path/to/grammar.ne', 'main');
```

Grammars are compiled from source at call time. For repeated use in a test suite, create the arbitrary once and reuse it.

See [`examples/calc/`](./examples/calc/) for worked arithmetic grammars in both EBNF and nearley syntax with property tests.

## API

### `grammarArb(grammarPath, startRule, options?)`

Returns `Arbitrary<string>` that generates strings accepted by the grammar, starting from `startRule`. Auto-detects format from the file extension (`.ebnf` or `.ne`).

Optional `options`:

| Option      | Type                                       | Default   | Description                                                |
| ----------- | ------------------------------------------ | --------- | ---------------------------------------------------------- |
| `depthSize` | `'small' \| 'medium' \| 'large' \| number` | `'small'` | Controls recursive expansion via fast-check `oneof` depth. |

### `grammarArbFromCompiled(grammar, startRule, options?)`

Same as `grammarArb`, but accepts an already-compiled nearley grammar object. Reuse this when you compile once and generate many times in a test suite.

### `buildGrammarArbitrary(grammar, startRule, options?)`

Lower-level API returning the same `Arbitrary<string>` without reading from disk.

### `buildGrammarDerivationArbitrary(grammar, startRule, options?)`

Returns `Arbitrary<DerivationNode>` before string rendering. Useful for inspecting or asserting on generated structure without re-parsing.

### `compileEbnfGrammar(source)` / `loadEbnfGrammar(path)`

Parse standard EBNF source and compile it to nearley's compiled grammar object.

### `parseEbnf(source)` / `emitNearley(grammar)`

Lower-level EBNF parser and nearley transpiler. Useful for inspecting or debugging the translation step.

### `loadGrammar(grammarPath)` / `compileNearleyGrammar(source)`

Load and compile grammars. `loadGrammar` accepts `.ebnf` or `.ne` files. `compileNearleyGrammar` compiles nearley source directly.

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

| Limitation         | Impact                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **Strings only**   | No AST output. Derivation trees are available internally but not yet exposed as a public AST type.               |
| **Slow startup**   | Grammars compile per process unless you cache compiled output yourself via `grammarArbFromCompiled`.             |
| **Lexer tokens**   | Custom nearley `%token` references require a lexer definition and are not yet supported by the native generator. |
| **Left recursion** | Handled via fast-check depth biasing; extremely deep or pathological grammars may still produce long strings.    |

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
