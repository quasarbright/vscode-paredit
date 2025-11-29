/**
 * VS Code-aware scanner
 * 
 * This scanner is language-agnostic and does NOT hardcode any comment syntax.
 * Comment detection is delegated entirely to VS Code's language extensions through
 * the semantic token provider API.
 * 
 * For now, this is a simple wrapper around the base Scanner. In the future, we can
 * enhance it to use VS Code's semantic tokens API when available.
 */

import * as vscode from 'vscode';
import { Scanner, Token, ScannerState, DelimiterPair } from './lexer';

/**
 * Scanner that can be enhanced with VS Code's tokenization in the future
 * Currently delegates all tokenization to the base Scanner
 */
export class VSCodeScanner extends Scanner {
  private document: vscode.TextDocument;

  constructor(document: vscode.TextDocument, delimiters?: DelimiterPair[]) {
    super(delimiters);
    this.document = document;
  }

  /**
   * Process a line
   * 
   * For now, this simply delegates to the base scanner.
   * In the future, we can enhance this to use VS Code's semantic token provider
   * to detect comments based on the language's grammar (without hardcoding syntax).
   */
  processLine(line: string, startState: ScannerState, lineNumber?: number): Token[] {
    // Simply delegate to base scanner
    // The base scanner treats all text as potential code, which is correct
    // for structural editing - we want to navigate through ALL text, including comments
    return super.processLine(line, startState, lineNumber);
  }

  /**
   * Get the document this scanner is working with
   */
  getDocument(): vscode.TextDocument {
    return this.document;
  }
}
