export type EbnfExpression =
  | { type: 'identifier'; name: string }
  | { type: 'terminal'; value: string }
  | { type: 'sequence'; items: EbnfExpression[] }
  | { type: 'alternation'; items: EbnfExpression[] }
  | { type: 'optional'; item: EbnfExpression }
  | { type: 'repetition'; item: EbnfExpression; kind: 'zeroOrMore' | 'oneOrMore' }
  | { type: 'group'; item: EbnfExpression };

export type EbnfRule = {
  name: string;
  definition: EbnfExpression;
};

export type EbnfGrammar = {
  rules: EbnfRule[];
};
