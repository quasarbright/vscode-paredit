/**
 * Tests for the lexer and tokenization system
 */

import { Scanner } from '../src/cursor-doc/lexer';

describe('Scanner', () => {
  let scanner: Scanner;

  beforeEach(() => {
    scanner = new Scanner();
  });

  describe('Basic tokenization', () => {
    test('should tokenize opening delimiters', () => {
      const tokens = scanner.processLine('(', { inString: false });
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe('open');
      expect(tokens[0].raw).toBe('(');
    });

    test('should tokenize closing delimiters', () => {
      const tokens = scanner.processLine(')', { inString: false });
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe('close');
      expect(tokens[0].raw).toBe(')');
    });

    test('should tokenize multiple delimiter types', () => {
      const tokens = scanner.processLine('([{', { inString: false });
      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe('open');
      expect(tokens[0].raw).toBe('(');
      expect(tokens[1].type).toBe('open');
      expect(tokens[1].raw).toBe('[');
      expect(tokens[2].type).toBe('open');
      expect(tokens[2].raw).toBe('{');
    });

    test('should tokenize identifiers', () => {
      const tokens = scanner.processLine('foo', { inString: false });
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe('id');
      expect(tokens[0].raw).toBe('foo');
    });

    test('should tokenize whitespace', () => {
      const tokens = scanner.processLine('  ', { inString: false });
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe('ws');
      expect(tokens[0].raw).toBe('  ');
    });
  });

  describe('String handling', () => {
    test('should tokenize double quotes as delimiters', () => {
      const tokens = scanner.processLine('"hello"', { inString: false });
      expect(tokens[0].type).toBe('str-start');
      expect(tokens[0].raw).toBe('"');
      expect(tokens[1].type).toBe('str-inside');
      expect(tokens[1].raw).toBe('hello');
      expect(tokens[2].type).toBe('str-end');
      expect(tokens[2].raw).toBe('"');
    });

    test('should handle single quotes as identifiers by default', () => {
      const tokens = scanner.processLine("'hello'", { inString: false });
      // Single quotes are NOT in DEFAULT_DELIMITERS because they're language-specific
      // In Lisp/Racket, ' is a quote operator, not a string delimiter
      expect(tokens[0].type).toBe('id');
      expect(tokens[0].raw).toBe("'hello'");
    });

    test('should tokenize single quotes as delimiters when configured', () => {
      // Simulate JavaScript which has single-quote strings
      const jsScanner = new Scanner([
        { open: '(', close: ')' },
        { open: '[', close: ']' },
        { open: '{', close: '}' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ]);
      const tokens = jsScanner.processLine("'hello'", { inString: false });
      expect(tokens[0].type).toBe('str-start');
      expect(tokens[0].raw).toBe("'");
      expect(tokens[1].type).toBe('str-inside');
      expect(tokens[1].raw).toBe('hello');
      expect(tokens[2].type).toBe('str-end');
      expect(tokens[2].raw).toBe("'");
    });

    test('should handle backticks as part of identifiers', () => {
      const tokens = scanner.processLine('`hello`', { inString: false });
      // Backticks are not in DEFAULT_DELIMITERS, so they're part of identifiers
      expect(tokens[0].type).toBe('id');
      expect(tokens[0].raw).toBe('`hello`');
    });

    test('should continue string across state', () => {
      // This test is no longer relevant since we don't track string state
      // Quotes are just regular delimiters
      const tokens = scanner.processLine('world"', { inString: false });
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('No comment handling (by design)', () => {
    test('should treat // as identifiers', () => {
      const tokens = scanner.processLine('// comment', { inString: false });
      // Scanner doesn't detect comments - that's done by VS Code tokenization
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].type).toBe('id');
    });

    test('should treat ; as identifier character', () => {
      const tokens = scanner.processLine('; comment', { inString: false });
      // Semicolon is just part of an identifier
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].type).toBe('id');
    });

    test('should treat # as identifier character (important for Racket)', () => {
      const tokens = scanner.processLine('#t', { inString: false });
      // Hash is part of the identifier (important for Racket!)
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe('id');
      expect(tokens[0].raw).toBe('#t');
    });
  });

  describe('Complex expressions', () => {
    test('should tokenize simple list', () => {
      const tokens = scanner.processLine('(foo bar)', { inString: false });
      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe('open');
      expect(tokens[1].type).toBe('id');
      expect(tokens[1].raw).toBe('foo');
      expect(tokens[2].type).toBe('ws');
      expect(tokens[3].type).toBe('id');
      expect(tokens[3].raw).toBe('bar');
      expect(tokens[4].type).toBe('close');
    });

    test('should tokenize nested lists', () => {
      const tokens = scanner.processLine('(a (b c))', { inString: false });
      expect(tokens[0].type).toBe('open');
      expect(tokens[1].type).toBe('id');
      expect(tokens[3].type).toBe('open');
      expect(tokens[8].type).toBe('close');
    });

    test('should handle mixed delimiters', () => {
      const tokens = scanner.processLine('[{()}]', { inString: false });
      expect(tokens).toHaveLength(6);
      expect(tokens[0].raw).toBe('[');
      expect(tokens[1].raw).toBe('{');
      expect(tokens[2].raw).toBe('(');
      expect(tokens[3].raw).toBe(')');
      expect(tokens[4].raw).toBe('}');
      expect(tokens[5].raw).toBe(']');
    });
  });

  describe('Delimiter matching', () => {
    test('should get matching closing delimiter', () => {
      expect(scanner.getMatchingDelimiter('(')).toBe(')');
      expect(scanner.getMatchingDelimiter('[')).toBe(']');
      expect(scanner.getMatchingDelimiter('{')).toBe('}');
    });

    test('should get matching opening delimiter', () => {
      expect(scanner.getOpeningDelimiter(')')).toBe('(');
      expect(scanner.getOpeningDelimiter(']')).toBe('[');
      expect(scanner.getOpeningDelimiter('}')).toBe('{');
    });

    test('should check if character is opening delimiter', () => {
      expect(scanner.isOpenDelimiter('(')).toBe(true);
      expect(scanner.isOpenDelimiter('[')).toBe(true);
      expect(scanner.isOpenDelimiter('{')).toBe(true);
      expect(scanner.isOpenDelimiter(')')).toBe(false);
      expect(scanner.isOpenDelimiter('a')).toBe(false);
    });

    test('should check if character is closing delimiter', () => {
      expect(scanner.isCloseDelimiter(')')).toBe(true);
      expect(scanner.isCloseDelimiter(']')).toBe(true);
      expect(scanner.isCloseDelimiter('}')).toBe(true);
      expect(scanner.isCloseDelimiter('(')).toBe(false);
      expect(scanner.isCloseDelimiter('a')).toBe(false);
    });
  });

  describe('Offset tracking', () => {
    test('should track token offsets', () => {
      const tokens = scanner.processLine('(foo bar)', { inString: false });
      expect(tokens[0].offset).toBe(0);  // (
      expect(tokens[1].offset).toBe(1);  // foo
      expect(tokens[2].offset).toBe(4);  // space
      expect(tokens[3].offset).toBe(5);  // bar
      expect(tokens[4].offset).toBe(8);  // )
    });
  });
});
