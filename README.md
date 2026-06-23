# grammar-fast-check

Derive [`fast-check`](https://github.com/dubzzz/fast-check) `Arbitrary<string>` values from EBNF grammars. Grammars can be written in standard [EBNF](https://en.wikipedia.org/wiki/Extended_Backus%E2%80%93Naur_form) (`.ebnf`) or [nearley](https://nearley.js.org/) syntax (`.ne`).

Grammars compile to native fast-check arbitraries built from `fc.letrec`, `fc.oneof`, `fc.tuple`, `fc.array`, and `fc.option`, so generated strings participate in fast-check shrinking and depth control.

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

EBNF grammars compile directly to fast-check arbitraries. They can also be transpiled to nearley syntax for parser integration.

### Nearley (`.ne`)

```ts
const arb = grammarArb('./path/to/grammar.ne', 'main');
```

Nearley grammars compile directly to fast-check arbitraries. Supported nearley constructs include alternation, grouping, quoted terminals, character classes such as `[0-9]`, and `:?`, `:*`, and `:+` postfix modifiers.

Grammars are compiled from source at call time. For repeated use in a test suite, create the arbitrary once and reuse it.

See [`examples/calc/`](./examples/calc/) for worked arithmetic grammars in both EBNF and nearley syntax with property tests.

## API

### `grammarArb(grammarPath, startRule)`

Returns `Arbitrary<string>` that generates strings accepted by the grammar, starting from `startRule`. Auto-detects format from the file extension (`.ebnf` or `.ne`).

### `ebnfToArbitrary(grammar, startRule, options?)`

Compile a parsed `EbnfGrammar` into a fast-check arbitrary. Options include `maxRepeat`, `depthSize`, and `maxDepth` for controlling repetition length and recursive depth.

### `parseNearley(source)`

Parse nearley grammar source into the shared `EbnfGrammar` AST (including `charClass` nodes for bracket expressions).

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

| Limitation         | Impact                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| **Strings only**   | No AST output. Cannot assert on generated structure without re-parsing.                                 |
| **Nearley subset** | Native generation supports a practical nearley subset (no negated character classes or `%` directives). |
| **Startup cost**   | Grammars compile per `grammarArb` call unless you cache the returned arbitrary yourself.                |

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
