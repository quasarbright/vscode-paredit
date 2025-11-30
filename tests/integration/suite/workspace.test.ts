/**
 * Workspace configuration tests
 * 
 * These tests verify that the VS Code test workspace is properly configured
 * and that the extension can access workspace settings.
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Workspace Configuration', () => {
  test('workspace folder is available', () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    assert.ok(workspaceFolders, 'Workspace folders should be available');
    assert.strictEqual(workspaceFolders.length, 1, 'Should have exactly one workspace folder');
  });

  test('paredit configuration is accessible', () => {
    const config = vscode.workspace.getConfiguration('paredit');
    assert.ok(config, 'Paredit configuration should be accessible');
    
    const enabledLanguages = config.get<string[]>('enabledLanguages');
    assert.ok(enabledLanguages, 'enabledLanguages setting should exist');
    assert.ok(Array.isArray(enabledLanguages), 'enabledLanguages should be an array');
  });

  test('can create and close documents', async () => {
    // Create a new document
    const doc = await vscode.workspace.openTextDocument({
      content: '(foo bar)',
      language: 'javascript'
    });
    
    assert.ok(doc, 'Document should be created');
    assert.strictEqual(doc.getText(), '(foo bar)', 'Document content should match');
    assert.strictEqual(doc.languageId, 'javascript', 'Language ID should be javascript');
    
    // Open in editor
    const editor = await vscode.window.showTextDocument(doc);
    assert.ok(editor, 'Editor should be opened');
    
    // Close the document
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  });
});
