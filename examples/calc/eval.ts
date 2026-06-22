export function evaluate(source: string): number {
  const normalized = source.replace(/\s+/g, '');
  if (normalized.length === 0) {
    throw new Error('empty expression');
  }

  let index = 0;

  function parseExpression(): number {
    let value = parseTerm();
    while (index < normalized.length) {
      const operator = normalized[index];
      if (operator === '+') {
        index += 1;
        value += parseTerm();
        continue;
      }
      if (operator === '-') {
        index += 1;
        value -= parseTerm();
        continue;
      }
      break;
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseFactor();
    while (index < normalized.length) {
      const operator = normalized[index];
      if (operator === '*') {
        index += 1;
        value *= parseFactor();
        continue;
      }
      if (operator === '/') {
        index += 1;
        const divisor = parseFactor();
        if (divisor === 0) {
          throw new Error('division by zero');
        }
        value /= divisor;
        continue;
      }
      break;
    }
    return value;
  }

  function parseFactor(): number {
    if (normalized[index] === '(') {
      index += 1;
      const value = parseExpression();
      if (normalized[index] !== ')') {
        throw new Error('missing closing parenthesis');
      }
      index += 1;
      return value;
    }

    const start = index;
    while (index < normalized.length && /[0-9]/.test(normalized[index] ?? '')) {
      index += 1;
    }

    if (start === index) {
      throw new Error(`unexpected token at position ${index}`);
    }

    return Number(normalized.slice(start, index));
  }

  const result = parseExpression();
  if (index !== normalized.length) {
    throw new Error(`unexpected trailing input at position ${index}`);
  }
  return result;
}
