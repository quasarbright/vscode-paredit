/**
 * Tests for TokenCursor and LispTokenCursor
 */

/// <reference types="jest" />

import { Scanner } from '../src/cursor-doc/lexer';
import { TokenCursor, LispTokenCursor, TextLine } from '../src/cursor-doc/token-cursor';

const { expect } = require('@jest/globals');

describe('TokenCursor', () => {
  let scanner: Scanner;

  beforeEach(() => {
    scanner = new Scanner();
  });

  function createTextLines(lines: string[]): TextLine[] {
    const textLines: TextLine[] = [];
    let state = { inString: false };

    for (const line of lines) {
      const tokens = scanner.processLine(line, state);
      const endState = tokens.length > 0 ? tokens[tokens.length - 1].state : state;
      textLines.push({
        tokens,
        text: line,
        startState: state,
        endState
      });
      state = endState;
    }

    return textLines;
  }

  describe('Basic navigation', () => {
    test('should navigate forward through tokens', () => {
      const lines = createTextLines(['(foo bar)']);
      const cursor = new TokenCursor(lines, 0, 0, scanner);

      expect(cursor.getToken()?.raw).toBe('(');
      expect(cursor.next()).toBe(true);
      expect(cursor.getToken()?.raw).toBe('foo');
      expect(cursor.next()).toBe(true);
      expect(cursor.getToken()?.type).toBe('ws');
      expect(cursor.next()).toBe(true);
      expect(cursor.getToken()?.raw).toBe('bar');
    });

    test('should navigate backward through tokens', () => {
      const lines = createTextLines(['(foo bar)']);
      const cursor = new TokenCursor(lines, 0, 4, scanner);

      expect(cursor.getToken()?.raw).toBe(')');
      expect(cursor.previous()).toBe(true);
      expect(cursor.getToken()?.raw).toBe('bar');
      expect(cursor.previous()).toBe(true);
      expect(cursor.getToken()?.type).toBe('ws');
      expect(cursor.previous()).toBe(true);
      expect(cursor.getToken()?.raw).toBe('foo');
    });

    test('should navigate across lines', () => {
      const lines = createTextLines(['(foo', 'bar)']);
      const cursor = new TokenCursor(lines, 0, 1, scanner);

      expect(cursor.getToken()?.raw).toBe('foo');
      expect(cursor.next()).toBe(true);
      expect(cursor.getToken()?.raw).toBe('bar');
      expect(cursor.lineNumber).toBe(1);
    });

    test('should detect start of document', () => {
      const lines = createTextLines(['(foo)']);
      const cursor = new TokenCursor(lines, 0, 0, scanner);

      expect(cursor.atStart()).toBe(true);
      cursor.next();
      expect(cursor.atStart()).toBe(false);
    });

    test('should detect end of document', () => {
      const lines = createTextLines(['(foo)']);
      const lastTokenIndex = lines[0].tokens.length - 1;
      const cursor = new TokenCursor(lines, 0, lastTokenIndex - 1, scanner);

      expect(cursor.atEnd()).toBe(false);
      cursor.next();
      expect(cursor.atEnd()).toBe(true);
    });
  });

  describe('Position tracking', () => {
    test('should calculate offset within single line', () => {
      const lines = createTextLines(['(foo bar)']);
      const cursor = new TokenCursor(lines, 0, 1, scanner);

      expect(cursor.offsetStart).toBe(1);
      expect(cursor.offsetEnd).toBe(4);
    });

    test('should calculate offset across lines', () => {
      const lines = createTextLines(['(foo', 'bar)']);
      const cursor = new TokenCursor(lines, 1, 0, scanner);

      // Line 0: "(foo" = 4 chars + 1 newline = 5
      // Line 1: "bar" starts at offset 5
      expect(cursor.offsetStart).toBe(5);
    });
  });

  describe('Utility methods', () => {
    test('should clone cursor', () => {
      const lines = createTextLines(['(foo)']);
      const cursor = new TokenCursor(lines, 0, 1, scanner);
      const clone = cursor.clone();

      expect(clone.lineNumber).toBe(cursor.lineNumber);
      expect(clone.tokenIndex).toBe(cursor.tokenIndex);
      expect(clone.equals(cursor)).toBe(true);
    });

    test('should check token types', () => {
      const lines = createTextLines(['( foo)']);
      const cursor = new TokenCursor(lines, 0, 0, scanner);

      expect(cursor.isType('open')).toBe(true);
      cursor.next();
      expect(cursor.isWhitespace()).toBe(true);
      cursor.next();
      expect(cursor.isType('id')).toBe(true);
    });
  });
});

describe('LispTokenCursor', () => {
  let scanner: Scanner;

  beforeEach(() => {
    scanner = new Scanner();
  });

  function createTextLines(lines: string[]): TextLine[] {
    const textLines: TextLine[] = [];
    let state = { inString: false };

    for (const line of lines) {
      const tokens = scanner.processLine(line, state);
      const endState = tokens.length > 0 ? tokens[tokens.length - 1].state : state;
      textLines.push({
        tokens,
        text: line,
        startState: state,
        endState
      });
      state = endState;
    }

    return textLines;
  }

  describe('forwardSexp', () => {
    test('should move forward over atom', () => {
      const lines = createTextLines(['foo bar']);
      const cursor = new LispTokenCursor(lines, 0, 0, scanner);

      expect(cursor.getToken()?.raw).toBe('foo');
      expect(cursor.forwardSexp()).toBe(true);
      expect(cursor.getToken()?.raw).toBe(' ');
    });

    test('should move forward over list', () => {
      const lines = createTextLines(['(foo bar) baz']);
      const cursor = new LispTokenCursor(lines, 0, 0, scanner);

      expect(cursor.getToken()?.raw).toBe('(');
      expect(cursor.forwardSexp()).toBe(true);
      expect(cursor.getToken()?.raw).toBe(' ');
      cursor.forwardSexp(); // Skip whitespace
      expect(cursor.getToken()?.raw).toBe('baz');
    });

    test('should skip whitespace when moving forward', () => {
      const lines = createTextLines(['  foo bar']);
      const cursor = new LispTokenCursor(lines, 0, 0, scanner);

      // Start at whitespace, forwardSexp should skip it and move past foo
      expect(cursor.getToken()?.type).toBe('ws');
      expect(cursor.forwardSexp()).toBe(true);
      expect(cursor.getToken()?.type).toBe('ws');
      // Now we're between foo and bar
    });
  });

  describe('backwardSexp', () => {
    test('should move backward over atom', () => {
      const lines = createTextLines(['foo bar']);
      const cursor = new LispTokenCursor(lines, 0, 2, scanner);

      expect(cursor.getToken()?.raw).toBe('bar');
      expect(cursor.backwardSexp()).toBe(true);
      expect(cursor.getToken()?.raw).toBe('foo');
    });

    test('should move backward over list', () => {
      const lines = createTextLines(['(foo bar) baz']);
      const cursor = new LispTokenCursor(lines, 0, 6, scanner);

      expect(cursor.getToken()?.raw).toBe('baz');
      expect(cursor.backwardSexp()).toBe(true);
      expect(cursor.getToken()?.raw).toBe('(');
    });
  });

  describe('forwardList and backwardList', () => {
    test('should move to closing delimiter', () => {
      const lines = createTextLines(['(foo bar)']);
      const cursor = new LispTokenCursor(lines, 0, 0, scanner);

      expect(cursor.getToken()?.raw).toBe('(');
      expect(cursor.forwardList()).toBe(true);
      expect(cursor.getToken()?.raw).toBe(')');
    });

    test('should move to opening delimiter', () => {
      const lines = createTextLines(['(foo bar)']);
      const cursor = new LispTokenCursor(lines, 0, 4, scanner);

      expect(cursor.getToken()?.raw).toBe(')');
      expect(cursor.backwardList()).toBe(true);
      expect(cursor.getToken()?.raw).toBe('(');
    });

    test('should handle nested lists', () => {
      const lines = createTextLines(['(a (b c) d)']);
      const cursor = new LispTokenCursor(lines, 0, 0, scanner);

      expect(cursor.forwardList()).toBe(true);
      expect(cursor.getToken()?.raw).toBe(')');
      expect(cursor.offsetStart).toBe(10);
    });
  });

  describe('upList and downList', () => {
    test('should move up to parent list', () => {
      const lines = createTextLines(['(a (b c) d)']);
      const cursor = new LispTokenCursor(lines, 0, 4, scanner);

      expect(cursor.getToken()?.raw).toBe('b');
      expect(cursor.upList()).toBe(true);
      expect(cursor.getToken()?.raw).toBe('(');
      expect(cursor.offsetStart).toBe(3);
    });

    test('should move down to child list', () => {
      const lines = createTextLines(['(a (b c) d)']);
      const cursor = new LispTokenCursor(lines, 0, 0, scanner);

      expect(cursor.getToken()?.raw).toBe('(');
      expect(cursor.downList()).toBe(true);
      expect(cursor.getToken()?.raw).toBe('(');
      expect(cursor.offsetStart).toBe(3);
    });
  });

  describe('rangeForCurrentForm', () => {
    test('should get range for atom', () => {
      const lines = createTextLines(['foo']);
      const cursor = new LispTokenCursor(lines, 0, 0, scanner);

      const [start, end] = cursor.rangeForCurrentForm(0);
      expect(start).toBe(0);
      expect(end).toBe(3);
    });

    test('should get range for list', () => {
      const lines = createTextLines(['(foo bar)']);
      const cursor = new LispTokenCursor(lines, 0, 0, scanner);

      const [start, end] = cursor.rangeForCurrentForm(0);
      expect(start).toBe(0);
      expect(end).toBe(9);
    });

    test('should get range from closing delimiter', () => {
      const lines = createTextLines(['(foo bar)']);
      const cursor = new LispTokenCursor(lines, 0, 4, scanner);

      const [start, end] = cursor.rangeForCurrentForm(8);
      expect(start).toBe(0);
      expect(end).toBe(9);
    });
  });

  describe('rangeForDefun', () => {
    test('should get range for top-level form', () => {
      const lines = createTextLines(['(defun foo (x) (+ x 1))']);
      const cursor = new LispTokenCursor(lines, 0, 0, scanner);

      const [start, end] = cursor.rangeForDefun(0);
      expect(start).toBe(0);
      expect(end).toBe(23);
    });

    test('should get range from nested position', () => {
      const lines = createTextLines(['(defun foo (x) (+ x 1))']);
      const cursor = new LispTokenCursor(lines, 0, 8, scanner);

      // Position at '+'
      const [start, end] = cursor.rangeForDefun(15);
      expect(start).toBe(0);
      expect(end).toBe(23);
    });
  });

  describe('whitespace navigation', () => {
    test('should move forward over whitespace', () => {
      const lines = createTextLines(['   foo']);
      const cursor = new LispTokenCursor(lines, 0, 0, scanner);

      expect(cursor.forwardWhitespace()).toBe(true);
      expect(cursor.getToken()?.raw).toBe('foo');
    });

    test('should move backward over whitespace', () => {
      const lines = createTextLines(['foo   bar']);
      const cursor = new LispTokenCursor(lines, 0, 2, scanner);

      expect(cursor.backwardWhitespace()).toBe(true);
      expect(cursor.getToken()?.type).toBe('ws');
    });
  });
});
