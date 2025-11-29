/**
 * VS Code-based tokenizer that uses the editor's language grammar
 * to properly identify comments and strings based on the language
 */

import * as vscode from 'vscode';
import { TokenType, Token, ScannerState } from './lexer';

/**
 * Token scope patterns that indicate comments
 */
const COMMENT_SCOPES = [
  'comment',
  'punctuation.definition.comment'
];

/**
 * Token scope patterns that indicate strings
 */
const STRING_SCOPES = [
  'string',
  'punctuation.definition.string'
];

/**
 * Check if a token scope indicates a comment
 */
function isCommentScope(scopes: string[]): boolean {
  return scopes.some(scope => 
    COMMENT_SCOPES.some(pattern => scope.includes(pattern))
  );
}

/**
 * Check if a token scope indicates a string
 */
function isStringScope(scopes: string[]): boolean {
  return scopes.some(scope => 
    STRING_SCOPES.some(pattern => scope.includes(pattern))
  );
}

/**
 * VS Code tokenizer that uses semantic tokens from the language service
 */
export class VSCodeTokenizer {
  private document: vscode.TextDocument;
  private delimiterChars: Set<string>;
  
  constructor(document: vscode.TextDocument, delimiterChars: Set<string>) {
    this.document = document;
    this.delimiterChars = delimiterChars;
  }
  
  /**
   * Process a line using VS Code's tokenization
   * Returns tokens with proper comment/string detection based on language grammar
   */
  async processLine(lineNumber: number, line: string, startState: ScannerState): Promise<Token[]> {
    const tokens: Token[] = [];
    let offset = 0;
    let state = { ...startState };
    
    // Get semantic tokens for this line if available
    const semanticTokens = await this.getSemanticTokensForLine(lineNumber);
    
    while (offset < line.length) {
      const char = line[offset];
      const remaining = line.substring(offset);
      
      // Check if we're in a string based on state
      if (state.inString) {
        const token = this.scanString(remaining, offset, state);
        tokens.push(token);
        offset += token.raw.length;
        state = { ...token.state };
        continue;
      }
      
      // Check if this position is in a comment or string according to VS Code
      const tokenType = this.getTokenTypeAtPosition(lineNumber, offset, semanticTokens);
      
      if (tokenType === 'comment') {
        // This is a comment - consume rest of line
        tokens.push({
          type: 'comment',
          raw: remaining,
          offset,
          state: { ...state }
        });
        break;
      }
      
      if (tokenType === 'string-start') {
        // Start of a string
        tokens.push({
          type: 'str-start',
          raw: char,
          offset,
          state: { inString: true, stringDelimiter: char }
        });
        state = { inString: true, stringDelimiter: char };
        offset++;
        continue;
      }
      
      // Handle whitespace
      if (this.isWhitespace(char)) {
        const token = this.scanWhitespace(remaining, offset, state);
        tokens.push(token);
        offset += token.raw.length;
        continue;
      }
      
      // Handle delimiters
      if (this.delimiterChars.has(char)) {
        const token = this.scanDelimiter(char, offset, state);
        tokens.push(token);
        offset++;
        state = { ...token.state };
        continue;
      }
      
      // Handle identifiers
      const token = this.scanIdentifier(remaining, offset, state);
      tokens.push(token);
      offset += token.raw.length;
    }
    
    return tokens;
  }
  
  /**
   * Get semantic tokens for a specific line
   * This is a simplified version - in practice, we'd use VS Code's tokenization API
   */
  private async getSemanticTokensForLine(lineNumber: number): Promise<Map<number, string>> {
    const tokenMap = new Map<number, string>();
    
    try {
      // Use VS Code's DocumentSemanticTokensProvider if available
      const tokens = await vscode.commands.executeCommand<vscode.SemanticTokens>(
        'vscode.provideDocumentSemanticTokens',
        this.document.uri
      );
      
      if (tokens) {
        // Parse semantic tokens for this line
        // Note: This is a simplified implementation
        // Real implementation would decode the semantic tokens properly
        return tokenMap;
      }
    } catch (error) {
      // Semantic tokens not available
    }
    
    // Fallback: use TextMate tokens via the document's language configuration
    return this.getTextMateTokensForLine(lineNumber);
  }
  
  /**
   * Get TextMate tokens for a line using VS Code's tokenization
   */
  private async getTextMateTokensForLine(lineNumber: number): Promise<Map<number, string>> {
    const tokenMap = new Map<number, string>();
    const line = this.document.lineAt(lineNumber);
    
    try {
      // Use the internal tokenization API
      // This requires accessing VS Code's TextMate tokenizer
      // For now, we'll use a heuristic approach
      
      // Check if the language has comment syntax defined
      const languageConfig = await this.getLanguageConfiguration();
      
      if (languageConfig) {
        // Check for line comments
        if (languageConfig.lineComment) {
          const commentStart = line.text.indexOf(languageConfig.lineComment);
          if (commentStart !== -1) {
            tokenMap.set(commentStart, 'comment');
          }
        }
        
        // Check for block comments
        if (languageConfig.blockComment) {
          const blockStart = line.text.indexOf(languageConfig.blockComment[0]);
          if (blockStart !== -1) {
            tokenMap.set(blockStart, 'comment');
          }
        }
      }
    } catch (error) {
      // Tokenization not available
    }
    
    return tokenMap;
  }
  
  /**
   * Get language configuration for comment syntax
   */
  private async getLanguageConfiguration(): Promise<{ lineComment?: string; blockComment?: [string, string] } | null> {
    try {
      // Get the language configuration
      const languageId = this.document.languageId;
      
      // Common language configurations
      const configs: Record<string, { lineComment?: string; blockComment?: [string, string] }> = {
        'javascript': { lineComment: '//', blockComment: ['/*', '*/'] },
        'typescript': { lineComment: '//', blockComment: ['/*', '*/'] },
        'python': { lineComment: '#' },
        'ruby': { lineComment: '#' },
        'clojure': { lineComment: ';' },
        'lisp': { lineComment: ';' },
        'scheme': { lineComment: ';' },
        'racket': { lineComment: ';', blockComment: ['#|', '|#'] },
        'java': { lineComment: '//', blockComment: ['/*', '*/'] },
        'c': { lineComment: '//', blockComment: ['/*', '*/'] },
        'cpp': { lineComment: '//', blockComment: ['/*', '*/'] },
        'csharp': { lineComment: '//', blockComment: ['/*', '*/'] },
        'go': { lineComment: '//', blockComment: ['/*', '*/'] },
        'rust': { lineComment: '//', blockComment: ['/*', '*/'] },
        'swift': { lineComment: '//', blockComment: ['/*', '*/'] },
        'kotlin': { lineComment: '//', blockComment: ['/*', '*/'] },
        'scala': { lineComment: '//', blockComment: ['/*', '*/'] },
        'haskell': { lineComment: '--', blockComment: ['{-', '-}'] },
        'elixir': { lineComment: '#' },
        'erlang': { lineComment: '%' },
        'lua': { lineComment: '--', blockComment: ['--[[', ']]'] },
        'perl': { lineComment: '#' },
        'r': { lineComment: '#' },
        'julia': { lineComment: '#', blockComment: ['#=', '=#'] },
        'matlab': { lineComment: '%', blockComment: ['%{', '%}'] },
        'sql': { lineComment: '--', blockComment: ['/*', '*/'] },
        'html': { blockComment: ['<!--', '-->'] },
        'xml': { blockComment: ['<!--', '-->'] },
        'css': { blockComment: ['/*', '*/'] },
        'scss': { lineComment: '//', blockComment: ['/*', '*/'] },
        'less': { lineComment: '//', blockComment: ['/*', '*/'] },
        'yaml': { lineComment: '#' },
        'toml': { lineComment: '#' },
        'ini': { lineComment: ';' },
        'bash': { lineComment: '#' },
        'sh': { lineComment: '#' },
        'powershell': { lineComment: '#', blockComment: ['<#', '#>'] },
        'bat': { lineComment: 'REM' },
        'dockerfile': { lineComment: '#' },
        'makefile': { lineComment: '#' },
        'json': {}, // JSON has no comments
        'jsonc': { lineComment: '//', blockComment: ['/*', '*/'] }
      };
      
      return configs[languageId] || null;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Determine the token type at a specific position
   */
  private getTokenTypeAtPosition(
    lineNumber: number,
    offset: number,
    semanticTokens: Map<number, string>
  ): 'comment' | 'string-start' | 'string-inside' | 'normal' {
    const tokenType = semanticTokens.get(offset);
    
    if (tokenType === 'comment') {
      return 'comment';
    }
    
    // Check for string delimiters
    const line = this.document.lineAt(lineNumber).text;
    const char = line[offset];
    
    if (char === '"' || char === "'" || char === '`') {
      // Check if this is escaped
      if (offset > 0 && line[offset - 1] === '\\') {
        return 'string-inside';
      }
      return 'string-start';
    }
    
    return 'normal';
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
        if (i === 0) {
          return {
            type: 'str-end',
            raw: char,
            offset,
            state: { inString: false, stringDelimiter: undefined }
          };
        }
        return {
          type: 'str-inside',
          raw: text.substring(0, i),
          offset,
          state: { ...state }
        };
      }
      
      i++;
    }
    
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
  
  private scanDelimiter(char: string, offset: number, state: ScannerState): Token {
    // Determine if this is an open or close delimiter
    // This logic should be provided by the Scanner class
    const openSymmetric = state.openSymmetricDelimiters || [];
    
    // For now, use simple heuristics
    const isOpen = ['(', '[', '{'].includes(char);
    const isClose = [')', ']', '}'].includes(char);
    
    if (char === '"') {
      // String delimiter - handled separately
      return {
        type: 'open',
        raw: char,
        offset,
        state: { ...state }
      };
    }
    
    return {
      type: isOpen ? 'open' : 'close',
      raw: char,
      offset,
      state: { ...state }
    };
  }
  
  private scanIdentifier(text: string, offset: number, state: ScannerState): Token {
    let i = 0;
    
    while (i < text.length) {
      const char = text[i];
      
      if (this.isWhitespace(char) || this.delimiterChars.has(char)) {
        break;
      }
      
      i++;
    }
    
    if (i === 0) {
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
}

/**
 * Check if VS Code tokenization is available for a document
 */
export async function isVSCodeTokenizationAvailable(document: vscode.TextDocument): Promise<boolean> {
  try {
    // Check if there's a language extension providing tokenization
    const extensions = vscode.extensions.all;
    const languageId = document.languageId;
    
    // Check if any extension contributes grammars for this language
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

/**
 * Show a warning that no language support is available
 */
export function showNoLanguageSupportWarning(languageId: string): void {
  vscode.window.showWarningMessage(
    `Paredit: No language extension found for '${languageId}'. ` +
    `Comment detection may be inaccurate. Please install a language extension for better support.`,
    'Dismiss'
  );
}
