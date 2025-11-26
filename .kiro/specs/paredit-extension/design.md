# Design Document

## Overview

This VS Code extension provides language-agnostic structural editing capabilities by extracting and adapting Calva's paredit implementation. The extension enables users to navigate and manipulate nested code structures (s-expressions) using vim-compatible keybindings and paredit-style commands. 

The design directly follows Calva's proven architecture, which uses a token-based cursor system for navigating and manipulating code structures. We will extract the core paredit logic from Calva and make it configurable for any language with balanced delimiters.

The extension will be built using TypeScript and the VS Code Extension API, reusing Calva's lexer, token cursor, and paredit command implementations.

## Architecture

### High-Level Architecture (Based on Calva)

```
┌─────────────────────────────────────────────────────────────┐
│                        VS Code API                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Paredit Extension Entry                     │
│                    (src/paredit/extension.ts)                │
│  - Registers paredit commands                                │
│  - Wraps EditableDocument around VS Code TextEditor         │
│  - Manages language activation                               │
│  - Handles configuration changes                             │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼             ▼
┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐
│  Configuration   │  │   Command    │  │ EditableDocument │
│                  │  │   Handlers   │  │     (Model)      │
│ - Language list  │  │ (commands.ts)│  │   (model.ts)     │
│ - File exts      │  │              │  │                  │
│ - Vim keybinds   │  │ - Navigation │  │ - LineInputModel │
│                  │  │ - Selection  │  │ - Token cache    │
│                  │  │ - Slurp/Barf │  │ - Edit ops       │
│                  │  │ - Raise/     │  │ - Selections     │
│                  │  │   Splice     │  │                  │
└──────────────────┘  └──────────────┘  └──────────────────┘
                              │                    │
                              ▼                    ▼
                    ┌──────────────────┐  ┌──────────────────┐
                    │ Paredit Logic    │  │  Token Cursor    │
                    │  (paredit.ts)    │  │(token-cursor.ts) │
                    │                  │  │                  │
                    │ - Range calcs    │  │ - Sexp traversal │
                    │ - Slurp/barf     │  │ - List navigation│
                    │ - Raise/splice   │  │ - Delimiter match│
                    │ - Kill/copy      │  │                  │
                    └──────────────────┘  └──────────────────┘
                                                   │
                                                   ▼
                                          ┌──────────────────┐
                                          │  Lexer/Scanner   │
                                          │ (lexer.ts)       │
                                          │                  │
                                          │ - Tokenization   │
                                          │ - Delimiter pairs│
                                          │ - String/comment │
                                          │   handling       │
                                          └──────────────────┘
```

### Component Interaction Flow (Calva Pattern)

1. User triggers a command via keybinding or command palette
2. Extension checks if current file is in active language list
3. Extension wraps VS Code TextEditor in EditableDocument
4. Command handler calls paredit function with EditableDocument
5. Paredit function gets TokenCursor from document model
6. TokenCursor navigates token stream to find target ranges
7. Paredit function calculates edit operations
8. EditableDocument applies edits via VS Code API
9. VS Code updates the visible document and selections

## Components and Interfaces

### Files to Extract from Calva

The following files will be copied and adapted from Calva's `src/cursor-doc/` directory:

1. **lexer.ts** - Base lexical grammar engine
2. **clojure-lexer.ts** - Tokenizer (will be made language-agnostic)
3. **model.ts** - LineInputModel and EditableDocument
4. **token-cursor.ts** - TokenCursor and LispTokenCursor
5. **paredit.ts** - Core paredit operations

### 1. Extension Entry Point (`src/paredit/extension.ts`)

Based directly on Calva's `src/paredit/extension.ts`. This file registers all paredit commands and wraps VS Code editors.

**Key Responsibilities:**
- Register paredit commands with VS Code
- Wrap TextEditor in EditableDocument for each command
- Check language activation before executing commands
- Handle configuration changes
- Manage status bar indicator

**Key Pattern from Calva:**
```typescript
// Command registration pattern
const pareditCommands = [
  {
    command: 'paredit.forwardSexp',
    handler: (doc: EditableDocument, opts?: { multicursor: boolean }) => {
      const isMulti = multiCursorEnabled(opts?.multicursor);
      handlers.forwardSexp(doc, isMulti);
    },
  },
  // ... more commands
];

// Wrap editor and execute
function wrapPareditCommand(command: string, handler: Function) {
  return async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !isLanguageEnabled(editor.document)) {
      return;
    }
    const doc = new EditableDocument(editor);
    await handler(doc);
  };
}
```

**Configuration:**
```typescript
// Language activation (replaces Calva's hardcoded languages)
function isLanguageEnabled(document: vscode.TextDocument): boolean {
  const config = vscode.workspace.getConfiguration('paredit');
  const languages: string[] = config.get('enabledLanguages', []);
  const extensions: string[] = config.get('enabledFileExtensions', []);
  
  return languages.includes(document.languageId) || 
         extensions.some(ext => document.fileName.endsWith(ext));
}
```

### 2. Command Handlers (`src/paredit/commands.ts`)

Copied directly from Calva with minimal changes. These are thin wrappers that call paredit functions.

**Pattern:**
```typescript
export function forwardSexp(doc: EditableDocument, isMulti: boolean = false) {
  const selections = isMulti ? doc.selections : [doc.selections[0]];
  const ranges = selections.map((s) => paredit.forwardSexpRange(doc, s.end));
  paredit.moveToRangeRight(doc, ranges);
}
```

All commands follow this pattern:
1. Get selections (single or multi-cursor)
2. Calculate target ranges using paredit functions
3. Apply movement/selection/edit via paredit functions

### 3. EditableDocument and Model (`src/cursor-doc/model.ts`)

Copied from Calva. This is the core document abstraction that wraps VS Code's TextEditor.

**Key Classes:**

**LineInputModel:**
- Maintains tokenized representation of document
- Caches tokens per line with scanner state
- Provides offset-to-position conversions
- Creates TokenCursor instances

**EditableDocument:**
- Wraps VS Code TextEditor
- Maintains LineInputModel
- Manages selections (ModelEditSelection)
- Applies edits via VS Code API

**ModelEditSelection:**
- Represents cursor/selection with anchor and active positions
- Tracks direction (forward/backward)
- Provides range conversions

**Key Interface:**
```typescript
class EditableDocument {
  model: LineInputModel;
  selections: ModelEditSelection[];
  
  getTokenCursor(offset: number): LispTokenCursor;
  
  async edit(
    edits: ModelEdit[],
    options: ModelEditOptions
  ): Promise<boolean>;
}
```

### 4. Token Cursor (`src/cursor-doc/token-cursor.ts`)

Copied from Calva. Provides navigation through token stream.

**TokenCursor:**
- Basic token-by-token navigation
- Position tracking (line, token, offset)
- Forward/backward movement

**LispTokenCursor (extends TokenCursor):**
- Sexp-aware navigation
- Delimiter matching
- List traversal (up, down, forward, backward)
- Range calculations for sexps

**Key Methods:**
```typescript
class LispTokenCursor extends TokenCursor {
  forwardSexp(skipComments?: boolean, skipMetadata?: boolean): boolean
  backwardSexp(skipComments?: boolean, skipMetadata?: boolean): boolean
  forwardList(): boolean
  backwardList(): boolean
  upList(): boolean
  downList(): boolean
  forwardWhitespace(): boolean
  backwardWhitespace(): boolean
  rangeForCurrentForm(offset: number): [number, number]
  rangeForDefun(offset: number): [number, number]
}
```

### 5. Paredit Operations (`src/cursor-doc/paredit.ts`)

Copied from Calva. Contains all paredit command implementations.

**Key Functions:**

**Range Calculations:**
```typescript
function forwardSexpRange(doc: EditableDocument, offset: number): [number, number]
function backwardSexpRange(doc: EditableDocument, offset: number): [number, number]
function rangeToForwardUpList(doc: EditableDocument, offset: number): [number, number]
function rangeToBackwardUpList(doc: EditableDocument, offset: number): [number, number]
```

**Movement:**
```typescript
function moveToRangeLeft(doc: EditableDocument, ranges: ModelEditRange[]): void
function moveToRangeRight(doc: EditableDocument, ranges: ModelEditRange[]): void
```

**Selection:**
```typescript
function selectRange(doc: EditableDocument, ranges: ModelEditRange[]): void
function selectCurrentForm(doc: EditableDocument, topLevel: boolean): void
function growSelection(doc: EditableDocument, selections: ModelEditSelection[]): void
function shrinkSelection(doc: EditableDocument, selections: ModelEditSelection[]): void
```

**Manipulation:**
```typescript
function slurpSexp(doc: EditableDocument, ...): Promise<void>
function barfSexp(doc: EditableDocument, ...): Promise<void>
function raiseSexp(doc: EditableDocument, ...): Promise<void>
function spliceSexp(doc: EditableDocument, ...): Promise<void>
function wrapSexpr(doc: EditableDocument, open: string, close: string): Promise<void>
```

### 6. Lexer and Scanner (`src/cursor-doc/lexer.ts` and `clojure-lexer.ts`)

The lexer will be adapted to be language-agnostic while keeping Calva's architecture.

**Changes Needed:**
- Make delimiter patterns configurable
- Remove Clojure-specific tokens (keywords, reader macros, etc.)
- Keep core token types: open, close, ws, comment, string, id
- Maintain string state tracking for proper delimiter matching

**Core Token Types:**
```typescript
type TokenType = 
  | 'open'      // Opening delimiter: (, [, {
  | 'close'     // Closing delimiter: ), ], }
  | 'ws'        // Whitespace
  | 'comment'   // Comments
  | 'str-inside'// Inside string
  | 'id'        // Identifiers/atoms
  | 'junk';     // Catch-all

interface Token {
  type: TokenType;
  raw: string;
  offset: number;
  state: ScannerState;
}
```

## Data Models

### Token and Scanner State (from Calva)

```typescript
interface Token {
  type: TokenType;
  raw: string;
  offset: number;
  state: ScannerState;
}

interface ScannerState {
  inString: boolean;
}

class Scanner {
  state: ScannerState;
  processLine(line: string, state: ScannerState): Token[];
}
```

### Model Edit Types (from Calva)

```typescript
type ModelEditRange = [start: number, end: number];
type ModelEditDirectedRange = [anchor: number, active: number];

class ModelEditSelection {
  anchor: number;    // Start of selection
  active: number;    // End of selection (where cursor is)
  start: number;     // Min of anchor/active
  end: number;       // Max of anchor/active
  isReversed: boolean;
  
  get asRange(): ModelEditRange;
  get asDirectedRange(): ModelEditDirectedRange;
}

class ModelEdit<T extends ModelEditFunction> {
  constructor(
    public editFn: 'insertString' | 'changeRange' | 'deleteRange',
    public args: any[]
  );
}
```

### Line Input Model (from Calva)

```typescript
class TextLine {
  tokens: Token[];
  text: string;
  startState: ScannerState;
  endState: ScannerState;
}

class LineInputModel {
  lines: TextLine[];
  
  getTokenCursor(offset: number): LispTokenCursor;
  getOffsetForLine(line: number): number;
  getText(start: number, end: number): string;
  edit(edits: ModelEdit[], options: ModelEditOptions): Promise<boolean>;
}
```

### Configuration Schema

```typescript
{
  "paredit.enabledLanguages": {
    "type": "array",
    "default": ["javascript", "typescript", "json", "lisp", "scheme", "racket"],
    "description": "Language IDs where paredit commands are active"
  },
  "paredit.enabledFileExtensions": {
    "type": "array",
    "default": [],
    "description": "File extensions where paredit commands are active (e.g., ['.lisp', '.scm'])"
  },
  "paredit.vimMode": {
    "type": "boolean",
    "default": true,
    "description": "Enable vim-compatible keybindings (H, L, etc.)"
  },
  "paredit.multicursor": {
    "type": "boolean",
    "default": false,
    "description": "Enable multi-cursor support for paredit commands"
  }
}
```

## Error Handling

### Parser Error Handling

**Unbalanced Delimiters:**
- Parser continues past unbalanced delimiters
- Marks affected regions as invalid
- Commands refuse to operate on invalid structures
- User receives notification about syntax errors

**Invalid UTF-8 or Encoding Issues:**
- Parser falls back to character-by-character scanning
- Logs warning but continues operation
- May result in degraded performance

### Command Error Handling

**Operation Would Create Invalid Structure:**
- Command validates operation before execution
- Returns early without modifying document
- Optionally shows user notification explaining why operation was blocked

**Cursor Outside Any Sexp:**
- Navigation commands search for nearest sexp
- If no sexp found, command is no-op
- User receives subtle feedback (status bar message)

**Configuration Errors:**
- Invalid configuration values are ignored
- Extension falls back to defaults
- Warning logged to output channel

### Error Recovery Strategy

1. Validate inputs before operations
2. Use transactions for multi-step edits
3. Catch exceptions at command boundaries
4. Log errors to extension output channel
5. Show user-friendly messages for actionable errors
6. Fail gracefully without crashing extension

## Testing Strategy

### Unit Tests

**Parser Tests:**
- Test delimiter matching with various nesting levels
- Test string literal handling (escaped quotes, multi-line)
- Test comment handling (line and block comments)
- Test edge cases (empty documents, single characters)
- Test custom delimiter configurations
- Test malformed input (unbalanced delimiters)

**Command Tests:**
- Test each command with simple structures
- Test commands with deeply nested structures
- Test commands at document boundaries
- Test commands with selections
- Test undo/redo behavior

**Configuration Tests:**
- Test language activation logic
- Test configuration change handling
- Test custom delimiter loading
- Test invalid configuration handling

### Integration Tests

**End-to-End Command Execution:**
- Create test documents with known structures
- Execute commands programmatically
- Verify document state after execution
- Test command sequences (e.g., slurp then barf)

**Multi-Cursor Support:**
- Test commands with multiple cursors
- Verify each cursor operates independently
- Ensure no interference between operations

**Performance Tests:**
- Test parsing large documents (10,000+ lines)
- Measure command execution time
- Verify acceptable performance thresholds
- Test with deeply nested structures (100+ levels)

### Test File Organization

```
test/
├── suite/
│   ├── parser.test.ts
│   ├── commands/
│   │   ├── navigation.test.ts
│   │   ├── selection.test.ts
│   │   ├── manipulation.test.ts
│   │   └── clipboard.test.ts
│   ├── config.test.ts
│   └── integration.test.ts
├── fixtures/
│   ├── simple.lisp
│   ├── nested.js
│   ├── malformed.json
│   └── large.ts
└── runTest.ts
```

### Testing Tools

- **Mocha**: Test framework
- **VS Code Test API**: Integration testing
- **Sinon**: Mocking and stubbing
- **Coverage**: Istanbul/nyc for code coverage

### Continuous Testing

- Run unit tests on every file save during development
- Run full test suite before commits
- Automated testing in CI/CD pipeline
- Target: >80% code coverage

## Implementation Notes

### Code Reuse from Calva

**Files to Copy Directly (Minimal Changes):**
1. `src/cursor-doc/lexer.ts` - Base lexer engine (no changes)
2. `src/cursor-doc/token-cursor.ts` - Token navigation (no changes)
3. `src/paredit/commands.ts` - Command handlers (no changes)
4. `src/paredit/statusbar.ts` - Status bar indicator (adapt for language config)

**Files to Adapt:**
1. `src/cursor-doc/clojure-lexer.ts` → `src/cursor-doc/generic-lexer.ts`
   - Remove Clojure-specific token types (keywords, reader macros, etc.)
   - Keep: open, close, ws, comment, string, id, junk
   - Make delimiter patterns configurable
   
2. `src/cursor-doc/model.ts`
   - Remove Clojure-specific formatting logic
   - Keep core LineInputModel and EditableDocument
   - Adapt edit operations to be language-agnostic

3. `src/paredit/extension.ts`
   - Replace hardcoded language list with configuration
   - Add language activation checking
   - Keep command registration pattern

4. `src/cursor-doc/paredit.ts`
   - Keep all core paredit operations
   - Remove Clojure-specific operations (if any)

### Performance Considerations

Calva's architecture already handles performance well:
- Tokens are cached per line with scanner state
- Document model maintains token cache
- Only re-tokenizes changed lines
- TokenCursor provides efficient navigation without rebuilding trees

### Vim Compatibility

**Default Keybindings (when vimMode: true):**

Based on Calva's keybindings, adapted for vim users:
- `Alt+H`: backward-sexp
- `Alt+L`: forward-sexp  
- `Alt+K`: backward-up-sexp
- `Alt+J`: forward-down-sexp
- `Alt+W`: select-current-form
- `Ctrl+Alt+Right`: slurp-forward
- `Ctrl+Alt+Left`: barf-forward
- `Ctrl+Alt+Shift+Right`: slurp-backward
- `Ctrl+Alt+Shift+Left`: barf-backward

**Keybinding Context:**
```json
{
  "key": "alt+l",
  "command": "paredit.forwardSexp",
  "when": "editorTextFocus && paredit:enabled"
}
```

The `paredit:enabled` context will be set based on language configuration.

### Language-Agnostic Lexer

**Simplified Token Types:**
```typescript
// Remove Clojure-specific types
// Keep only:
toplevel.terminal('ws', /[\t ,]+/);
toplevel.terminal('ws-nl', /(\r|\n|\r\n)/);
toplevel.terminal('comment', /\/\/.*|\/\*[\s\S]*?\*\/|;.*/);  // Multi-language comments
toplevel.terminal('open', /[({[]|"/);  // Opening delimiters
toplevel.terminal('close', /[)\]}]|"/);  // Closing delimiters
toplevel.terminal('id', /[^\s()[\]{}",;]+/);  // Generic identifiers
toplevel.terminal('junk', /[\u0000-\uffff]/);  // Catch-all
```

### Extension Packaging

**package.json:**
```json
{
  "name": "paredit",
  "displayName": "Paredit",
  "description": "Structural editing with paredit commands for any language",
  "version": "0.1.0",
  "publisher": "your-name",
  "engines": {
    "vscode": "^1.80.0"
  },
  "categories": ["Other"],
  "activationEvents": ["*"],
  "main": "./out/extension.js",
  "contributes": {
    "configuration": {
      "title": "Paredit",
      "properties": {
        "paredit.enabledLanguages": { ... },
        "paredit.enabledFileExtensions": { ... },
        "paredit.vimMode": { ... },
        "paredit.multicursor": { ... }
      }
    },
    "commands": [ ... ],
    "keybindings": [ ... ]
  }
}
```

**Build Setup:**
- TypeScript compilation
- Webpack bundling
- Copy pattern: `cp -r ../vscode-paredit/src/cursor-doc src/`

## Differences from Calva

### What We're Removing

1. **Clojure-Specific Features:**
   - REPL integration
   - Namespace handling
   - Clojure formatting (cljfmt)
   - Reader macros and metadata
   - Keyword tokens
   - Data reader tokens
   - Clojure-specific lexer patterns

2. **Calva-Specific Features:**
   - Jack-in functionality
   - Debugger integration
   - Test runner integration
   - Documentation lookup
   - Structural editing mode toggle (always on for configured languages)

### What We're Keeping

1. **Core Paredit Logic:**
   - All navigation commands (forward/backward sexp, up/down)
   - All selection commands (expand/contract, select form)
   - All manipulation commands (slurp/barf, raise/splice, wrap)
   - Kill/copy commands
   - Multi-cursor support

2. **Architecture:**
   - Token-based cursor system
   - LineInputModel document abstraction
   - EditableDocument wrapper
   - Scanner state machine for strings

3. **Command Pattern:**
   - Command registration via extension.ts
   - Thin command handlers in commands.ts
   - Core logic in paredit.ts

### What We're Adding

1. **Language Configuration:**
   - User-configurable language list
   - File extension matching
   - Dynamic activation based on config

2. **Simplified Lexer:**
   - Generic delimiter matching
   - Multi-language comment support
   - Configurable token patterns

## Future Enhancements

### Potential Features (Out of Scope for Initial Release)

1. **Language-Specific Lexers**: Plugin system for custom lexers per language
2. **Visual Indicators**: Highlight matching delimiters on cursor movement
3. **Strict Mode**: Prevent any edits that would create unbalanced delimiters
4. **Auto-Formatting**: Automatically format sexps after manipulation
5. **Paredit Hints**: Show available commands in status bar based on cursor position
6. **Custom Delimiter Pairs**: User-defined delimiter pairs (e.g., `<>` for HTML/XML)
7. **Multi-Language Documents**: Handle embedded languages (e.g., JS in HTML)
8. **More Vim Keybindings**: Additional vim-style shortcuts for power users
