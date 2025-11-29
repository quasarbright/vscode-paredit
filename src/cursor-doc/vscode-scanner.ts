/**
 * VS Code-aware scanner
 * 
 * This scanner is language-agnostic and does NOT hardcode any comment syntax.
 * Comment detection is delegated entirely to VS Code's language extensions.
 * 
 * We use VS Code's language configuration API to detect which parts of the
 * document are comments, based on the language's registered configuration.
 */

import * as vscode from 'vscode';
import { Scanner, Token, ScannerState, DelimiterPair } from './lexer';

/**
 * Cache for comment ranges by line
 */
interface CommentCache {
  version: number;
  ranges: Map<number, Array<{ start: number; end: number }>>;
}

/**
 * Scanner that uses VS Code's language services to detect comments
 */
export class VSCodeScanner extends Scanner {
  private document: vscode.TextDocument;
  private commentCache: CommentCache | null = null;

  constructor(document: vscode.TextDocument, delimiters?: DelimiterPair[]) {
    super(delimiters);
    this.document = document;
  }

  /**
   * Process a line with comment detection using VS Code's language services
   */
  processLine(line: string, startState: ScannerState, lineNumber?: number): Token[] {
    // Get tokens from base scanner
    const tokens = super.processLine(line, startState, lineNumber);

    // If we don't have a line number, we can't detect comments
    if (lineNumber === undefined) {
      return tokens;
    }

    // Get comment ranges for this line
    const commentRanges = this.getCommentRangesForLine(lineNumber);
    if (commentRanges.length === 0) {
      return tokens;
    }

    // Filter out tokens that are inside comments and replace with comment tokens
    const result: Token[] = [];
    let commentStartOffset = -1;

    for (const token of tokens) {
      const tokenStart = token.offset;
      const tokenEnd = token.offset + token.raw.length;

      // Check if this token overlaps with any comment range
      const inComment = commentRanges.some(
        range => tokenStart < range.end && tokenEnd > range.start
      );

      if (inComment) {
        // If this is the first token in a comment, mark where the comment starts
        if (commentStartOffset === -1) {
          commentStartOffset = tokenStart;
        }
      } else {
        // If we were in a comment, create a comment token for it
        if (commentStartOffset !== -1) {
          const commentRange = commentRanges.find(r => commentStartOffset >= r.start && commentStartOffset < r.end);
          if (commentRange) {
            result.push({
              type: 'comment',
              raw: line.substring(commentRange.start, commentRange.end),
              offset: commentRange.start,
              state: startState
            });
          }
          commentStartOffset = -1;
        }
        // Add the non-comment token
        result.push(token);
      }
    }

    // If we ended while in a comment, add the comment token
    if (commentStartOffset !== -1) {
      const commentRange = commentRanges.find(r => commentStartOffset >= r.start && commentStartOffset < r.end);
      if (commentRange) {
        result.push({
          type: 'comment',
          raw: line.substring(commentRange.start, commentRange.end),
          offset: commentRange.start,
          state: startState
        });
      }
    }

    return result;
  }

  /**
   * Get comment ranges for a line using VS Code's language configuration
   * This delegates to the language extension without hardcoding syntax
   */
  private getCommentRangesForLine(lineNumber: number): Array<{ start: number; end: number }> {
    // Check if cache is valid
    if (!this.commentCache || this.commentCache.version !== this.document.version) {
      this.commentCache = {
        version: this.document.version,
        ranges: new Map()
      };
    }

    // Check cache for this line
    if (this.commentCache.ranges.has(lineNumber)) {
      return this.commentCache.ranges.get(lineNumber)!;
    }

    // Compute comment ranges for this line
    const ranges = this.detectCommentRanges(lineNumber);
    this.commentCache.ranges.set(lineNumber, ranges);
    return ranges;
  }

  /**
   * Detect comment ranges using VS Code's language configuration
   * This is language-agnostic - it queries VS Code for the language's comment syntax
   */
  private detectCommentRanges(lineNumber: number): Array<{ start: number; end: number }> {
    const ranges: Array<{ start: number; end: number }> = [];
    
    try {
      const line = this.document.lineAt(lineNumber);
      const text = line.text;

      // Get the language configuration from VS Code
      // This is the key: we ask VS Code what the comment syntax is for this language
      const languageId = this.document.languageId;
      
      // Use VS Code's internal language configuration
      // We need to check for line comments using the language's registered configuration
      const commentConfig = this.getLanguageCommentConfig(languageId);
      
      if (commentConfig && commentConfig.lineComment) {
        // Find line comment start
        const commentStart = text.indexOf(commentConfig.lineComment);
        if (commentStart !== -1) {
          ranges.push({ start: commentStart, end: text.length });
        }
      }

      // TODO: Handle block comments if needed
      
    } catch (error) {
      // If we can't detect comments, return empty array
      // This is safe - we'll just treat everything as code
    }

    return ranges;
  }

  /**
   * Get comment configuration for a language by querying VS Code's extension host
   * This is language-agnostic - it uses the language extension's configuration
   */
  private getLanguageCommentConfig(languageId: string): { lineComment?: string; blockComment?: [string, string] } | null {
    // Delegate to the language-config module which reads from extension configurations
    const { getCommentConfig } = require('./language-config');
    return getCommentConfig(languageId);
  }

  /**
   * Get the document this scanner is working with
   */
  getDocument(): vscode.TextDocument {
    return this.document;
  }

  /**
   * Clear the comment cache (call when document changes)
   */
  clearCache(): void {
    this.commentCache = null;
  }
}
