/**
 * Test helper functions for integration tests with cursor notation
 * 
 * These helpers allow writing tests using cursor notation ("|") with real VS Code documents.
 * They create actual VS Code documents and editors, and work with EditableDocument.
 * 
 * Example usage:
 *   const { editor, doc } = await createDocumentWithCursor("|'foo bar'", 'javascript');
 *   // ... perform operations ...
 *   assert.strictEqual(getDocumentWithCursor(editor), "'foo bar'|");
 *   await closeDocument();
 */

import * as vscode from 'vscode';
import { parseCursorString, formatCursorString } from '../cursor-notation';
import { EditableDocument } from '../../../src/cursor-doc/model';
import { VSCodeScanner } from '../../../src/cursor-doc/vscode-scanner';
import { getDelimitersForLanguage } from '../../../src/config';
import { DelimiterPair } from '../../../src/cursor-doc/lexer';

/**
 * Create a VS Code document with cursor notation
 * 
 * Parses the input string with cursor notation ("|"), creates a real VS Code document,
 * opens it in an editor, sets the cursor position(s), and returns an EditableDocument.
 * 
 * @param input - String with "|" markers indicating cursor positions
 * @param languageId - Language ID for the document (default: 'javascript')
 * @returns Object with the editor and EditableDocument
 * 
 * @example
 * const { editor, doc } = await createDocumentWithCursor("|'foo bar'", 'javascript');
 * // Document has text "'foo bar'" with cursor at position 0
 * 
 * @example
 * const { editor, doc } = await createDocumentWithCursor("(|foo) (|bar)", 'racket');
 * // Document has text "(foo) (bar)" with cursors at positions 1 and 7
 */
export async function createDocumentWithCursor(
  input: string,
  languageId: string = 'racket'
): Promise<{ editor: vscode.TextEditor; doc: EditableDocument }> {
  // 1. Parse cursor notation
  const { text, cursors } = parseCursorString(input);
  
  // 2. Create real VS Code document
  const vscodeDoc = await vscode.workspace.openTextDocument({
    content: text,
    language: languageId
  });
  
  // 3. Open in editor
  const editor = await vscode.window.showTextDocument(vscodeDoc);
  
  // 4. Set cursor positions
  editor.selections = cursors.map(offset => {
    const pos = vscodeDoc.positionAt(offset);
    return new vscode.Selection(pos, pos);
  });
  
  // 5. Get delimiters for the language
  const delimiters: DelimiterPair[] = getDelimitersForLanguage(languageId);
  
  // 6. Create VSCodeScanner with the document and delimiters
  const scanner = new VSCodeScanner(vscodeDoc, delimiters);
  
  // 7. Create EditableDocument (our existing class)
  const editableDoc = new EditableDocument(editor, scanner);
  
  return { editor, doc: editableDoc };
}

/**
 * Get document text with cursor notation
 * 
 * Formats the current document text with "|" markers at cursor positions.
 * 
 * @param editor - VS Code TextEditor
 * @returns String with "|" markers at cursor positions
 * 
 * @example
 * const result = getDocumentWithCursor(editor);
 * // Returns: "'foo bar'|" if cursor is at end of "'foo bar'"
 */
export function getDocumentWithCursor(editor: vscode.TextEditor): string {
  const text = editor.document.getText();
  const cursors = editor.selections.map(s => 
    editor.document.offsetAt(s.active)
  );
  return formatCursorString(text, cursors);
}

/**
 * Close the active document
 * 
 * Closes the currently active editor. Should be called after each test
 * to clean up documents.
 * 
 * @example
 * test('some test', async () => {
 *   const { editor, doc } = await createDocumentWithCursor("|test");
 *   // ... test code ...
 *   await closeDocument();
 * });
 */
export async function closeDocument(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
}

/**
 * Close all open documents
 * 
 * Closes all open editors. This is useful in afterEach hooks to ensure
 * all documents are cleaned up, even if a test fails before calling closeDocument().
 * 
 * @example
 * suite('My Tests', () => {
 *   afterEach(async () => {
 *     await closeAllDocuments();
 *   });
 * });
 */
export async function closeAllDocuments(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.closeAllEditors');
}
