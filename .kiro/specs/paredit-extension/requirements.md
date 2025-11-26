# Requirements Document

## Introduction

This document specifies the requirements for a VS Code extension that provides s-expression and paredit-like editing utilities for structural code editing. The extension will extract the core structural editing capabilities from Calva (without Clojure-specific features) and make them configurable for use with any programming language. The extension will support vim-compatible keybindings for efficient navigation and manipulation of nested code structures.

## Glossary

- **Extension**: The VS Code extension being developed
- **S-expression**: Symbolic expression; a notation for nested list structures commonly used in Lisp-family languages
- **Paredit**: A structured editing mode that maintains balanced parentheses and provides commands for manipulating s-expressions
- **Sexp**: Short for s-expression; a balanced, delimited code structure (parentheses, brackets, braces, etc.)
- **User**: A developer using the Extension in VS Code
- **Active Language**: A programming language or file extension for which the Extension's keybindings are currently enabled
- **Keybinding**: A keyboard shortcut that triggers an Extension command
- **Configuration**: User-defined settings stored in VS Code settings that control Extension behavior

## Requirements

### Requirement 1

**User Story:** As a User, I want to navigate forward and backward through sexps using vim-style keybindings, so that I can quickly move through nested code structures without using a mouse.

#### Acceptance Criteria

1. WHEN the User presses the configured forward-sexp keybinding in an Active Language file, THE Extension SHALL move the cursor to the start of the next sexp at the current nesting level
2. WHEN the User presses the configured backward-sexp keybinding in an Active Language file, THE Extension SHALL move the cursor to the start of the previous sexp at the current nesting level
3. WHEN the User is in a file that is not an Active Language, THE Extension SHALL NOT intercept or handle the navigation keybindings
4. THE Extension SHALL provide default keybindings that include "L" for forward-sexp and "H" for backward-sexp in vim-compatible mode
5. WHEN the cursor is at the last sexp in a structure and the User presses forward-sexp, THE Extension SHALL keep the cursor position unchanged

### Requirement 2

**User Story:** As a User, I want to configure which file types and languages have paredit keybindings enabled, so that I can use the extension only for languages where structural editing makes sense.

#### Acceptance Criteria

1. THE Extension SHALL provide a configuration setting that accepts a list of language identifiers
2. THE Extension SHALL provide a configuration setting that accepts a list of file extensions
3. WHEN a User opens a file, THE Extension SHALL activate keybindings if the file's language identifier matches any configured language identifier OR the file's extension matches any configured file extension
4. WHEN a User modifies the configuration settings, THE Extension SHALL update the active keybindings without requiring a VS Code restart
5. THE Extension SHALL provide default configuration values that include common languages with nested structures

### Requirement 3

**User Story:** As a User, I want to select entire sexps and expand my selection outward, so that I can quickly select code blocks for copying, deleting, or wrapping.

#### Acceptance Criteria

1. WHEN the User invokes the select-sexp command, THE Extension SHALL select the entire sexp that contains or follows the cursor
2. WHEN the User invokes the expand-selection command while a sexp is selected, THE Extension SHALL expand the selection to include the parent sexp
3. WHEN the User invokes the expand-selection command at the outermost sexp level, THE Extension SHALL keep the current selection unchanged
4. THE Extension SHALL provide visual feedback showing the selected region using VS Code's standard selection highlighting
5. WHEN a sexp is selected and the User types a deletion key, THE Extension SHALL delete the selected sexp and maintain balanced delimiters

### Requirement 4

**User Story:** As a User, I want to slurp and barf sexps to adjust the boundaries of nested structures, so that I can refactor code by moving expressions in and out of containing forms.

#### Acceptance Criteria

1. WHEN the User invokes the slurp-forward command, THE Extension SHALL move the next sexp outside the current closing delimiter to inside the current sexp
2. WHEN the User invokes the barf-forward command, THE Extension SHALL move the last sexp inside the current closing delimiter to outside the current sexp
3. WHEN the User invokes the slurp-backward command, THE Extension SHALL move the previous sexp outside the current opening delimiter to inside the current sexp
4. WHEN the User invokes the barf-backward command, THE Extension SHALL move the first sexp inside the current opening delimiter to outside the current sexp
5. THE Extension SHALL maintain balanced delimiters and proper whitespace after each slurp or barf operation

### Requirement 5

**User Story:** As a User, I want to raise, splice, and wrap sexps, so that I can restructure nested code by promoting inner expressions or adding new nesting levels.

#### Acceptance Criteria

1. WHEN the User invokes the raise-sexp command, THE Extension SHALL replace the parent sexp with the current sexp
2. WHEN the User invokes the splice-sexp command, THE Extension SHALL remove the delimiters of the current sexp while preserving its contents
3. WHEN the User invokes a wrap command with a delimiter type, THE Extension SHALL surround the current sexp with the specified delimiter pair
4. THE Extension SHALL support wrapping with parentheses, square brackets, and curly braces
5. THE Extension SHALL maintain proper indentation after raise, splice, and wrap operations

### Requirement 6

**User Story:** As a User, I want to kill (cut) and copy sexps while maintaining balanced delimiters, so that I can move code around without breaking the structure.

#### Acceptance Criteria

1. WHEN the User invokes the kill-sexp command, THE Extension SHALL delete the current sexp and copy it to the clipboard
2. WHEN the User invokes the copy-sexp command, THE Extension SHALL copy the current sexp to the clipboard without deleting it
3. THE Extension SHALL ensure that delimiter pairs remain balanced after a kill operation
4. WHEN the User kills a sexp that would leave unbalanced delimiters, THE Extension SHALL adjust the deletion to maintain balance
5. THE Extension SHALL integrate with VS Code's standard clipboard for copy and paste operations

### Requirement 7

**User Story:** As a User, I want to navigate up and down the sexp hierarchy, so that I can move between different nesting levels in my code.

#### Acceptance Criteria

1. WHEN the User invokes the up-sexp command, THE Extension SHALL move the cursor to the opening delimiter of the parent sexp
2. WHEN the User invokes the down-sexp command, THE Extension SHALL move the cursor to the opening delimiter of the first child sexp
3. WHEN the User is at the outermost level and invokes up-sexp, THE Extension SHALL keep the cursor position unchanged
4. WHEN the cursor is on a sexp with no children and the User invokes down-sexp, THE Extension SHALL keep the cursor position unchanged
5. THE Extension SHALL provide keybindings for up-sexp and down-sexp that are compatible with vim navigation patterns

### Requirement 8

**User Story:** As a User, I want to transpose sexps to swap their positions, so that I can reorder function arguments or list elements without manual cut-and-paste.

#### Acceptance Criteria

1. WHEN the User invokes the transpose-sexp command, THE Extension SHALL swap the current sexp with the next sexp at the same nesting level
2. THE Extension SHALL maintain proper whitespace and formatting after transposing sexps
3. WHEN the cursor is on the last sexp at a nesting level and the User invokes transpose, THE Extension SHALL keep the sexps unchanged
4. THE Extension SHALL preserve comments and whitespace that are not part of the transposed sexps
5. THE Extension SHALL update the cursor position to follow the transposed sexp

### Requirement 9

**User Story:** As a User, I want the extension to recognize multiple types of delimiter pairs, so that I can use structural editing with different bracket styles in various languages.

#### Acceptance Criteria

1. THE Extension SHALL recognize parentheses as delimiter pairs
2. THE Extension SHALL recognize square brackets as delimiter pairs
3. THE Extension SHALL recognize curly braces as delimiter pairs
4. THE Extension SHALL provide a configuration setting to define custom delimiter pairs for specific languages
5. WHEN parsing code structure, THE Extension SHALL correctly match opening and closing delimiters while respecting string literals and comments

### Requirement 10

**User Story:** As a User, I want to customize all keybindings for paredit commands, so that I can integrate the extension with my existing keyboard shortcuts and workflows.

#### Acceptance Criteria

1. THE Extension SHALL register all commands with VS Code's command palette
2. THE Extension SHALL allow Users to rebind any command through VS Code's standard keybinding configuration
3. THE Extension SHALL provide a default keybinding scheme that includes vim-compatible bindings
4. THE Extension SHALL document all available commands and their default keybindings in the extension README
5. WHEN keybinding conflicts occur, THE Extension SHALL respect VS Code's keybinding priority system
