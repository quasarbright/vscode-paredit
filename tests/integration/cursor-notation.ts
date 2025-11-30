/**
 * Cursor notation utilities for testing
 * 
 * These utilities provide a convenient way to write tests using cursor notation ("|")
 * to indicate cursor positions in text. This format is shared between Jest unit tests
 * and Mocha integration tests.
 * 
 * Example: "(foo bar|) baz" represents text "(foo bar) baz" with cursor at position 8
 * Example: "(|foo) (|bar)" represents text "(foo) (bar)" with cursors at positions 1 and 7
 */

/**
 * Parse a string with cursor notation ("|") into text and cursor position(s)
 * 
 * @param input - String with "|" markers indicating cursor positions
 * @returns Object with text (without markers) and cursor positions
 * 
 * @example
 * parseCursorString("(foo bar|) baz")
 * // Returns: { text: "(foo bar) baz", cursor: 8, cursors: [8] }
 * 
 * @example
 * parseCursorString("(|foo) (|bar)")
 * // Returns: { text: "(foo) (bar)", cursor: 1, cursors: [1, 7] }
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
 * 
 * @param text - The text content
 * @param cursorOrCursors - Single cursor position or array of cursor positions
 * @returns String with "|" markers at cursor positions
 * 
 * @example
 * formatCursorString("(foo bar) baz", 8)
 * // Returns: "(foo bar|) baz"
 * 
 * @example
 * formatCursorString("(foo) (bar)", [1, 7])
 * // Returns: "(|foo) (|bar)"
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
