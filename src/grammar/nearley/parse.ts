import type { EbnfExpression, EbnfGrammar, EbnfRule } from '../ebnf/ast.js';

type Token =
  | { type: 'identifier'; value: string; pos: number }
  | { type: 'string'; value: string; pos: number }
  | { type: 'charClass'; value: string; pos: number }
  | { type: 'arrow'; pos: number }
  | { type: 'pipe'; pos: number }
  | { type: 'colon'; pos: number }
  | { type: 'question'; pos: number }
  | { type: 'star'; pos: number }
  | { type: 'plus'; pos: number }
  | { type: 'lparen'; pos: number }
  | { type: 'rparen'; pos: number }
  | { type: 'eof'; pos: number };

class NearleyParseError extends Error {
  readonly pos: number;

  constructor(message: string, pos: number) {
    super(`${message} at position ${pos}`);
    this.name = 'NearleyParseError';
    this.pos = pos;
  }
}

function isIdentifierStart(char: string): boolean {
  return /[A-Za-z_%]/.test(char);
}

function isIdentifierPart(char: string): boolean {
  return /[A-Za-z0-9_%-]/.test(char);
}

function expandCharClass(source: string, pos: number): string[] {
  const chars: string[] = [];
  let index = 0;
  let negated = false;

  if (source.startsWith('^', index)) {
    negated = true;
    index += 1;
  }

  if (negated) {
    throw new NearleyParseError('Negated character classes are not supported', pos);
  }

  while (index < source.length) {
    const char = source[index];
    if (char === undefined) {
      break;
    }

    if (char === '\\' && index + 1 < source.length) {
      const next = source[index + 1];
      if (next !== undefined) {
        chars.push(next);
        index += 2;
        continue;
      }
    }

    if (char === '-' && index + 1 < source.length && index > 0) {
      const end = source[index + 1];
      const start = chars.at(-1);
      if (end !== undefined && start !== undefined && start.length === 1 && end.length === 1) {
        chars.pop();
        const startCode = start.codePointAt(0)!;
        const endCode = end.codePointAt(0)!;
        if (startCode > endCode) {
          throw new NearleyParseError('Invalid character class range', pos);
        }
        for (let code = startCode; code <= endCode; code += 1) {
          chars.push(String.fromCodePoint(code));
        }
        index += 2;
        continue;
      }
    }

    chars.push(char);
    index += 1;
  }

  if (chars.length === 0) {
    throw new NearleyParseError('Empty character class', pos);
  }

  return chars;
}

function lex(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  const skipWhitespaceAndComments = (): void => {
    while (index < source.length) {
      const char = source[index];
      if (char === undefined) {
        break;
      }
      if (/\s/.test(char)) {
        index += 1;
        continue;
      }
      if (char === '#') {
        while (index < source.length && source[index] !== '\n') {
          index += 1;
        }
        continue;
      }
      break;
    }
  };

  while (index < source.length) {
    skipWhitespaceAndComments();
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
        throw new NearleyParseError('Unterminated string literal', start);
      }
      continue;
    }

    if (char === '[') {
      index += 1;
      let value = '';
      while (index < source.length) {
        const current = source[index];
        if (current === undefined) {
          break;
        }
        if (current === ']' && source[index - 1] !== '\\') {
          index += 1;
          tokens.push({ type: 'charClass', value, pos: start });
          break;
        }
        value += current;
        index += 1;
      }
      if (tokens.at(-1)?.pos !== start) {
        throw new NearleyParseError('Unterminated character class', start);
      }
      continue;
    }

    if (char === '-' && source[index + 1] === '>') {
      tokens.push({ type: 'arrow', pos: start });
      index += 2;
      continue;
    }

    if (char === '|') {
      tokens.push({ type: 'pipe', pos: start });
      index += 1;
      continue;
    }

    if (char === ':') {
      tokens.push({ type: 'colon', pos: start });
      index += 1;
      continue;
    }

    if (char === '?') {
      tokens.push({ type: 'question', pos: start });
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

    throw new NearleyParseError(`Unexpected character ${JSON.stringify(char)}`, start);
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
      throw new NearleyParseError(`Expected ${expected}, got ${token.type}`, token.pos);
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
      throw new NearleyParseError('Expected at least one grammar rule', 0);
    }
    return { rules };
  }

  private parseRule(): EbnfRule {
    const nameToken = this.consume('identifier');
    if (nameToken.type !== 'identifier') {
      throw new NearleyParseError('Expected rule name', nameToken.pos);
    }
    this.consume('arrow');
    const definition = this.parseExpression();
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
    return next?.type === 'arrow';
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
      throw new NearleyParseError('Expected expression', this.peek().pos);
    }
    if (items.length === 1) {
      return items[0]!;
    }
    return { type: 'sequence', items };
  }

  private isSequenceStart(type: Token['type']): boolean {
    return type === 'identifier' || type === 'string' || type === 'charClass' || type === 'lparen';
  }

  private parseFactor(): EbnfExpression {
    let item = this.parsePrimary();

    if (this.peek().type === 'colon') {
      this.consume('colon');
      const modifier = this.peek();
      if (modifier.type === 'question') {
        this.consume('question');
        return { type: 'optional', item };
      }
      if (modifier.type === 'star') {
        this.consume('star');
        return { type: 'repetition', item, kind: 'zeroOrMore' };
      }
      if (modifier.type === 'plus') {
        this.consume('plus');
        return { type: 'repetition', item, kind: 'oneOrMore' };
      }
      throw new NearleyParseError('Expected nearley postfix modifier', modifier.pos);
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

    if (token.type === 'charClass') {
      this.consume('charClass');
      return { type: 'charClass', chars: expandCharClass(token.value, token.pos) };
    }

    if (token.type === 'lparen') {
      this.consume('lparen');
      const item = this.parseExpression();
      this.consume('rparen');
      return { type: 'group', item };
    }

    throw new NearleyParseError('Expected primary expression', token.pos);
  }
}

export function parseNearley(source: string): EbnfGrammar {
  try {
    const tokens = lex(source);
    return new Parser(tokens).parseGrammar();
  } catch (error) {
    if (error instanceof NearleyParseError) {
      throw new Error(`Failed to parse nearley grammar: ${error.message}`);
    }
    throw error;
  }
}
