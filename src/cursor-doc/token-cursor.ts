/**
 * Token cursor for navigating through tokenized documents
 */

import { Token, TokenType, Scanner, ScannerState } from './lexer';

export interface TextLine {
  tokens: Token[];
  text: string;
  startState: ScannerState;
  endState: ScannerState;
}

/**
 * TokenCursor provides navigation through a tokenized document
 */
export class TokenCursor {
  protected lines: TextLine[];
  protected line: number;
  protected token: number;
  protected scanner: Scanner;

  constructor(lines: TextLine[], line: number = 0, token: number = 0, scanner?: Scanner) {
    this.lines = lines;
    this.line = line;
    this.token = token;
    this.scanner = scanner || new Scanner();
  }

  /**
   * Get the current token
   */
  getToken(): Token | undefined {
    if (this.line < 0 || this.line >= this.lines.length) {
      return undefined;
    }
    const tokens = this.lines[this.line].tokens;
    if (this.token < 0 || this.token >= tokens.length) {
      return undefined;
    }
    return tokens[this.token];
  }

  /**
   * Move to the next token
   * @returns true if successful, false if at end
   */
  next(): boolean {
    if (this.line >= this.lines.length) {
      return false;
    }

    const currentLine = this.lines[this.line];
    
    if (this.token < currentLine.tokens.length - 1) {
      this.token++;
      return true;
    }

    // Move to next line
    if (this.line < this.lines.length - 1) {
      this.line++;
      this.token = 0;
      return true;
    }

    return false;
  }

  /**
   * Move to the previous token
   * @returns true if successful, false if at start
   */
  previous(): boolean {
    if (this.token > 0) {
      this.token--;
      return true;
    }

    // Move to previous line
    if (this.line > 0) {
      this.line--;
      const prevLine = this.lines[this.line];
      this.token = Math.max(0, prevLine.tokens.length - 1);
      return true;
    }

    return false;
  }

  /**
   * Check if cursor is at the start of the document
   */
  atStart(): boolean {
    return this.line === 0 && this.token === 0;
  }

  /**
   * Check if cursor is at the end of the document
   */
  atEnd(): boolean {
    if (this.line >= this.lines.length) {
      return true;
    }
    if (this.line === this.lines.length - 1) {
      const lastLine = this.lines[this.line];
      // At end if we're past the last token
      return this.token >= lastLine.tokens.length - 1;
    }
    return false;
  }

  /**
   * Get the start offset of the current token in the document
   */
  get offsetStart(): number {
    if (this.line < 0 || this.line >= this.lines.length) {
      return 0;
    }

    let offset = 0;
    
    // Add lengths of all previous lines
    for (let i = 0; i < this.line; i++) {
      offset += this.lines[i].text.length;
      offset += 1; // newline character
    }

    // Add offset within current line
    const token = this.getToken();
    if (token) {
      offset += token.offset;
    }

    return offset;
  }

  /**
   * Get the end offset of the current token in the document
   */
  get offsetEnd(): number {
    const token = this.getToken();
    if (!token) {
      return this.offsetStart;
    }
    return this.offsetStart + token.raw.length;
  }

  /**
   * Clone this cursor
   */
  clone(): TokenCursor {
    return new TokenCursor(this.lines, this.line, this.token, this.scanner);
  }

  /**
   * Check if this cursor equals another cursor
   */
  equals(other: TokenCursor): boolean {
    return this.line === other.line && this.token === other.token;
  }

  /**
   * Get current line number
   */
  get lineNumber(): number {
    return this.line;
  }

  /**
   * Get current token index
   */
  get tokenIndex(): number {
    return this.token;
  }

  /**
   * Set position
   */
  set(line: number, token: number): void {
    this.line = line;
    this.token = token;
  }

  /**
   * Check if current token matches a type
   */
  isType(type: TokenType): boolean {
    const token = this.getToken();
    return token?.type === type;
  }

  /**
   * Check if current token is whitespace
   */
  isWhitespace(): boolean {
    return this.isType('ws') || this.isType('ws-nl');
  }

  /**
   * Check if current token is a comment
   */
  isComment(): boolean {
    return this.isType('comment');
  }
}

/**
 * LispTokenCursor extends TokenCursor with sexp-aware navigation
 */
export class LispTokenCursor extends TokenCursor {
  /**
   * Move forward one sexp
   * @param skipComments - whether to skip over comments
   * @param skipMetadata - whether to skip metadata (reserved for future use)
   * @returns true if successful
   */
  forwardSexp(skipComments: boolean = true, skipMetadata: boolean = false): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    // Skip whitespace and comments if requested
    if (skipComments && (this.isWhitespace() || this.isComment())) {
      if (!this.next()) {
        return false;
      }
      return this.forwardSexp(skipComments, skipMetadata);
    }

    if (token.type === 'open') {
      // Move to matching close delimiter, then past it
      if (!this.forwardList()) {
        return false;
      }
      return this.next();
    } else if (token.type === 'close') {
      // Already at close, just move past it
      return this.next();
    } else {
      // Atom - just move to next token
      return this.next();
    }
  }

  /**
   * Move backward one sexp
   * @param skipComments - whether to skip over comments
   * @param skipMetadata - whether to skip metadata (reserved for future use)
   * @returns true if successful
   */
  backwardSexp(skipComments: boolean = true, skipMetadata: boolean = false): boolean {
    if (!this.previous()) {
      return false;
    }

    const token = this.getToken();
    if (!token) {
      return false;
    }

    // Skip whitespace and comments if requested
    if (skipComments && (this.isWhitespace() || this.isComment())) {
      return this.backwardSexp(skipComments, skipMetadata);
    }

    if (token.type === 'close') {
      // Move to matching open delimiter
      return this.backwardList();
    } else if (token.type === 'open') {
      // Already at open, we're done
      return true;
    } else {
      // Atom - we're done
      return true;
    }
  }

  /**
   * Move forward to the closing delimiter of the current list
   * @returns true if successful
   */
  forwardList(): boolean {
    const startToken = this.getToken();
    if (!startToken || startToken.type !== 'open') {
      return false;
    }

    const openDelim = startToken.raw;
    const closeDelim = this.scanner.getMatchingDelimiter(openDelim);
    if (!closeDelim) {
      return false;
    }

    let depth = 1;
    
    while (this.next()) {
      const token = this.getToken();
      if (!token) {
        break;
      }

      if (token.type === 'open' && token.raw === openDelim) {
        depth++;
      } else if (token.type === 'close' && token.raw === closeDelim) {
        depth--;
        if (depth === 0) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Move backward to the opening delimiter of the current list
   * @returns true if successful
   */
  backwardList(): boolean {
    const startToken = this.getToken();
    if (!startToken || startToken.type !== 'close') {
      return false;
    }

    const closeDelim = startToken.raw;
    const openDelim = this.scanner.getOpeningDelimiter(closeDelim);
    if (!openDelim) {
      return false;
    }

    let depth = 1;
    
    while (this.previous()) {
      const token = this.getToken();
      if (!token) {
        break;
      }

      if (token.type === 'close' && token.raw === closeDelim) {
        depth++;
      } else if (token.type === 'open' && token.raw === openDelim) {
        depth--;
        if (depth === 0) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Move up to the opening delimiter of the parent list
   * @returns true if successful
   */
  upList(): boolean {
    let depth = 0;
    const cursor = this.clone() as LispTokenCursor;

    while (cursor.previous()) {
      const token = cursor.getToken();
      if (!token) {
        break;
      }

      if (token.type === 'close') {
        depth++;
      } else if (token.type === 'open') {
        if (depth === 0) {
          // Found parent opening delimiter
          this.set(cursor.lineNumber, cursor.tokenIndex);
          return true;
        }
        depth--;
      }
    }

    return false;
  }

  /**
   * Move down to the opening delimiter of the first child list
   * @returns true if successful
   */
  downList(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    // If we're on an open delimiter, move inside
    if (token.type === 'open') {
      if (!this.next()) {
        return false;
      }
    }

    // Find the next open delimiter at the same or deeper level
    while (true) {
      const currentToken = this.getToken();
      if (!currentToken) {
        return false;
      }

      if (currentToken.type === 'open') {
        return true;
      }

      if (currentToken.type === 'close') {
        // We've gone too far
        return false;
      }

      if (!this.next()) {
        return false;
      }
    }
  }

  /**
   * Move forward over whitespace
   * @returns true if moved
   */
  forwardWhitespace(): boolean {
    let moved = false;
    while (this.isWhitespace()) {
      if (!this.next()) {
        break;
      }
      moved = true;
    }
    return moved;
  }

  /**
   * Move backward over whitespace
   * @returns true if moved
   */
  backwardWhitespace(): boolean {
    let moved = false;
    while (this.previous() && this.isWhitespace()) {
      moved = true;
    }
    // Move back to the last whitespace token
    if (moved && !this.isWhitespace()) {
      this.next();
    }
    return moved;
  }

  /**
   * Get the range (start and end offsets) for the current form
   * @param offset - the current offset in the document
   * @returns [start, end] offsets, or [offset, offset] if no form found
   */
  rangeForCurrentForm(offset: number): [number, number] {
    const token = this.getToken();
    if (!token) {
      return [offset, offset];
    }

    if (token.type === 'open') {
      // Get range from open to matching close
      const start = this.offsetStart;
      const cursor = this.clone() as LispTokenCursor;
      if (cursor.forwardList()) {
        return [start, cursor.offsetEnd];
      }
      return [start, start];
    } else if (token.type === 'close') {
      // Get range from matching open to close
      const end = this.offsetEnd;
      const cursor = this.clone() as LispTokenCursor;
      if (cursor.backwardList()) {
        return [cursor.offsetStart, end];
      }
      return [end, end];
    } else {
      // Atom - return its range
      return [this.offsetStart, this.offsetEnd];
    }
  }

  /**
   * Get the range for the top-level form (defun)
   * @param offset - the current offset in the document
   * @returns [start, end] offsets
   */
  rangeForDefun(offset: number): [number, number] {
    // Find the outermost form by going up until we can't go up anymore
    const cursor = this.clone() as LispTokenCursor;
    let lastValidStart = cursor.offsetStart;
    let lastValidEnd = cursor.offsetEnd;

    // First, make sure we're at the start of a form
    const token = cursor.getToken();
    if (token && token.type !== 'open') {
      // Try to find the containing form
      if (!cursor.upList()) {
        // We're at top level already
        return cursor.rangeForCurrentForm(offset);
      }
    }

    // Keep going up until we can't anymore
    while (true) {
      const [start, end] = cursor.rangeForCurrentForm(offset);
      lastValidStart = start;
      lastValidEnd = end;

      if (!cursor.upList()) {
        break;
      }
    }

    return [lastValidStart, lastValidEnd];
  }

  /**
   * Clone this cursor as a LispTokenCursor
   */
  clone(): LispTokenCursor {
    return new LispTokenCursor(this.lines, this.line, this.token, this.scanner);
  }
}
