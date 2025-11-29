# Real Document Integration Tests - Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Test Suites                              │
│                                                              │
│  ┌──────────────────────┐    ┌──────────────────────┐      │
│  │   Jest Unit Tests    │    │  Mocha Integration   │      │
│  │                      │    │      Tests           │      │
│  │  - Lexer tests       │    │                      │      │
│  │  - Config tests      │    │  - RealDocument      │      │
│  │  - Token cursor      │    │  - Real VS Code      │      │
│  │  - Model tests       │    │  - Real extensions   │      │
│  │  - Delimiter tests   │    │  - 110+ tests        │      │
│  │                      │    │  - Cursor notation   │      │
│  │  Fast (< 1s)         │    │  Slower (~10-30s)    │      │
│  └──────────────────────┘    └──────────────────────┘      │
│                                        │                     │
│                              ┌─────────▼─────────┐          │
│                              │   RealDocument    │          │
│                              │  (Cursor Notation)│          │
│                              └───────────────────┘          │
└─────────────────────────────────────────────────────────────┘
                                        │
                ┌───────────────────────┼───────────────────┐
                │                       │                   │
        ┌───────▼──────┐        ┌──────▼──────┐    ┌──────▼──────┐
        │ EditableDoc  │        │ VSCodeScan  │    │  Language   │
        │              │        │             │    │  Config     │
        │ (Real Editor)│        │ (Real Scan) │    │ (Real Ext)  │
        └──────────────┘        └─────────────┘    └─────────────┘
```

**Key Changes:**
- Remove TestDocument entirely (or deprecate it)
- All cursor notation tests use RealDocument
- Keep Jest for low-level unit tests (lexer, config, etc.)
- Use Mocha for integration tests with real VS Code

## Component Design

### 1. VS Code Test Setup (Following Official Guide)

**File Structure:**
```
src/test/
├── runTest.ts              # Test launcher (downloads VS Code, runs tests)
├── suite/
│   ├── index.ts            # Mocha test runner setup
│   ├── extension.test.ts   # Existing extension tests
│   └── paredit-integration.test.ts  # New integration tests
└── fixtures/
    └── mock-extensions.ts  # Mock language extension data
```

**runTest.ts** (from VS Code guide):
```typescript
import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    await runTests({ 
      extensionDevelopmentPath, 
      extensionTestsPath,
      launchArgs: ['--disable-extensions'] // Isolate from other extensions
    });
  } catch (err) {
    console.error('Failed to run tests');
    process.exit(1);
  }
}

main();
```

**suite/index.ts** (Mocha setup):
```typescript
import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

export function run(): Promise<void> {
  const mocha = new Mocha({
    ui: 'bdd',
    color: true,
    timeout: 10000 // Integration tests need more time
  });

  const testsRoot = path.resolve(__dirname, '..');

  return new Promise((resolve, reject) => {
    glob('**/**.test.js', { cwd: testsRoot }, (err, files) => {
      if (err) {
        return reject(err);
      }

      files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

      try {
        mocha.run(failures => {
          if (failures > 0) {
            reject(new Error(`${failures} tests failed.`));
          } else {
            resolve();
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  });
}
```

### 2. Cursor Notation Helper Functions

No wrapper class needed - just helper functions to work with cursor notation:

```typescript
// test-helpers.ts

/**
 * Create a VS Code document with cursor notation
 * Returns the editor and EditableDocument
 */
async function createDocumentWithCursor(
  input: string,
  languageId: string = 'javascript'
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
  
  // 5. Create EditableDocument (our existing class)
  const delimiters = config.getDelimitersForLanguage(languageId);
  const scanner = new VSCodeScanner(vscodeDoc, delimiters);
  const editableDoc = new EditableDocument(editor, scanner);
  
  return { editor, doc: editableDoc };
}

/**
 * Get document text with cursor notation
 */
function getDocumentWithCursor(editor: vscode.TextEditor): string {
  const text = editor.document.getText();
  const cursors = editor.selections.map(s => 
    editor.document.offsetAt(s.active)
  );
  return formatCursorString(text, cursors);
}

/**
 * Close the document
 */
async function closeDocument(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
}
```

### 3. Using EditableDocument Directly

No wrapper needed - `EditableDocument` already has everything we need:

```typescript
// EditableDocument already exists and provides:
class EditableDocument {
  constructor(editor: vscode.TextEditor, scanner: Scanner);
  
  // Already has these methods:
  getTokenCursor(offset: number): LispTokenCursor;
  getModel(): LineInputModel;
  getText(): string;
  get cursor(): number;  // Gets first cursor position
  get selections(): ModelEditSelection[];
  
  // And all the edit methods we need
  async edit(edits: Edit[]): Promise<boolean>;
  // ... etc
}
```

**What we add:**
- Helper functions for cursor notation (parse/format)
- Helper to create document with cursor notation
- Helper to close document after test

**What we DON'T need:**
- Wrapper class
- Interface abstraction
- Duplicate API

### 3. Language Extension Fallback

No mocking needed - use real extensions with graceful fallback:

```typescript
// In language-config.ts
export function getBracketPairs(languageId: string): BracketPair[] {
  const config = getLanguageConfig(languageId);
  
  if (!config || !config.brackets || config.brackets.length === 0) {
    // Fallback to default delimiters when extension not found
    console.warn(`No language extension found for '${languageId}', using defaults`);
    return [
      { open: '(', close: ')' },
      { open: '[', close: ']' },
      { open: '{', close: '}' },
      { open: '"', close: '"' }
    ];
  }
  
  return config.brackets;
}
```

**Languages Tested:**
- **JavaScript/TypeScript**: Built-in to VS Code, always available
- **Racket**: Optional extension, falls back to defaults if not installed

**Fallback Behavior:**
- If Racket extension not installed: uses default delimiters `() [] {} ""`
- Tests still pass, but won't test Racket-specific behavior
- Warning logged to console

### 4. Test Structure

**Before (Jest with TestDocument):**
```typescript
// tests/paredit-cursor-notation.test.ts
describe('Paredit with Cursor Notation', () => {
  describe('forwardSexpRange', () => {
    test('move forward over single-quoted string in JavaScript', () => {
      const doc = TestDocument.fromString("|'foo bar'", 'javascript');
      const [_, end] = forwardSexpRange(doc as any, doc.cursor);
      doc.cursor = end;
      expect(doc.toString()).toBe("'foo bar'|");
    });
  });
});
```

**After (Mocha with helper functions):**
```typescript
// src/test/suite/paredit-integration.test.ts
import * as assert from 'assert';
import { createDocumentWithCursor, getDocumentWithCursor, closeDocument } from './test-helpers';
import { forwardSexpRange } from '../../paredit';

suite('Paredit with Cursor Notation', () => {
  suite('forwardSexpRange', () => {
    test('move forward over single-quoted string in JavaScript', async () => {
      const { editor, doc } = await createDocumentWithCursor("|'foo bar'", 'javascript');
      
      const [_, end] = forwardSexpRange(doc, doc.cursor);
      
      // Update cursor position
      const pos = editor.document.positionAt(end);
      editor.selection = new vscode.Selection(pos, pos);
      
      assert.strictEqual(getDocumentWithCursor(editor), "'foo bar'|");
      await closeDocument();
    });
  });
});
```

**Key Differences:**
- `describe` → `suite` (Mocha)
- `test` stays the same
- `expect().toBe()` → `assert.strictEqual()` (or use Chai)
- Use helper functions instead of wrapper class
- Work directly with `EditableDocument` (our existing class)
- Tests are `async` and call `await closeDocument()`

## Implementation Phases

### Phase 1: Foundation
- Create `TestableDocument` interface
- Implement `RealDocument` class
- Set up VS Code test environment
- Create mock language extension system

### Phase 2: Critical Tests
- Identify 5-10 most critical test scenarios
- Implement them with RealDocument
- Compare results with TestDocument
- Document any gaps found

### Phase 3: Language Configuration
- Test JavaScript delimiter configuration
- Test Racket delimiter configuration
- Test comment detection for multiple languages
- Verify language-config.ts reads extensions correctly

### Phase 4: CI Integration
- Add integration test suite to CI
- Configure to run on PRs
- Set up test reporting
- Document how to run locally

## Key Decisions

### Decision 1: Mock vs Real Language Extensions
**Choice**: Use real language extensions
**Rationale**: 
- JavaScript/TypeScript extensions are built-in to VS Code
- Racket extension can be installed for testing
- Tests verify actual integration with real extensions
- Fallback to defaults if extension not installed
- No need to maintain mock system

### Decision 2: Number of Integration Tests
**Choice**: 5-10 critical scenarios
**Rationale**:
- Balance between coverage and speed
- Focus on high-value tests
- Keep TestDocument for comprehensive coverage
- Integration tests catch integration bugs, not logic bugs

### Decision 3: Test Organization
**Choice**: Two test systems - Jest for units, Mocha for integration
**Rationale**:
- Jest for fast unit tests (lexer, config, etc.)
- Mocha for integration tests (required by VS Code)
- Clear separation by test framework
- Can run independently: `npm test` (Jest) vs `npm run test:integration` (Mocha)
- Different performance characteristics (Jest: <1s, Mocha: ~10-30s)

## Testing Strategy

### Jest Unit Tests - ~200 tests
**What:** Low-level component tests
**Files:**
- `tests/lexer.test.ts` - Scanner/tokenizer logic
- `tests/config.test.ts` - Configuration management
- `tests/token-cursor.test.ts` - Token cursor navigation
- `tests/model.test.ts` - Line input model
- `tests/delimiters.test.ts` - Delimiter configuration
- `tests/editable-document.test.ts` - Document wrapper

**Why Jest:**
- Fast (< 1 second)
- No VS Code dependency
- Test pure logic
- Run on every save

### Mocha Integration Tests - 110+ tests
**What:** End-to-end paredit operations with real documents
**Files:**
- `src/test/suite/paredit-integration.test.ts` - All cursor notation tests

**Why Mocha:**
- Required by VS Code testing framework
- Tests real integration
- Verifies language extension behavior
- Catches real-world issues

**What's Tested:**
- All paredit operations (forward/backward sexp, slurp, barf, etc.)
- JavaScript/TypeScript with single-quote strings
- Racket without single-quote strings
- Comment detection from real language extensions
- Multi-line navigation
- Empty line handling
- Nested structures
- String handling across languages

## Open Issues

1. **VS Code Test Environment Setup**: Need to configure proper test environment with @vscode/test-electron
2. **Test Performance**: 110+ integration tests may take 10-30 seconds - acceptable for CI
3. **Cleanup**: Ensure documents/editors are properly closed after each test
4. **Fallback Behavior**: Implement graceful fallback when Racket extension not installed
5. **CI Configuration**: Set up Xvfb for headless testing on Linux
6. **TestDocument Deprecation**: Decide whether to remove TestDocument or keep it for reference
