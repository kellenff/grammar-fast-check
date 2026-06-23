declare module 'nearley/lib/compile.js' {
  export default function compile(ast: unknown, options: Record<string, unknown>): unknown;
}

declare module 'nearley/lib/generate.js' {
  export default function generate(grammarInfo: unknown, exportName: string): string;
}

declare module 'nearley/lib/nearley-language-bootstrapped.js' {
  import type { CompiledRules } from 'nearley';

  const grammar: CompiledRules;
  export default grammar;
}
