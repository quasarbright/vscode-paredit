/**
 * Tests for test helper functions
 * 
 * These tests verify that the cursor notation helpers work correctly
 * with real VS Code documents.
 */

import * as assert from 'assert';
import { createDocumentWithCursor, getDocumentWithCursor, closeDocument } from './test-helpers';

suite('Test Helper Functions', () => {
  test('createDocumentWithCursor creates document with single cursor', async () => {
    const { editor, doc } = await createDocumentWithCursor("(foo bar|)", 'javascript');
    
    // Verify document text
    assert.strictEqual(editor.document.getText(), '(foo bar)');
    
    // Verify cursor position
    const cursorOffset = editor.document.offsetAt(editor.selection.active);
    assert.strictEqual(cursorOffset, 8, 'Cursor should be at position 8');
    
    // Verify EditableDocument is created
    assert.ok(doc, 'EditableDocument should be created');
    assert.ok(doc.getModel(), 'EditableDocument should have a model');
    
    await closeDocument();
  });

  test('createDocumentWithCursor creates document with multiple cursors', async () => {
    const { editor } = await createDocumentWithCursor("(|foo) (|bar)", 'javascript');
    
    // Verify document text
    assert.strictEqual(editor.document.getText(), '(foo) (bar)');
    
    // Verify cursor positions
    assert.strictEqual(editor.selections.length, 2, 'Should have 2 cursors');
    
    const cursor1 = editor.document.offsetAt(editor.selections[0].active);
    const cursor2 = editor.document.offsetAt(editor.selections[1].active);
    
    assert.strictEqual(cursor1, 1, 'First cursor should be at position 1');
    assert.strictEqual(cursor2, 7, 'Second cursor should be at position 7');
    
    await closeDocument();
  });

  test('getDocumentWithCursor formats document with cursor notation', async () => {
    const { editor } = await createDocumentWithCursor("(foo bar|)", 'javascript');
    
    // Get formatted string
    const formatted = getDocumentWithCursor(editor);
    
    assert.strictEqual(formatted, '(foo bar|)', 'Should format with cursor notation');
    
    await closeDocument();
  });

  test('getDocumentWithCursor handles multiple cursors', async () => {
    const { editor } = await createDocumentWithCursor("(|foo) (|bar)", 'javascript');
    
    // Get formatted string
    const formatted = getDocumentWithCursor(editor);
    
    assert.strictEqual(formatted, '(|foo) (|bar)', 'Should format with multiple cursors');
    
    await closeDocument();
  });

  test('createDocumentWithCursor respects language ID', async () => {
    const { editor } = await createDocumentWithCursor("(foo bar|)", 'javascript');
    
    assert.strictEqual(editor.document.languageId, 'javascript', 'Language ID should be javascript');
    
    await closeDocument();
  });

  test('EditableDocument can access token cursor', async () => {
    const { doc } = await createDocumentWithCursor("(foo bar|)", 'javascript');
    
    // Verify we can get a token cursor
    const tokenCursor = doc.getTokenCursor(0);
    assert.ok(tokenCursor, 'Should be able to get token cursor');
    
    await closeDocument();
  });

  test('EditableDocument can get model', async () => {
    const { doc } = await createDocumentWithCursor("(foo bar|)", 'javascript');
    
    // Verify we can get the model
    const model = doc.getModel();
    assert.ok(model, 'Should be able to get model');
    
    // Verify model has correct text
    const text = model.getText(0, model.getLength());
    assert.strictEqual(text, '(foo bar)', 'Model should have correct text');
    
    await closeDocument();
  });
});
