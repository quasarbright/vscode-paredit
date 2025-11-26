# Implementation Plan

- [x] 1. Set up VS Code extension project structure
  - Initialize extension with `yo code` or manual setup
  - Configure TypeScript with strict mode
  - Set up package.json with extension metadata and activation events
  - Configure webpack for bundling
  - Add test framework (Jest) configuration with single tests/ directory
  - Write basic extension activation tests
  - _Requirements: All (foundation for entire extension)_

- [x] 2. Implement lexer and token system (adapted from Calva)
  - [x] 2.1 Create generic lexer interface and token types
    - Define Token interface with type, raw text, offset, and state
    - Implement basic tokenizer that recognizes delimiters, whitespace, strings, comments
    - Support configurable delimiter pairs (parentheses, brackets, braces)
    - Handle escape sequences in strings
    - Write unit tests for tokenizing various delimiter types and string literals
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [x] 2.2 Implement TokenCursor for navigation
    - Create TokenCursor class with line and token position tracking
    - Implement next(), previous(), atStart(), atEnd() methods
    - Add offsetStart and offsetEnd getters for position calculation
    - Implement clone() and equals() methods
    - Write unit tests for cursor movement and position tracking
    - _Requirements: 1.1, 1.2, 7.1, 7.2_
  
  - [x] 2.3 Extend to LispTokenCursor with sexp-aware navigation
    - Implement forwardSexp(), backwardSexp() methods
    - Implement forwardList(), backwardList() for moving to list boundaries
    - Implement upList(), downList() for hierarchical navigation
    - Add forwardWhitespace(), backwardWhitespace() helpers
    - Implement rangeForCurrentForm() and rangeForDefun()
    - Write unit tests for sexp navigation with nested structures
    - _Requirements: 1.1, 1.2, 7.1, 7.2, 7.3, 7.4_

- [x] 3. Create document model and editable document wrapper
  - [x] 3.1 Implement LineInputModel for document representation
    - Create line-based document model that stores tokenized lines
    - Implement getOffsetForLine() and line access methods
    - Cache tokenization results per document version
    - Write unit tests for line-to-offset conversion and caching
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 3.2 Implement EditableDocument wrapper
    - Wrap VS Code TextEditor with EditableDocument interface
    - Implement selections property that maps to editor selections
    - Add getTokenCursor(offset) method to create cursors at positions
    - Implement model.edit() method for applying text changes
    - Support multi-cursor operations
    - Write unit tests with mock VS Code editor
    - _Requirements: 2.4, 3.4, 10.2_

- [x] 4. Implement core paredit operations (paredit.ts)
  - [x] 4.1 Implement range-finding functions
    - Implement forwardSexpRange(), backwardSexpRange()
    - Implement forwardSexpOrUpRange(), backwardSexpOrUpRange()
    - Implement rangeToForwardUpList(), rangeToBackwardUpList()
    - Implement rangeToForwardDownList(), rangeToBackwardDownList()
    - Handle edge cases (document boundaries, no valid sexp)
    - Write unit tests for range calculation with various cursor positions
    - _Requirements: 1.1, 1.2, 1.5, 7.1, 7.2, 7.3, 7.4_
  
  - [x] 4.2 Implement selection operations
    - Implement selectCurrentForm() for selecting current sexp
    - Implement selectForwardSexp(), selectBackwardSexp()
    - Implement selectForwardUpSexp(), selectBackwardUpSexp()
    - Implement selectForwardDownSexp(), selectBackwardDownSexp()
    - Implement sexpRangeExpansion() and sexpRangeContraction()
    - Support multi-cursor selections
    - Write unit tests for selection with single and multiple cursors
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [x] 4.3 Implement slurp and barf operations
    - Implement slurpSexp() for forward and backward directions
    - Implement barfSexp() for forward and backward directions
    - Maintain balanced delimiters during operations
    - Handle whitespace correctly
    - Write unit tests for slurp/barf with various structures
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 4.4 Implement raise, splice, and wrap operations
    - Implement raiseSexp() to replace parent with current sexp
    - Implement spliceSexp() to remove delimiters
    - Implement wrapSexp() with configurable delimiter types
    - Support wrapping with (), [], and {}
    - Write unit tests for structural transformations
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 4.5 Implement kill and copy operations
    - Implement killRange() for cutting sexps
    - Implement copyRangeToClipboard() for copying
    - Ensure balanced delimiters after kill operations
    - Integrate with VS Code clipboard API
    - Write unit tests for clipboard operations
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 4.6 Implement transpose operation
    - Implement transposeSexp() to swap adjacent sexps
    - Maintain whitespace and formatting
    - Handle edge cases (last sexp, single sexp)
    - Write unit tests for transposing sexps
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 5. Implement command handlers (commands.ts)
  - [x] 5.1 Create navigation command handlers
    - Implement forwardSexp(), backwardSexp() handlers
    - Implement forwardUpSexp(), backwardUpSexp() handlers
    - Implement forwardDownSexp(), backwardDownSexp() handlers
    - Implement forwardSexpOrUp(), backwardSexpOrUp() handlers
    - Support multicursor configuration option
    - Write unit tests for navigation commands with mock document
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [x] 5.2 Create selection command handlers
    - Implement selectCurrentForm() handler
    - Implement selectForwardSexp(), selectBackwardSexp() handlers
    - Implement expand/contract selection handlers
    - Implement rangeForDefun() handler
    - Write unit tests for selection commands with mock document
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 5.3 Create manipulation command handlers
    - Implement slurpForward(), slurpBackward() handlers
    - Implement barfForward(), barfBackward() handlers
    - Implement raiseSexp(), spliceSexp() handlers
    - Implement wrapWithParen(), wrapWithBracket(), wrapWithBrace() handlers
    - Implement transposeSexp() handler
    - Write unit tests for manipulation commands with mock document
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [x] 5.4 Create clipboard command handlers
    - Implement killSexp() handler with clipboard integration
    - Implement copySexp() handler
    - Support killAlsoCutsToClipboard configuration option
    - Write unit tests for clipboard operations with mock clipboard
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6. Implement configuration management
  - [x] 6.1 Define configuration schema in package.json
    - Add paredit.enabledLanguages setting with default languages
    - Add paredit.enabledFileExtensions setting
    - Add paredit.customDelimiters setting for language-specific delimiters
    - Add paredit.vimMode boolean setting
    - Add paredit.multicursor boolean setting
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 10.3_
  
  - [x] 6.2 Implement configuration manager
    - Create function to read configuration values
    - Implement isLanguageEnabled() to check if paredit is active for current file
    - Implement getDelimitersForLanguage() to get delimiter configuration
    - Listen for configuration changes and update extension state
    - Write unit tests for configuration reading and language activation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 9.4_

- [x] 7. Implement extension entry point (extension.ts)
  - [x] 7.1 Set up extension activation
    - Register all paredit commands with VS Code
    - Create command wrappers that check language activation
    - Wrap active editor in EditableDocument before passing to handlers
    - Handle cases where no editor is active
    - Write unit tests for command registration and wrapping
    - _Requirements: 1.3, 2.3, 10.1, 10.2_
  
  - [x] 7.2 Implement language activation context
    - Set paredit.isActive context based on current file
    - Update context on editor change and configuration change
    - Use context in keybinding when clauses
    - Write unit tests for context updates
    - _Requirements: 1.3, 2.3, 2.4_
  
  - [x] 7.3 Wire up all commands
    - Register all navigation commands
    - Register all selection commands
    - Register all manipulation commands
    - Register all clipboard commands
    - Ensure commands appear in command palette
    - Write integration tests verifying all commands are registered
    - _Requirements: 10.1, 10.2_

- [x] 8. Configure keybindings
  - [x] 8.1 Define default keybindings in package.json
    - Add vim-compatible keybindings (H, L, K, J, W, etc.)
    - Use when clause to check paredit.isActive context
    - Add keybindings for slurp/barf (>, <, Ctrl+>, Ctrl+<)
    - Add keybindings for wrap operations
    - Add keybindings for kill/copy operations
    - _Requirements: 1.4, 7.5, 10.3, 10.4, 10.5_
  
  - [x] 8.2 Document keybindings in README
    - Create table of all default keybindings
    - Explain how to customize keybindings
    - Document vim-compatible mode
    - _Requirements: 10.4_

- [x] 9. Create extension documentation
  - [x] 9.1 Write comprehensive README
    - Add extension overview and features
    - Document configuration options
    - Provide usage examples
    - Include animated GIFs demonstrating key features
    - Add troubleshooting section
    - _Requirements: 10.4_
  
  - [x] 9.3 Create LICENSE file
    - Choose appropriate open-source license (MIT recommended)

- [ ] 10. Package and publish extension
  - [ ] 10.1 Configure extension packaging
    - Set up .vscodeignore to exclude unnecessary files
    - Configure webpack for production build
    - Add extension icon and banner
    - Verify package.json metadata is complete
  
  - [ ] 10.2 Test extension package
    - Build .vsix package locally
    - Install and test in clean VS Code instance
    - Verify all commands work as expected
    - Test with multiple languages
  
  - [ ] 10.3 Publish to VS Code Marketplace
    - Create publisher account if needed
    - Run vsce publish
    - Verify extension appears in marketplace
    - Test installation from marketplace
