# Paredit

Structural editing with paredit commands for any language.

Based on [Calva](https://github.com/BetterThanTomorrow/calva)

## Overview

Paredit brings powerful structural editing capabilities to VS Code for any language with balanced delimiters (parentheses, brackets, braces). Originally popularized in Lisp editors, paredit-style editing lets you navigate and manipulate code based on its structure rather than just text, making refactoring faster and safer.

This extension extracts the core structural editing capabilities from Calva and makes them language-agnostic and highly configurable.

## Features

### Key Features

- **Structure-Aware Navigation**: Move through code by s-expressions (balanced structures) rather than characters or words
- **Smart Selection**: Select entire code blocks with a single command, expand/contract selections hierarchically
- **Structural Manipulation**: Slurp, barf, raise, splice, and wrap operations that maintain balanced delimiters
- **Safe Editing**: Kill and copy operations that preserve code structure
- **Vim-Compatible**: Optional vim-style keybindings (H, J, K, L) for navigation
- **Multi-Cursor Support**: Apply structural edits across multiple cursors simultaneously (optional)
- **Language-Agnostic**: Works with JavaScript, TypeScript, JSON, Lisp, Scheme, Racket, and any language with balanced delimiters

## Quick Start

1. Install the extension
2. Open a file with balanced delimiters (JavaScript, JSON, Lisp, etc.)
3. The extension activates automatically for configured languages
4. Try these commands:
   - `Alt+W` - Select the current form
   - `Alt+L` / `Alt+H` - Navigate forward/backward through expressions
   - `Ctrl+Alt+Right` - Slurp (pull next expression into current list)
   - `Alt+R` - Raise (replace parent with current expression)

## Usage Examples

### Example 1: Slurping and Barfing

Transform this:
```javascript
const result = (add(a, b)) + c;
```

Place cursor inside `(add(a, b))` and press `Ctrl+Alt+Right` (slurp forward):
```javascript
const result = (add(a, b) + c);
```

Press `Ctrl+Alt+Shift+Right` (barf forward) to push it back out:
```javascript
const result = (add(a, b)) + c;
```

### Example 2: Raising

Transform this:
```javascript
const value = Math.max(10, Math.min(x, 100));
```

Place cursor on `Math.min(x, 100)` and press `Alt+R` (raise):
```javascript
const value = Math.min(x, 100);
```

### Example 3: Wrapping

Transform this:
```javascript
const items = a, b, c;
```

Select `a, b, c` and press `Alt+Shift+[` (wrap with brackets):
```javascript
const items = [a, b, c];
```

### Example 4: Smart Navigation

In deeply nested code:
```javascript
function process(data) {
  return data.map(item => {
    return transform(item.value);
  });
}
```

Use `Alt+L` to jump between expressions, `Alt+K` to move up to parent structures, and `Alt+J` to move down into nested structures.

<!-- TODO: Add animated GIFs demonstrating:
- Slurp and barf operations
- Raise and splice transformations
- Smart navigation through nested structures
- Selection expansion/contraction
- Wrapping operations
-->

## Keybindings

All keybindings are only active when `paredit.isActive` context is true (i.e., when editing a file in a configured language).

### Navigation

Move through code structures without breaking balanced delimiters:

| Command | Keybinding | Description |
|---------|------------|-------------|
| Forward Sexp | `Alt+L` | Move cursor forward one s-expression (to 1 char after the next sexp) |
| Backward Sexp | `Alt+H` | Move cursor backward one s-expression (to the start of the previous sexp) |
| Forward Up Sexp | `Alt+K` | Move cursor to the opening delimiter of the parent sexp |
| Backward Up Sexp | `Alt+Shift+K` | Move cursor to the opening delimiter of the parent sexp (backward) |
| Forward Down Sexp | `Alt+J` | Move cursor to the opening delimiter of the first child sexp |
| Backward Down Sexp | `Alt+Shift+J` | Move cursor to the opening delimiter of the first child sexp (backward) |
| Forward Sexp or Up | `Alt+Right` | Move forward, or up if at the end of a list |
| Backward Sexp or Up | `Alt+Left` | Move backward, or up if at the start of a list |

### Selection

Select code structures intelligently:

| Command | Keybinding | Description |
|---------|------------|-------------|
| Select Current Form | `Alt+W` | Select the entire sexp at cursor |
| Expand Selection | `Alt+Up` | Expand selection to parent sexp |
| Contract Selection | `Alt+Down` | Contract selection to child sexp |
| Select Top-Level Form | `Ctrl+Alt+W` | Select the top-level form (defun) |
| Select Forward Sexp | `Alt+Shift+L` | Select the next sexp |
| Select Backward Sexp | `Alt+Shift+H` | Select the previous sexp |
| Select Forward Up Sexp | `Ctrl+Alt+K` | Select up to parent (forward) |
| Select Backward Up Sexp | `Ctrl+Alt+Shift+K` | Select up to parent (backward) |
| Select Forward Down Sexp | `Ctrl+Alt+J` | Select down to child (forward) |
| Select Backward Down Sexp | `Ctrl+Alt+Shift+J` | Select down to child (backward) |

### Structural Manipulation

Transform code structure while maintaining balance:

| Command | Keybinding | Description |
|---------|------------|-------------|
| Slurp Forward | `Ctrl+Alt+Right` or `Ctrl+Shift+.` | Pull next sexp into current list |
| Slurp Backward | `Ctrl+Alt+Left` or `Ctrl+Shift+,` | Pull previous sexp into current list |
| Barf Forward | `Ctrl+Alt+Shift+Right` or `Ctrl+.` | Push last sexp out of current list |
| Barf Backward | `Ctrl+Alt+Shift+Left` or `Ctrl+,` | Push first sexp out of current list |
| Raise Sexp | `Alt+R` | Replace parent sexp with current sexp |
| Splice Sexp | `Alt+S` | Remove delimiters of current sexp |
| Transpose Sexp | `Alt+T` | Swap current sexp with next sexp |

### Wrapping

Wrap sexps with delimiters:

| Command | Keybinding | Description |
|---------|------------|-------------|
| Wrap with Parentheses | `Alt+Shift+9` | Wrap current sexp with `()` |
| Wrap with Brackets | `Alt+Shift+[` | Wrap current sexp with `[]` |
| Wrap with Braces | `Alt+Shift+{` | Wrap current sexp with `{}` |

### Kill and Copy

Cut and copy operations that respect structure:

| Command | Keybinding | Description |
|---------|------------|-------------|
| Kill Forward Sexp | `Ctrl+K` | Kill (cut) from cursor to end of sexp |
| Kill Backward Sexp | `Ctrl+Shift+K` | Kill (cut) from cursor to start of sexp |
| Kill Sexp | `Ctrl+Alt+K` (Mac: `Cmd+Alt+K`) | Kill (cut) entire current sexp |
| Copy Sexp | `Ctrl+Alt+C` (Mac: `Cmd+Alt+C`) | Copy entire current sexp |
| Copy Forward Sexp | `Ctrl+Shift+C` | Copy from cursor to end of sexp |
| Copy Backward Sexp | `Ctrl+Alt+Shift+C` | Copy from cursor to start of sexp |

### Customizing Keybindings

You can customize any keybinding through VS Code's standard keybinding configuration:

1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac)
2. Type "Preferences: Open Keyboard Shortcuts"
3. Search for "paredit" to find all paredit commands
4. Click on a command and press your desired key combination

Alternatively, edit your `keybindings.json` file directly:

```json
{
  "key": "your-key-combo",
  "command": "paredit.forwardSexp",
  "when": "editorTextFocus && paredit.isActive"
}
```

### Vim-Compatible Mode

The extension defaults to vim-compatible keybindings using `H`, `J`, `K`, `L` with the `Alt` modifier for navigation. This can be controlled with the `paredit.vimMode` setting (enabled by default).

The vim-style navigation keys are:
- `Alt+H` - Backward (left)
- `Alt+L` - Forward (right)
- `Alt+K` - Up
- `Alt+J` - Down

## Vim Integration

If you're using a Vim extension (like VSCodeVim), you can integrate paredit commands as Vim motions. Add these to your `settings.json`:

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["L"],
      "commands": ["paredit.forwardSexp"]
    },
    {
      "before": ["H"],
      "commands": ["paredit.backwardSexp"]
    },
    {
      "before": [")"],
      "commands": ["paredit.forwardUpSexp"]
    },
    {
      "before": ["("],
      "commands": ["paredit.backwardUpSexp"]
    },
    {
      "before": ["d", "L"],
      "commands": ["paredit.killForwardSexp"]
    },
    {
      "before": ["d", "H"],
      "commands": ["paredit.killBackwardSexp"]
    },
    {
      "before": ["c", "L"],
      "commands": [
        "paredit.killForwardSexp",
        "extension.vim_insert"
      ]
    },
    {
      "before": ["c", "H"],
      "commands": [
        "paredit.killBackwardSexp",
        "extension.vim_insert"
      ]
    },
    {
      "before": ["y", "L"],
      "commands": ["paredit.copyForwardSexp"]
    },
    {
      "before": ["y", "H"],
      "commands": ["paredit.copyBackwardSexp"]
    },
    {
      "before": ["d", ")"],
      "commands": ["paredit.killForwardUpSexp"]
    },
    {
      "before": ["d", "("],
      "commands": ["paredit.killBackwardUpSexp"]
    },
    {
      "before": ["c", ")"],
      "commands": [
        "paredit.killForwardUpSexp",
        "extension.vim_insert"
      ]
    },
    {
      "before": ["c", "("],
      "commands": [
        "paredit.killBackwardUpSexp",
        "extension.vim_insert"
      ]
    },
    {
      "before": ["y", ")"],
      "commands": ["paredit.copyForwardUpSexp"]
    },
    {
      "before": ["y", "("],
      "commands": ["paredit.copyBackwardUpSexp"]
    }
  ],
  "vim.visualModeKeyBindings": [
    {
      "before": ["L"],
      "commands": ["paredit.selectForwardSexp"]
    },
    {
      "before": ["H"],
      "commands": ["paredit.selectBackwardSexp"]
    },
    {
      "before": [")"],
      "commands": ["paredit.forwardUpSexp"]
    },
    {
      "before": ["("],
      "commands": ["paredit.backwardUpSexp"]
    },
    {
      "before": [")"],
      "commands": ["paredit.selectForwardUpSexp"]
    },
    {
      "before": ["("],
      "commands": ["paredit.selectBackwardUpSexp"]
    }
  ]
}
```

This configuration allows you to:
- Use `L` and `H` in normal mode to navigate by s-expressions
- Use `)` and `(` to jump to the closing/opening delimiter of the enclosing s-expression (cursor lands ON the delimiter)
- Use `dL` and `dH` to delete forward/backward s-expressions
- Use `d)` and `d(` to delete up to closing/opening delimiter (not including delimiter)
- Use `cL` and `cH` to change forward/backward s-expressions (delete and enter insert mode)
- Use `c)` and `c(` to change up to closing/opening delimiter (not including delimiter)
- Use `yL` and `yH` to yank (copy) forward/backward s-expressions
- Use `y)` and `y(` to yank up to closing/opening delimiter (not including delimiter)
- Use `L`, `H`, `(`, and `)` in visual mode to extend selections

**Note on Clipboard Integration:**

The delete, change, and yank commands copy text to the system clipboard (controlled by the `paredit.killAlsoCutsToClipboard` setting, which is enabled by default). To make this work seamlessly with Vim's yank/paste commands (`p`, `P`), configure VSCodeVim to use the system clipboard:

```json
{
  "vim.useSystemClipboard": true
}
```

With this setting enabled:
- Deleted text from `dL` can be pasted with `p`
- Yanked text from `yL` can be pasted with `p`
- Vim's yank operations also go to the system clipboard

Alternatively, if you prefer to keep Vim's registers separate from the system clipboard, you can disable `paredit.killAlsoCutsToClipboard`, but then deleted text won't be available for pasting.

You can customize these bindings to use different keys if `L` and `H` conflict with your workflow.

## Configuration

Configure the extension through VS Code settings (`Ctrl+,` or `Cmd+,` on Mac):

### `paredit.enabledLanguages`

**Type**: `array`  
**Default**: `["javascript", "typescript", "json", "lisp", "scheme", "racket"]`

List of language IDs where paredit commands are active. The extension automatically activates when you open files in these languages.

**Example**:
```json
{
  "paredit.enabledLanguages": [
    "javascript",
    "typescript",
    "json",
    "python",
    "clojure"
  ]
}
```

To find a language ID, open a file and run the command "Change Language Mode" (`Ctrl+K M`) to see the language identifier.

### `paredit.enabledFileExtensions`

**Type**: `array`  
**Default**: `[]`

Additional file extensions where paredit commands are active. Useful for custom file types or languages not recognized by VS Code.

**Example**:
```json
{
  "paredit.enabledFileExtensions": [".lisp", ".scm", ".rkt", ".clj"]
}
```

### `paredit.vimMode`

**Type**: `boolean`  
**Default**: `true`

Enable vim-compatible keybindings using H, J, K, L with the Alt modifier for navigation.

- `Alt+H` - Backward (left)
- `Alt+L` - Forward (right)
- `Alt+K` - Up
- `Alt+J` - Down

Set to `false` if these keybindings conflict with your workflow.

### `paredit.multicursor`

**Type**: `boolean`  
**Default**: `false`

Enable multi-cursor support for paredit commands. When enabled, structural editing commands apply to all active cursors simultaneously.

**Example use case**: Select multiple function calls and wrap them all with brackets at once.

### `paredit.customDelimiters`

**Type**: `object`  
**Default**: `{}`

Define custom delimiter pairs for specific languages. Advanced users can extend delimiter matching beyond the default `()`, `[]`, `{}`.

**Example**:
```json
{
  "paredit.customDelimiters": {
    "html": ["<", ">"],
    "xml": ["<", ">"]
  }
}
```

### `paredit.killAlsoCutsToClipboard`

**Type**: `boolean`  
**Default**: `true`

When true, kill commands (like `Ctrl+K`) also copy the deleted text to the clipboard, making them work like cut operations.

## Language Support

The extension automatically reads comment syntax from your installed language extensions, ensuring accurate structural editing for any language.

### How It Works

1. **Reads from Language Extensions**: When you open a file, the extension finds the language extension (e.g., Racket, Python, JavaScript) and reads its comment configuration
2. **Fallback**: If no language extension is found, uses Lisp/Racket style comments (semicolon) as default
3. **Result**: Language-specific syntax is correctly handled

### Examples

- **Racket**: `#t` and `#f` are boolean literals, not comments ✓
- **Python**: `#` starts a comment (when Python extension is installed) ✓
- **JavaScript**: `//` and `/* */` are comments, `#` is not ✓

### Default Behavior

Without a language extension, the extension uses Lisp/Racket comment syntax:
- Line comments: `;`
- Block comments: `#|` and `|#`

This ensures `#t`, `#f`, and other hash-prefixed identifiers work correctly in Lisp-family languages.

## Troubleshooting

### Commands Not Working

**Problem**: Paredit commands don't respond when I press the keybindings.

**Solutions**:
1. Check that your file's language is in `paredit.enabledLanguages`:
   - Open Command Palette (`Ctrl+Shift+P`)
   - Run "Preferences: Open Settings (JSON)"
   - Verify your language is listed in `paredit.enabledLanguages`
   
2. Check the status bar - you should see a paredit indicator when the extension is active

3. Verify the `paredit.isActive` context:
   - Open Command Palette
   - Run "Developer: Inspect Context Keys"
   - Look for `paredit.isActive` - it should be `true`

### Keybinding Conflicts

**Problem**: Paredit keybindings conflict with other extensions or VS Code defaults.

**Solutions**:
1. Disable vim mode if H, J, K, L keybindings conflict:
   ```json
   {
     "paredit.vimMode": false
   }
   ```

2. Customize keybindings:
   - Open Command Palette (`Ctrl+Shift+P`)
   - Run "Preferences: Open Keyboard Shortcuts"
   - Search for "paredit"
   - Click on any command and press your preferred key combination

3. Remove conflicting keybindings from other extensions in `keybindings.json`

### Unbalanced Delimiters

**Problem**: Commands don't work correctly when delimiters are unbalanced.

**Solution**: Paredit requires balanced delimiters to function correctly. Fix any syntax errors in your code:
- Look for missing closing parentheses, brackets, or braces
- Check for unmatched quotes in strings
- Use VS Code's built-in syntax highlighting to identify issues

### Extension Not Activating

**Problem**: The extension doesn't activate for my language.

**Solutions**:
1. Add your language ID to `paredit.enabledLanguages`:
   - Find your language ID by running "Change Language Mode" (`Ctrl+K M`)
   - Add it to the settings:
     ```json
     {
       "paredit.enabledLanguages": ["javascript", "typescript", "your-language-id"]
     }
     ```

2. Alternatively, add your file extension to `paredit.enabledFileExtensions`:
   ```json
   {
     "paredit.enabledFileExtensions": [".your-extension"]
   }
   ```

3. Reload VS Code window:
   - Open Command Palette
   - Run "Developer: Reload Window"

### Performance Issues

**Problem**: The extension is slow with large files.

**Solutions**:
1. The extension caches tokenization results, but very large files (10,000+ lines) may experience some delay
2. Consider splitting large files into smaller modules
3. Disable multi-cursor mode if not needed:
   ```json
   {
     "paredit.multicursor": false
   }
   ```

### Commands Behave Unexpectedly

**Problem**: Slurp, barf, or other commands don't do what I expect.

**Solutions**:
1. Ensure your cursor is positioned correctly:
   - For slurp/barf: cursor should be inside the list you want to modify
   - For raise: cursor should be on the expression you want to raise
   - For wrap: select the expression first, then wrap

2. Check that delimiters are balanced - unbalanced code can cause unexpected behavior

3. Review the command descriptions in the Keybindings section above

### Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Issues](https://github.com/your-repo/paredit/issues) for similar problems
2. Enable extension logging:
   - Open Output panel (`Ctrl+Shift+U`)
   - Select "Paredit" from the dropdown
3. Report bugs with:
   - Your VS Code version
   - Extension version
   - Language you're using
   - Minimal code example that reproduces the issue

## Development

### Setup

```bash
npm install
```

### Build

```bash
npm run compile
```

### Test

Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Generate coverage report:
```bash
npm run test:coverage
```

#### Test Structure

All tests are organized in a single `tests/` directory:
- `tests/extension.test.ts` - Extension activation tests
- `tests/lexer.test.ts` - Lexer and tokenization tests
- `tests/token-cursor.test.ts` - Token cursor navigation tests

### Run Extension

Press F5 in VS Code to open a new window with the extension loaded.

## License

MIT
