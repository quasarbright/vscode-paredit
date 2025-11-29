/**
 * Generic lexer for structural editing
 * Tokenizes code into delimiters, whitespace, strings, and identifiers
 * 
 * Note: This lexer does NOT try to detect comments. Instead, it treats
 * all text as potential code. This is intentional - comment syntax varies
 * wildly between languages (including special forms like Racket's #; sexpr comments),
 * and trying to detect them leads to incorrect behavior.
 * 
 * Comments should be handled at a higher level by checking VS Code's tokenization.
 */

export type TokenType =
  | 'open'       // Opening delimiter: (, [, {
  | 'close'      // Closing delimiter: ), ], }
  | 'ws'         // Whitespace (not newline)
  | 'ws-nl'      // Newline whitespace
  | 'str-inside' // Inside string literal
  | 'str-start'  // String start delimiter
  | 'str-end'    // String end delimiter
  | 'id'         // Identifiers/atoms
  | 'comment'    // Comment (detected by VS Code tokenization)
  | 'junk';      // Catch-all for unrecognized characters

export interface Token {
  type: TokenType;
  raw: string;
  offset: number;
  state: ScannerState;
}

export interface ScannerState {
  inString: boolean;
  stringDelimiter?: string; // Track which quote character started the string
  openSymmetricDelimiters?: string[]; // Track which symmetric delimiters are currently open
}

export interface DelimiterPair {
  open: string;
  close: string;
}

export const DEFAULT_DELIMITERS: DelimiterPair[] = [
  { open: '(', close: ')' },
  { open: '[', close: ']' },
  { open: '{', close: '}' },
  { open: '"', close: '"' }
];

/**
 * Scanner class that tokenizes a line of text
 * Does NOT try to detect comments - that should be done at a higher level
 * using VS Code's tokenization
 */
export class Scanner {
  private delimiters: DelimiterPair[];
  private openDelimiters: Set<string>;
  private closeDelimiters: Set<string>;
  private symmetricDelimiters: Set<string>; // Delimiters where open === close

  constructor(delimiters: DelimiterPair[] = DEFAULT_DELIMITERS) {
    this.delimiters = delimiters;
    this.openDelimiters = new Set(delimiters.map(d => d.open));
    this.closeDelimiters = new Set(delimiters.map(d => d.close));
    this.symmetricDelimiters = new Set(
      delimiters.filter(d => d.open === d.close).map(d => d.open)
    );
  }

  /**
   * Process a line and return tokens
   * @param line - the line text
   * @param startState - the scanner state at the start of the line
   * @param _lineNumber - optional line number (for VS Code integration)
   */
  processLine(line: string, startState: ScannerState, _lineNumber?: number): Token[] {
    const tokens: Token[] = [];
    let offset = 0;
    let state = { ...startState };

    while (offset < line.length) {
      const char = line[offset];
      const remaining = line.substring(offset);

      if (state.inString) {
        // Inside a string literal
        const token = this.scanString(remaining, offset, state);
        tokens.push(token);
        offset += token.raw.length;
        state = { ...token.state };
      } else if (this.isWhitespace(char)) {
        // Whitespace
        const token = this.scanWhitespace(remaining, offset, state);
        tokens.push(token);
        offset += token.raw.length;
      } else if (this.openDelimiters.has(char) || this.closeDelimiters.has(char)) {
        // Delimiter - determine if it's open or close
        const isSymmetric = this.symmetricDelimiters.has(char);
        const openSymmetric = state.openSymmetricDelimiters || [];
        
        let tokenType: 'open' | 'close';
        let newOpenSymmetric = [...openSymmetric];
        
        if (isSymmetric) {
          // For symmetric delimiters, check if one is already open
          const openIndex = openSymmetric.lastIndexOf(char);
          if (openIndex >= 0) {
            // This closes the most recent open symmetric delimiter
            tokenType = 'close';
            newOpenSymmetric.splice(openIndex, 1);
          } else {
            // This opens a new symmetric delimiter
            tokenType = 'open';
            newOpenSymmetric.push(char);
          }
        } else {
          // For asymmetric delimiters, use the normal logic
          tokenType = this.openDelimiters.has(char) ? 'open' : 'close';
        }
        
        tokens.push({
          type: tokenType,
          raw: char,
          offset,
          state: { ...state, openSymmetricDelimiters: newOpenSymmetric }
        });
        state = { ...state, openSymmetricDelimiters: newOpenSymmetric };
        offset++;
      } else {
        // Identifier or junk
        const token = this.scanIdentifier(remaining, offset, state);
        tokens.push(token);
        offset += token.raw.length;
      }
    }

    return tokens;
  }

  private scanString(text: string, offset: number, state: ScannerState): Token {
    let i = 0;
    let escaped = false;
    const delimiter = state.stringDelimiter || '"';

    while (i < text.length) {
      const char = text[i];

      if (escaped) {
        escaped = false;
        i++;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        i++;
        continue;
      }

      if (char === delimiter) {
        // Found end of string - if we haven't consumed any characters yet,
        // return the delimiter itself
        if (i === 0) {
          return {
            type: 'str-end',
            raw: char,
            offset,
            state: { inString: false, stringDelimiter: undefined }
          };
        }
        // Otherwise return the content before the delimiter
        return {
          type: 'str-inside',
          raw: text.substring(0, i),
          offset,
          state: { ...state }
        };
      }

      i++;
    }

    // String continues to end of line
    return {
      type: 'str-inside',
      raw: text.substring(0, i),
      offset,
      state: { ...state }
    };
  }

  private scanWhitespace(text: string, offset: number, state: ScannerState): Token {
    let i = 0;
    let hasNewline = false;

    while (i < text.length && this.isWhitespace(text[i])) {
      if (text[i] === '\n' || text[i] === '\r') {
        hasNewline = true;
      }
      i++;
    }

    return {
      type: hasNewline ? 'ws-nl' : 'ws',
      raw: text.substring(0, i),
      offset,
      state: { ...state }
    };
  }

  private scanIdentifier(text: string, offset: number, state: ScannerState): Token {
    let i = 0;

    // Scan until we hit whitespace or delimiter
    while (i < text.length) {
      const char = text[i];
      
      if (this.isWhitespace(char) ||
          this.openDelimiters.has(char) ||
          this.closeDelimiters.has(char)) {
        break;
      }

      i++;
    }

    if (i === 0) {
      // Single character junk
      return {
        type: 'junk',
        raw: text[0],
        offset,
        state: { ...state }
      };
    }

    return {
      type: 'id',
      raw: text.substring(0, i),
      offset,
      state: { ...state }
    };
  }

  private isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  /**
   * Get the delimiter pair for a given opening delimiter
   */
  getMatchingDelimiter(open: string): string | undefined {
    const pair = this.delimiters.find(d => d.open === open);
    return pair?.close;
  }

  /**
   * Get the opening delimiter for a given closing delimiter
   */
  getOpeningDelimiter(close: string): string | undefined {
    const pair = this.delimiters.find(d => d.close === close);
    return pair?.open;
  }

  /**
   * Check if a character is an opening delimiter
   */
  isOpenDelimiter(char: string): boolean {
    return this.openDelimiters.has(char);
  }

  /**
   * Check if a character is a closing delimiter
   */
  isCloseDelimiter(char: string): boolean {
    return this.closeDelimiters.has(char);
  }
}
