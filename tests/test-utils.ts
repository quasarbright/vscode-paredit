/**
 * Test utilities for paredit operations
 * Provides cursor notation format for easy test writing
 */

import { LineInputModel } from '../src/cursor-doc/model';

/**
 * Parse a string with cursor notation ("|") into text and cursor position(s)
 * Example: "(foo bar|) baz" -> { text: "(foo bar) baz", cursors: [8] }
 * Example: "(|foo) (|bar)" -> { text: "(foo) (bar)", cursors: [1, 7] }
 */
export function parseCursorString(input: string): { text: string; cursor: number; cursors: number[] } {
  const cursors: number[] = [];
  let text = '';
  let offset = 0;
  
  for (let i = 0; i < input.length; i++) {
    if (input[i] === '|') {
      cursors.push(offset);
    } else {
      text += input[i];
      offset++;
    }
  }
  
  if (cursors.length === 0) {
    throw new Error('Cursor notation "|" not found in input string');
  }
  
  return { text, cursor: cursors[0], cursors };
}

/**
 * Format text with cursor position(s) into cursor notation string
 * Example: { text: "(foo bar) baz", cursor: 8 } -> "(foo bar|) baz"
 * Example: { text: "(foo) (bar)", cursors: [1, 7] } -> "(|foo) (|bar)"
 */
export function formatCursorString(text: string, cursorOrCursors: number | number[]): string {
  const cursors = Array.isArray(cursorOrCursors) ? cursorOrCursors : [cursorOrCursors];
  
  // Sort cursors in descending order to insert from right to left
  const sortedCursors = [...cursors].sort((a, b) => b - a);
  
  let result = text;
  for (const cursor of sortedCursors) {
    if (cursor < 0 || cursor > text.length) {
      throw new Error(`Cursor position ${cursor} is out of bounds for text of length ${text.length}`);
    }
    result = result.slice(0, cursor) + '|' + result.slice(cursor);
  }
  
  return result;
}

import { Scanner } from '../src/cursor-doc/lexer';

/**
 * Test scanner that matches reality - NO comment detection
 * 
 * This is intentional: the real implementation does not detect comments
 * because we don't hardcode language-specific comment syntax.
 * Comment detection should be delegated to VS Code's language extensions.
 * 
 * For now, the scanner treats all text as potential code, including
 * what looks like comments. This means:
 * - "//" is treated as an identifier
 * - ";" is treated as an identifier character
 * - ")" inside a comment is treated as a real closing delimiter
 */
class TestScanner extends Scanner {
  // No special comment handling - just use the base Scanner
  // This matches the real VSCodeScanner behavior
}

/**
 * Mock EditableDocument for testing with cursor notation
 */
export class TestDocument {
  private model: LineInputModel;
  public _selections: any[];
  public editor: any = null; // Mock editor

  constructor(text: string, cursor: number = 0) {
    // Use TestScanner which matches reality (no comment detection)
    this.model = new LineInputModel(text, new TestScanner());
    
    // Create a proper selection constructor
    const SelectionConstructor = function(this: any, a: number, b: number) {
      this.anchor = a;
      this.active = b;
      this.start = Math.min(a, b);
      this.end = Math.max(a, b);
      this.constructor = SelectionConstructor;
    } as any;
    
    this._selections = [new SelectionConstructor(cursor, cursor)];
  }

  /**
   * Create a TestDocument from cursor notation string
   * Example: TestDocument.fromString("(foo bar|) baz")
   * Example: TestDocument.fromString("(|foo) (|bar)") - multi-cursor
   */
  static fromString(input: string): TestDocument {
    const { text, cursors } = parseCursorString(input);
    const doc = new TestDocument(text, cursors[0]);
    
    // Set up multiple cursors if present
    if (cursors.length > 1) {
      doc._selections = cursors.map(cursor => {
        const SelectionConstructor = doc._selections[0].constructor as any;
        return new SelectionConstructor(cursor, cursor);
      });
    }
    
    return doc;
  }

  /**
   * Get the current state as a cursor notation string
   */
  toString(): string {
    const fullText = this.model.getText(0, this.model.getLength());
    const cursors = this._selections.map(sel => sel.active);
    return formatCursorString(fullText, cursors);
  }

  /**
   * Get the text content
   */
  getText(start?: number, end?: number): string {
    if (start === undefined) {
      return this.model.getText(0, this.model.getLength());
    }
    if (end === undefined) {
      end = this.model.getLength();
    }
    return this.model.getText(start, end);
  }

  /**
   * Get cursor position
   */
  get cursor(): number {
    return this._selections[0].active;
  }

  /**
   * Set cursor position
   */
  set cursor(pos: number) {
    this._selections = [{
      anchor: pos,
      active: pos,
      start: pos,
      end: pos,
      constructor: this._selections[0].constructor
    }];
  }

  get selections() {
    return this._selections;
  }

  set selections(sels: any[]) {
    this._selections = sels;
  }

  getTokenCursor(offset: number = 0) {
    return this.model.getTokenCursor(offset);
  }

  getModel(): LineInputModel {
    return this.model;
  }

  convertSelections(sels: any[]): any[] {
    return sels;
  }

  offsetToPosition(offset: number): any {
    return { offset };
  }

  getLength(): number {
    return this.model.getLength();
  }

  async changeRange(start: number, end: number, text: string): Promise<void> {
    // Simple implementation for testing
    const before = this.model.getText(0, start);
    const after = this.model.getText(end, this.model.getLength());
    const newText = before + text + after;
    
    // Recreate the model with new text
    this.model = new LineInputModel(newText);
  }

  async deleteRange(start: number, end: number): Promise<void> {
    await this.changeRange(start, end, '');
  }

  async edit(_edits: any[], _options: any = {}): Promise<boolean> {
    // Simple mock implementation
    return true;
  }

  async insertString(offset: number, text: string): Promise<boolean> {
    const before = this.model.getText(0, offset);
    const after = this.model.getText(offset, this.model.getLength());
    const newText = before + text + after;
    this.model = new LineInputModel(newText);
    return true;
  }
}

/**
 * Test helper to verify paredit operations
 * 
 * @example
 * testParedit(
 *   "(foo bar|) baz",
 *   doc => forwardSexpRange(doc, doc.cursor),
 *   "(foo bar) baz|"
 * );
 */
export function testParedit(
  startState: string,
  operation: (doc: TestDocument) => [number, number] | void,
  expectedEndState: string
): void {
  const doc = TestDocument.fromString(startState);
  const result = operation(doc);
  
  if (result) {
    // If operation returns a range, move cursor to the end of the range
    const [_, end] = result;
    doc.cursor = end;
  }
  
  const actualEndState = doc.toString();
  
  if (actualEndState !== expectedEndState) {
    throw new Error(
      `Expected: ${expectedEndState}\n` +
      `Actual:   ${actualEndState}`
    );
  }
}

/**
 * Test helper for async paredit operations (like slurp, barf, etc.)
 * 
 * @example
 * await testPareditAsync(
 *   "(foo bar|) baz",
 *   async doc => await slurpSexpForward(doc),
 *   "(foo bar baz|)"
 * );
 */
export async function testPareditAsync(
  startState: string,
  operation: (doc: TestDocument) => Promise<void>,
  expectedEndState: string
): Promise<void> {
  const doc = TestDocument.fromString(startState);
  await operation(doc);
  
  const actualEndState = doc.toString();
  
  if (actualEndState !== expectedEndState) {
    throw new Error(
      `Expected: ${expectedEndState}\n` +
      `Actual:   ${actualEndState}`
    );
  }
}
