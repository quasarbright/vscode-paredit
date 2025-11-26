/**
 * Tests for LineInputModel
 */

import { LineInputModel } from '../src/cursor-doc/model';

describe('LineInputModel', () => {
  describe('getOffsetForLine', () => {
    it('should return 0 for line 0', () => {
      const model = new LineInputModel('hello\nworld');
      expect(model.getOffsetForLine(0)).toBe(0);
    });

    it('should calculate offset for line 1', () => {
      const model = new LineInputModel('hello\nworld');
      // "hello" = 5 chars + 1 newline = 6
      expect(model.getOffsetForLine(1)).toBe(6);
    });

    it('should calculate offset for multiple lines', () => {
      const model = new LineInputModel('foo\nbar\nbaz');
      // Line 0: "foo" = 3 chars + 1 newline = 4
      // Line 1: "bar" = 3 chars + 1 newline = 4
      // Line 2 starts at offset 8
      expect(model.getOffsetForLine(2)).toBe(8);
    });

    it('should handle empty lines', () => {
      const model = new LineInputModel('foo\n\nbar');
      expect(model.getOffsetForLine(0)).toBe(0);
      expect(model.getOffsetForLine(1)).toBe(4); // "foo\n"
      expect(model.getOffsetForLine(2)).toBe(5); // "foo\n\n"
    });
  });

  describe('getText', () => {
    it('should get text within a single line', () => {
      const model = new LineInputModel('hello world');
      expect(model.getText(0, 5)).toBe('hello');
      expect(model.getText(6, 11)).toBe('world');
    });

    it('should get text across multiple lines', () => {
      const model = new LineInputModel('foo\nbar\nbaz');
      expect(model.getText(0, 7)).toBe('foo\nbar');
      expect(model.getText(4, 11)).toBe('bar\nbaz');
    });

    it('should get entire document', () => {
      const text = 'foo\nbar\nbaz';
      const model = new LineInputModel(text);
      expect(model.getText(0, model.getLength())).toBe(text);
    });
  });

  describe('getTokenCursor', () => {
    it('should create cursor at offset 0', () => {
      const model = new LineInputModel('(foo bar)');
      const cursor = model.getTokenCursor(0);
      expect(cursor.lineNumber).toBe(0);
      expect(cursor.tokenIndex).toBe(0);
    });

    it('should create cursor at specific offset', () => {
      const model = new LineInputModel('(foo bar)');
      // Offset 1 should be at "foo" token
      const cursor = model.getTokenCursor(1);
      const token = cursor.getToken();
      expect(token?.raw).toBe('foo');
    });

    it('should handle multi-line documents', () => {
      const model = new LineInputModel('(foo\nbar)');
      // Offset 5 is start of line 1 (after "foo\n")
      const cursor = model.getTokenCursor(5);
      expect(cursor.lineNumber).toBe(1);
    });
  });

  describe('caching and versioning', () => {
    it('should increment version on update', () => {
      const model = new LineInputModel('foo');
      const v1 = model.getVersion();
      model.update('bar');
      const v2 = model.getVersion();
      expect(v2).toBe(v1 + 1);
    });

    it('should re-tokenize on update', () => {
      const model = new LineInputModel('foo');
      let cursor = model.getTokenCursor(0);
      expect(cursor.getToken()?.raw).toBe('foo');

      model.update('bar');
      cursor = model.getTokenCursor(0);
      expect(cursor.getToken()?.raw).toBe('bar');
    });

    it('should maintain scanner state across lines', () => {
      const model = new LineInputModel('(foo "hello\nworld" bar)');
      const lines = model.getLines();
      
      // First line should end with inString: true
      expect(lines[0].endState.inString).toBe(true);
      
      // Second line should start with inString: true
      expect(lines[1].startState.inString).toBe(true);
    });
  });

  describe('getLength', () => {
    it('should return correct length for single line', () => {
      const model = new LineInputModel('hello');
      expect(model.getLength()).toBe(5);
    });

    it('should return correct length for multiple lines', () => {
      const model = new LineInputModel('foo\nbar');
      // "foo" (3) + "\n" (1) + "bar" (3) = 7
      expect(model.getLength()).toBe(7);
    });

    it('should handle empty document', () => {
      const model = new LineInputModel('');
      expect(model.getLength()).toBe(0);
    });
  });
});
