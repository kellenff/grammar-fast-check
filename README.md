# grammar-fast-check

Derive [`fast-check`](https://github.com/dubzzz/fast-check) `Arbitrary<string>` values from EBNF grammars written in [nearley](https://nearley.js.org/) syntax.

Phase 1 wraps [`nearley-unparse`](https://github.com/smallhelm/nearley-unparse) as a black-box string generator so you can plug grammar-derived inputs into property-based tests today.

## Install

```bash
yarn add grammar-fast-check fast-check nearley nearley-unparse
```

This package uses Yarn Plug'n'Play. If you consume it from a node_modules project, install the peer runtime dependencies above.

## Usage

```ts
import fc from 'fast-check';
import { grammarArb } from 'grammar-fast-check';

const arb = grammarArb('./path/to/grammar.ne', 'main');

fc.assert(
  fc.property(arb, (source) => {
    // exercise your parser, evaluator, etc.
    myParser.parse(source);
  }),
  { numRuns: 200 },
);
```

Grammars are compiled from `.ne` source at call time via nearley's compiler API (`src/grammar/load.ts`). For repeated use in a test suite, create the arbitrary once and reuse it.

See [`examples/calc/`](./examples/calc/) for a worked arithmetic grammar with property tests.

## API

### `grammarArb(grammarPath, startRule)`

Returns `Arbitrary<string>` that generates strings accepted by the grammar, starting from `startRule`.

### `loadGrammar(grammarPath)` / `compileNearleyGrammar(source)`

Lower-level helpers to compile a `.ne` file or source string into nearley's compiled grammar object.

## Scripts

| Script                        | Description                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `yarn build`                  | Bundle library output with [tsdown](https://tsdown.dev/)                       |
| `yarn test`                   | Run vitest property tests                                                      |
| `yarn lint`                   | Type-aware [oxlint](https://oxc.rs/docs/guide/usage/linter/type-aware.html)    |
| `yarn fmt` / `yarn fmt:check` | Format with [oxfmt](https://oxc.rs/docs/guide/usage/formatter/quickstart.html) |
| `yarn typecheck`              | `tsc --noEmit` with strict settings                                            |

## Known limitations (Phase 1)

These are intentional trade-offs for a fast adapter; Phase 2 targets a native generator.

| Limitation               | Impact                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| **No shrinking**         | Counterexamples are large random strings. Fine for smoke tests; painful when debugging failures.        |
| **Black-box randomness** | Cannot bias toward edge cases or constrain depth. Coverage depends on `nearley-unparse`'s internal RNG. |
| **Strings only**         | No AST output. Cannot assert on generated structure without re-parsing.                                 |
| **Slow startup**         | Grammars compile per process unless you cache compiled output yourself.                                 |
| **Depth blowups**        | Deeply recursive grammars can emit very long strings. Keep `numRuns` modest in Phase 1.                 |

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
