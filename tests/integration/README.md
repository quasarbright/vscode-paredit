# VS Code Integration Tests

This directory contains integration tests that run in a real VS Code environment.

## Structure

```
tests/integration/
├── README.md           # This file
├── runTest.ts          # Test launcher - downloads VS Code and runs tests
├── suite/
│   ├── index.ts        # Mocha test runner configuration
│   └── *.test.ts       # Integration test files
└── cursor-notation.ts  # Shared cursor notation utilities
```

## Test Workspace

Integration tests run in a dedicated test workspace located at `test-workspace/`. This workspace:

- Is automatically opened when tests run
- Has paredit configuration pre-configured in `.vscode/settings.json`
- Provides a clean environment for each test run
- Is isolated from other VS Code extensions

## Running Tests

```bash
# Run all integration tests
npm run test:integration

# Run only unit tests (Jest)
npm run test:unit

# Run all tests (unit + integration)
npm test
```

## Writing Integration Tests

Integration tests use Mocha with the BDD interface (`describe` and `it`):

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

describe('My Feature', () => {
  it('should do something', async () => {
    // Create a document
    const doc = await vscode.workspace.openTextDocument({
      content: '(foo bar)',
      language: 'javascript'
    });
    
    // Open in editor
    const editor = await vscode.window.showTextDocument(doc);
    
    // Test something
    assert.strictEqual(doc.getText(), '(foo bar)');
    
    // Clean up
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  });
});
```

### Using Test Helpers with Cursor Notation

For testing paredit operations, use the cursor notation helpers in `suite/test-helpers.ts`:

```typescript
import * as assert from 'assert';
import { createDocumentWithCursor, getDocumentWithCursor, closeDocument } from './test-helpers';

describe('Paredit Operations', () => {
  it('should move cursor forward', async () => {
    // Create document with cursor at position marked by "|"
    const { editor, doc } = await createDocumentWithCursor("|(foo bar)", 'javascript');
    
    // Perform operations using EditableDocument
    const model = doc.getModel();
    assert.strictEqual(model.getText(0, model.getLength()), '(foo bar)');
    
    // Verify cursor position using cursor notation
    assert.strictEqual(getDocumentWithCursor(editor), '|(foo bar)');
    
    // Clean up
    await closeDocument();
  });
  
  it('supports multiple cursors', async () => {
    const { editor, doc } = await createDocumentWithCursor("(|foo) (|bar)", 'javascript');
    
    // Document has text "(foo) (bar)" with cursors at positions 1 and 7
    assert.strictEqual(editor.selections.length, 2);
    
    await closeDocument();
  });
});
```

**Test Helper Functions:**

- `createDocumentWithCursor(input, languageId)` - Creates a VS Code document with cursor notation
  - Parses `"|"` markers as cursor positions
  - Returns `{ editor, doc }` where `doc` is an `EditableDocument`
  - Supports multiple cursors: `"(|foo) (|bar)"`
  
- `getDocumentWithCursor(editor)` - Formats document text with cursor notation
  - Returns string with `"|"` markers at current cursor positions
  - Useful for assertions
  
- `closeDocument()` - Closes the active editor
  - Always call this after each test to clean up

**Benefits of Cursor Notation:**

- Concise test syntax: `"|(foo bar)"` instead of separate text and position
- Visual clarity: Easy to see where cursors are in the text
- Multi-cursor support: `"(|foo) (|bar)"` for multiple selections
- Reuses the same format as Jest unit tests

### Important Notes

1. **Use `describe` and `it`**, not `suite` and `test` (both work in Mocha BDD, but `describe`/`it` are more standard)
2. **Always clean up** - Close documents/editors after each test
3. **Use `async/await`** - Most VS Code APIs are asynchronous
4. **Timeout** - Integration tests have a 10-second timeout (configured in `suite/index.ts`)

## Test Configuration

### runTest.ts

Configures how VS Code is launched:
- Downloads VS Code if needed (cached in `.vscode-test/`)
- Opens the `test-workspace` folder
- Disables other extensions for isolation
- Disables GPU for better CI compatibility
- Disables workspace trust prompts

### suite/index.ts

Configures Mocha:
- Uses BDD interface (`describe`/`it`)
- 10-second timeout for integration tests
- Discovers all `*.test.js` files in the `suite/` directory

## Headless Mode

Integration tests attempt to run with minimal UI:

- **Linux**: Fully headless using Xvfb (no window shown)
- **macOS**: Window appears briefly (~2-3 seconds) then closes automatically
- **Windows**: Window appears briefly (~2-3 seconds) then closes automatically

The tests use flags like `--disable-gpu`, `--skip-welcome`, and `--no-sandbox` to minimize the window's impact.

## CI Integration

Integration tests run in CI using Xvfb for headless testing on Linux:

```yaml
- name: Run Integration Tests
  run: xvfb-run -a npm run test:integration
  if: runner.os == 'Linux'
```

On macOS and Windows, tests run with a brief window that closes automatically.

## Language Extension Handling

Integration tests use **real language extensions** with graceful fallback, not mocks.

### How It Works

1. **JavaScript/TypeScript**: Built-in to VS Code, always available
2. **Racket**: Optional extension, falls back to defaults if not installed
3. **Fallback Behavior**: When a language extension is not found, the system uses default delimiters: `() [] {} ""`

### Fallback Implementation

The fallback is implemented in `src/cursor-doc/language-config.ts`:

```typescript
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

### Testing Without Optional Extensions

Tests work even if optional language extensions (like Racket) are not installed:

- Tests still pass using default delimiters
- Warning logged to console when falling back
- Language-specific behavior won't be tested (e.g., Racket's single-quote handling)

### Why No Mocks?

The project intentionally uses real language extensions instead of mocks because:

- JavaScript/TypeScript extensions are built-in to VS Code
- Tests verify actual integration with real extensions
- Fallback system handles missing extensions gracefully
- No maintenance burden of keeping mocks in sync with real extensions

## Troubleshooting

### Tests fail with "suite is not defined"

Use `describe` and `it` instead of `suite` and `test`.

### Tests timeout

Increase the timeout in `suite/index.ts`:

```typescript
const mocha = new Mocha({
  timeout: 20000 // 20 seconds
});
```

### VS Code doesn't download

Check your internet connection and proxy settings. VS Code is downloaded from:
`https://update.code.visualstudio.com/`

### Tests fail in CI

Ensure Xvfb is installed and running on Linux systems.

### Language extension warnings

If you see warnings like "No language extension found for 'racket', using defaults":

- This is expected if the Racket extension is not installed
- Tests will still pass using default delimiters
- To test Racket-specific behavior, install the Racket extension
- JavaScript/TypeScript tests always work (built-in extensions)
