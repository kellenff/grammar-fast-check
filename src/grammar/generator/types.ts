export type DerivationNode =
  | { kind: 'literal'; value: string }
  | { kind: 'seq'; children: DerivationNode[] };

export interface GrammarArbOptions {
  depthSize?: 'small' | 'medium' | 'large' | number;
}

export type NearleyLiteralSymbol = {
  literal: string;
};

export type NearleyRegexSymbol = {
  test: RegExp;
};

export type NearleyCharclassSymbol = {
  test: (value: string) => boolean;
};

export type NearleySymbol =
  | string
  | NearleyLiteralSymbol
  | NearleyRegexSymbol
  | NearleyCharclassSymbol
  | Record<string, never>;

export interface NearleyProduction {
  name: string;
  symbols: NearleySymbol[];
}
