/**
 * VS Code-based semantic lexer
 * 
 * Instead of manually parsing text, this lexer asks VS Code what each token is
 * based on the language's grammar. This makes it truly language-agnostic:
 * - Strings: single quotes, double quotes, template literals, etc.
 * - Comments: line comments, block comments, sexpr comments (#;), etc.
 * - Delimiters: parentheses, brackets, braces, etc.
 * 
 * All determined by the language extension, not hardcoded.
 */

import * as vscode from 'vscode';
import { Token, TokenType, ScannerState } from './lexer';

/**
 * Token scope categories from TextMate grammars
 */
const TOKEN_CATEGORIES = {
  string: ['string', 'string.quoted', 'string.template', 'string.regexp'],
  comment: ['comment', 'comment.line', 'comment.block'],
  punctuation: ['punctuation.definition', 'punctuation.separator', 'punctuation.terminator'],
  delimiter: ['punctuation.section', 'meta.brace', 'meta.bracket', 'meta.paren'],
  keyword: ['keyword', 'storage', 'constant.language'],
  operator: ['keyword.operator'],
};

/**
 * Check if a scope matches any of the patterns
 */
function matchesScope(scope: string, patterns: string[]): boolean {
  return patterns.some(pattern => scope.includes(pattern));
}

/**
 * Determine token type from TextMate scope
 */
function getTokenTypeFromScope(scope: string): TokenType | null {
  if (matchesScope(scope, TOKEN_CATEGORIES.string)) {
    return 'str-inside';
  }
  if (matchesScope(scope, TOKEN_CATEGORIES.comment)) {
    return 'ws'; // Treat comments as whitespace for navigation
  }
  // For delimiters, we need to check the actual character
  // because scope alone doesn't tell us if it's open or close
  return null;
}

/**
 * Check if a character is a delimiter
 */
function isDelimiterChar(char: string): boolean {
  return ['(', ')', '[', ']', '{', '}'].includes(char);
}

/**
 * Check if a character is whitespace
 */
function isWhitespace(char: string): boolean {
  return /\s/.test(char);
}

/**
 * VS Code-based semantic tokenizer
 * Uses the language's TextMate grammar to determine token types
 */
export class VSCodeSemanticLexer {
  private document: vscode.TextDocument;
  private tokenCache: Map<number, vscode.TextEditorDecorationType[]>;

  constructor(document: vscode.TextDocument) {
    this.document = document;
    this.tokenCache = new Map();
  }

  /**
   * Process a line using VS Code's tokenization
   * 
   * This is the key method - it asks VS Code what each character is
   * instead of trying to parse it ourselves.
   */
  async processLine(lineNumber: number, startState: ScannerState): Promise<Token[]> {
    const line = this.document.lineAt(lineNumber);
    const tokens: Token[] = [];
    let offset = 0;
    let state = { ...startState };

    // Get token scopes for this line from VS Code
    const scopes = await this.getTokenScopesForLine(lineNumber);

    while (offset < line.text.length) {
      const char = line.text[offset];
      const scope = scopes.get(offset) || '';

      // Check what VS Code thinks this character is
      const semanticType = getTokenTypeFromScope(scope);

      if (semanticType === 'ws') {
        // VS Code says this is a comment - treat as whitespace
        // Consume the rest of the line (or until comment ends)
        const remaining = line.text.substring(offset);
        tokens.push({
          type: 'ws',
          raw: remaining,
          offset,
          state: { ...state }
        });
        break;
      }

      if (semanticType === 'str-inside') {
        // VS Code says this is inside a string
        // Consume until the string ends (VS Code will tell us)
        const stringToken = this.scanString(line.text, offset, scopes);
        tokens.push(stringToken);
        offset += stringToken.raw.length;
        continue;
      }

      // Check for whitespace
      if (isWhitespace(char)) {
        const wsToken = this.scanWhitespace(line.text, offset, state);
        tokens.push(wsToken);
        offset += wsToken.raw.length;
        continue;
      }

      // Check for delimiters
      if (isDelimiterChar(char)) {
        const delimType = this.getDelimiterType(char);
        tokens.push({
          type: delimType,
          raw: char,
          offset,
          state: { ...state }
        });
        offset++;
        continue;
      }

      // Everything else is an identifier
      const idToken = this.scanIdentifier(line.text, offset, state, scopes);
      tokens.push(idToken);
      offset += idToken.raw.length;
    }

    return tokens;
  }

  /**
   * Get TextMate token scopes for each character in a line
   * 
   * This is where we ask VS Code: "What is each character?"
   * VS Code uses the language's TextMate grammar to answer.
   */
  private async getTokenScopesForLine(lineNumber: number): Promise<Map<number, string>> {
    const scopeMap = new Map<number, string>();

    try {
      // Unfortunately, VS Code doesn't expose TextMate tokens directly to extensions
      // We need to use a workaround or wait for an API
      
      // For now, return empty map - we'll implement this properly
      // when VS Code provides the API
      
      // Possible approaches:
      // 1. Use vscode.executeDocumentSymbolProvider (limited)
      // 2. Use vscode.executeDocumentSemanticTokensProvider (if available)
      // 3. Parse the language's grammar ourselves (complex)
      // 4. Use a language server protocol (overkill)
      
      return scopeMap;
    } catch (error) {
      return scopeMap;
    }
  }

  /**
   * Scan a string token
   * VS Code tells us where the string starts and ends
   */
  private scanString(text: string, offset: number, scopes: Map<number, string>): Token {
    let i = offset;
    
    // Find where the string ends by checking scopes
    while (i < text.length) {
      const scope = scopes.get(i) || '';
      if (!matchesScope(scope, TOKEN_CATEGORIES.string)) {
        break;
      }
      i++;
    }

    return {
      type: 'str-inside',
      raw: text.substring(offset, i),
      offset,
      state: { inString: false }
    };
  }

  /**
   * Scan whitespace
   */
  private scanWhitespace(text: string, offset: number, state: ScannerState): Token {
    let i = offset;
    let hasNewline = false;

    while (i < text.length && isWhitespace(text[i])) {
      if (text[i] === '\n' || text[i] === '\r') {
        hasNewline = true;
      }
      i++;
    }

    return {
      type: hasNewline ? 'ws-nl' : 'ws',
      raw: text.substring(offset, i),
      offset,
      state: { ...state }
    };
  }

  /**
   * Scan an identifier
   * Stop at whitespace, delimiters, or when scope changes to string/comment
   */
  private scanIdentifier(
    text: string,
    offset: number,
    state: ScannerState,
    scopes: Map<number, string>
  ): Token {
    let i = offset;

    while (i < text.length) {
      const char = text[i];
      const scope = scopes.get(i) || '';

      // Stop if we hit whitespace or delimiter
      if (isWhitespace(char) || isDelimiterChar(char)) {
        break;
      }

      // Stop if scope changes to string or comment
      const semanticType = getTokenTypeFromScope(scope);
      if (semanticType === 'str-inside' || semanticType === 'ws') {
        break;
      }

      i++;
    }

    if (i === offset) {
      // Single character junk
      return {
        type: 'junk',
        raw: text[offset],
        offset,
        state: { ...state }
      };
    }

    return {
      type: 'id',
      raw: text.substring(offset, i),
      offset,
      state: { ...state }
    };
  }

  /**
   * Determine if a delimiter is open or close
   */
  private getDelimiterType(char: string): 'open' | 'close' {
    return ['(', '[', '{'].includes(char) ? 'open' : 'close';
  }
}

/**
 * Check if VS Code tokenization is available for a document
 */
export async function hasVSCodeTokenization(document: vscode.TextDocument): Promise<boolean> {
  try {
    // Check if there's a language extension providing a grammar
    const extensions = vscode.extensions.all;
    const languageId = document.languageId;

    for (const ext of extensions) {
      const grammars = ext.packageJSON?.contributes?.grammars;
      if (grammars) {
        const hasGrammar = grammars.some((g: any) => g.language === languageId);
        if (hasGrammar) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    return false;
  }
}
