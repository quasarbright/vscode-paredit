/**
 * Tests for delimiter configuration
 */

import { Scanner, DEFAULT_DELIMITERS } from '../src/cursor-doc/lexer';

describe('Delimiter Configuration', () => {
  describe('Default Delimiters', () => {
    test('should include parentheses', () => {
      const scanner = new Scanner();
      const tokens = scanner.processLine('(foo)', { inString: false });
      
      expect(tokens[0].type).toBe('open');
      expect(tokens[0].raw).toBe('(');
      expect(tokens[2].type).toBe('close');
      expect(tokens[2].raw).toBe(')');
    });

    test('should include square brackets', () => {
      const scanner = new Scanner();
      const tokens = scanner.processLine('[foo]', { inString: false });
      
      expect(tokens[0].type).toBe('open');
      expect(tokens[0].raw).toBe('[');
      expect(tokens[2].type).toBe('close');
      expect(tokens[2].raw).toBe(']');
    });

    test('should include curly braces', () => {
      const scanner = new Scanner();
      const tokens = scanner.processLine('{foo}', { inString: false });
      
      expect(tokens[0].type).toBe('open');
      expect(tokens[0].raw).toBe('{');
      expect(tokens[2].type).toBe('close');
      expect(tokens[2].raw).toBe('}');
    });

    test('should include double quotes', () => {
      const scanner = new Scanner();
      const tokens = scanner.processLine('"hello"', { inString: false });
      
      expect(tokens[0].type).toBe('str-start');
      expect(tokens[0].raw).toBe('"');
      expect(tokens[2].type).toBe('str-end');
      expect(tokens[2].raw).toBe('"');
    });

    test('DEFAULT_DELIMITERS should include double quotes', () => {
      const hasDoubleQuotes = DEFAULT_DELIMITERS.some(
        d => d.open === '"' && d.close === '"'
      );
      expect(hasDoubleQuotes).toBe(true);
    });
  });

  describe('Custom Delimiters', () => {
    test('should support custom delimiter pairs', () => {
      const customDelimiters = [
        { open: '<', close: '>' },
        { open: '(', close: ')' }
      ];
      const scanner = new Scanner(customDelimiters);
      const tokens = scanner.processLine('<foo>', { inString: false });
      
      expect(tokens[0].type).toBe('open');
      expect(tokens[0].raw).toBe('<');
      expect(tokens[2].type).toBe('close');
      expect(tokens[2].raw).toBe('>');
    });

    test('should only recognize configured delimiters', () => {
      const customDelimiters = [
        { open: '(', close: ')' }
      ];
      const scanner = new Scanner(customDelimiters);
      const tokens = scanner.processLine('[foo]', { inString: false });
      
      // [ and ] should not be recognized as delimiters
      // They should be part of an identifier token
      const delimiterTokens = tokens.filter(t => t.type === 'open' || t.type === 'close');
      expect(delimiterTokens.length).toBe(0);
      
      // The whole thing should be treated as an identifier
      expect(tokens.some(t => t.type === 'id' && t.raw.includes('['))).toBe(true);
    });

    test('should support single-character symmetric delimiters', () => {
      const customDelimiters = [
        { open: '|', close: '|' }
      ];
      const scanner = new Scanner(customDelimiters);
      const tokens = scanner.processLine('|foo|', { inString: false });
      
      expect(tokens[0].type).toBe('open');
      expect(tokens[0].raw).toBe('|');
      expect(tokens[2].type).toBe('close');
      expect(tokens[2].raw).toBe('|');
    });
  });

  describe('Delimiter Behavior', () => {
    test('should handle nested delimiters', () => {
      const scanner = new Scanner();
      const tokens = scanner.processLine('(foo [bar])', { inString: false });
      
      const openTokens = tokens.filter(t => t.type === 'open');
      const closeTokens = tokens.filter(t => t.type === 'close');
      
      expect(openTokens.length).toBe(2);
      expect(closeTokens.length).toBe(2);
    });

    test('should handle double quotes as delimiters', () => {
      const scanner = new Scanner();
      const tokens = scanner.processLine('foo "bar" baz', { inString: false });
      
      const quoteTokens = tokens.filter(t => t.raw === '"');
      expect(quoteTokens.length).toBe(2);
      expect(quoteTokens[0].type).toBe('str-start');
      expect(quoteTokens[1].type).toBe('str-end');
    });

    test('should handle multiple double quote pairs', () => {
      const scanner = new Scanner();
      const tokens = scanner.processLine('"foo" "bar"', { inString: false });
      
      const quoteTokens = tokens.filter(t => t.raw === '"');
      expect(quoteTokens.length).toBe(4);
      expect(quoteTokens[0].type).toBe('str-start');
      expect(quoteTokens[1].type).toBe('str-end');
      expect(quoteTokens[2].type).toBe('str-start');
      expect(quoteTokens[3].type).toBe('str-end');
    });
  });
});
