import type { EbnfExpression, EbnfGrammar, EbnfRule } from './ast.js';

type Token =
  | { type: 'identifier'; value: string; pos: number }
  | { type: 'string'; value: string; pos: number }
  | { type: 'define'; pos: number }
  | { type: 'pipe'; pos: number }
  | { type: 'semicolon'; pos: number }
  | { type: 'lbracket'; pos: number }
  | { type: 'rbracket'; pos: number }
  | { type: 'lbrace'; pos: number }
  | { type: 'rbrace'; pos: number }
  | { type: 'lparen'; pos: number }
  | { type: 'rparen'; pos: number }
  | { type: 'star'; pos: number }
  | { type: 'plus'; pos: number }
  | { type: 'eof'; pos: number };

class EbnfParseError extends Error {
  readonly pos: number;

  constructor(message: string, pos: number) {
    super(`${message} at position ${pos}`);
    this.name = 'EbnfParseError';
    this.pos = pos;
  }
}

function isIdentifierStart(char: string): boolean {
  return /[A-Za-z_]/.test(char);
}

function isIdentifierPart(char: string): boolean {
  return /[A-Za-z0-9_-]/.test(char);
}

function lex(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  const skipWhitespace = (): void => {
    while (index < source.length) {
      const char = source[index];
      if (char === undefined) {
        break;
      }
      if (/\s/.test(char)) {
        index += 1;
        continue;
      }
      if (char === '(' && source[index + 1] === '*') {
        const end = source.indexOf('*)', index + 2);
        if (end === -1) {
          throw new EbnfParseError('Unterminated comment', index);
        }
        index = end + 2;
        continue;
      }
      break;
    }
  };

  while (index < source.length) {
    skipWhitespace();
    if (index >= source.length) {
      break;
    }

    const start = index;
    const char = source[index];
    if (char === undefined) {
      break;
    }

    if (char === '"' || char === "'") {
      const quote = char;
      index += 1;
      let value = '';
      while (index < source.length) {
        const current = source[index];
        if (current === undefined) {
          break;
        }
        if (current === quote) {
          index += 1;
          tokens.push({ type: 'string', value, pos: start });
          break;
        }
        if (current === '\\' && index + 1 < source.length) {
          const next = source[index + 1];
          if (next !== undefined) {
            value += next;
            index += 2;
            continue;
          }
        }
        value += current;
        index += 1;
      }
      if (tokens.at(-1)?.pos !== start) {
        throw new EbnfParseError('Unterminated string literal', start);
      }
      continue;
    }

    if (char === ':' && source[index + 1] === ':' && source[index + 2] === '=') {
      tokens.push({ type: 'define', pos: start });
      index += 3;
      continue;
    }

    if (char === '=') {
      tokens.push({ type: 'define', pos: start });
      index += 1;
      continue;
    }

    if (char === '|') {
      tokens.push({ type: 'pipe', pos: start });
      index += 1;
      continue;
    }

    if (char === ';') {
      tokens.push({ type: 'semicolon', pos: start });
      index += 1;
      continue;
    }

    if (char === '[') {
      tokens.push({ type: 'lbracket', pos: start });
      index += 1;
      continue;
    }

    if (char === ']') {
      tokens.push({ type: 'rbracket', pos: start });
      index += 1;
      continue;
    }

    if (char === '{') {
      tokens.push({ type: 'lbrace', pos: start });
      index += 1;
      continue;
    }

    if (char === '}') {
      tokens.push({ type: 'rbrace', pos: start });
      index += 1;
      continue;
    }

    if (char === '(') {
      tokens.push({ type: 'lparen', pos: start });
      index += 1;
      continue;
    }

    if (char === ')') {
      tokens.push({ type: 'rparen', pos: start });
      index += 1;
      continue;
    }

    if (char === '*') {
      tokens.push({ type: 'star', pos: start });
      index += 1;
      continue;
    }

    if (char === '+') {
      tokens.push({ type: 'plus', pos: start });
      index += 1;
      continue;
    }

    if (isIdentifierStart(char)) {
      let value = char;
      index += 1;
      while (index < source.length) {
        const next = source[index];
        if (next === undefined || !isIdentifierPart(next)) {
          break;
        }
        value += next;
        index += 1;
      }
      tokens.push({ type: 'identifier', value, pos: start });
      continue;
    }

    throw new EbnfParseError(`Unexpected character ${JSON.stringify(char)}`, start);
  }

  tokens.push({ type: 'eof', pos: index });
  return tokens;
}

class Parser {
  private position = 0;
  private readonly tokens: Token[];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.position] ?? { type: 'eof', pos: 0 };
  }

  private consume(expected?: Token['type']): Token {
    const token = this.peek();
    if (expected !== undefined && token.type !== expected) {
      throw new EbnfParseError(`Expected ${expected}, got ${token.type}`, token.pos);
    }
    this.position += 1;
    return token;
  }

  parseGrammar(): EbnfGrammar {
    const rules: EbnfRule[] = [];
    while (this.peek().type !== 'eof') {
      rules.push(this.parseRule());
    }
    if (rules.length === 0) {
      throw new EbnfParseError('Expected at least one grammar rule', 0);
    }
    return { rules };
  }

  private parseRule(): EbnfRule {
    const nameToken = this.consume('identifier');
    if (nameToken.type !== 'identifier') {
      throw new EbnfParseError('Expected rule name', nameToken.pos);
    }
    this.consume('define');
    const definition = this.parseExpression();
    if (this.peek().type === 'semicolon') {
      this.consume('semicolon');
    }
    return { name: nameToken.value, definition };
  }

  private parseExpression(): EbnfExpression {
    const items: EbnfExpression[] = [this.parseSequence()];
    while (this.peek().type === 'pipe') {
      this.consume('pipe');
      items.push(this.parseSequence());
    }
    if (items.length === 1) {
      return items[0]!;
    }
    return { type: 'alternation', items };
  }

  private startsNewRule(): boolean {
    if (this.peek().type !== 'identifier') {
      return false;
    }
    const next = this.tokens[this.position + 1];
    return next?.type === 'define';
  }

  private parseSequence(): EbnfExpression {
    const items: EbnfExpression[] = [];
    while (this.isSequenceStart(this.peek().type)) {
      if (this.startsNewRule()) {
        break;
      }
      items.push(this.parseFactor());
    }
    if (items.length === 0) {
      throw new EbnfParseError('Expected expression', this.peek().pos);
    }
    if (items.length === 1) {
      return items[0]!;
    }
    return { type: 'sequence', items };
  }

  private isSequenceStart(type: Token['type']): boolean {
    return (
      type === 'identifier' ||
      type === 'string' ||
      type === 'lbracket' ||
      type === 'lbrace' ||
      type === 'lparen'
    );
  }

  private parseFactor(): EbnfExpression {
    let item = this.parsePrimary();

    if (this.peek().type === 'star') {
      this.consume('star');
      return { type: 'repetition', item, kind: 'zeroOrMore' };
    }

    if (this.peek().type === 'plus') {
      this.consume('plus');
      return { type: 'repetition', item, kind: 'oneOrMore' };
    }

    return item;
  }

  private parsePrimary(): EbnfExpression {
    const token = this.peek();

    if (token.type === 'identifier') {
      this.consume('identifier');
      return { type: 'identifier', name: token.value };
    }

    if (token.type === 'string') {
      this.consume('string');
      return { type: 'terminal', value: token.value };
    }

    if (token.type === 'lbracket') {
      this.consume('lbracket');
      const item = this.parseExpression();
      this.consume('rbracket');
      return { type: 'optional', item };
    }

    if (token.type === 'lbrace') {
      this.consume('lbrace');
      const item = this.parseExpression();
      this.consume('rbrace');
      return { type: 'repetition', item, kind: 'zeroOrMore' };
    }

    if (token.type === 'lparen') {
      this.consume('lparen');
      const item = this.parseExpression();
      this.consume('rparen');
      return { type: 'group', item };
    }

    throw new EbnfParseError('Expected primary expression', token.pos);
  }
}

export function parseEbnf(source: string): EbnfGrammar {
  try {
    const tokens = lex(source);
    return new Parser(tokens).parseGrammar();
  } catch (error) {
    if (error instanceof EbnfParseError) {
      throw new Error(`Failed to parse EBNF: ${error.message}`);
    }
    throw error;
  }
}
