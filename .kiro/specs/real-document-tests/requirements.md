# Real Document Integration Tests - Requirements

## Problem Statement

Currently, our most important tests (paredit-cursor-notation) use `TestDocument`, which mocks too much of the VS Code integration. This creates gaps in test coverage:

- We don't test that JavaScript actually gets `'` as a delimiter from its language extension
- We don't test that Racket actually doesn't get `'` as a delimiter  
- We don't test real comment detection from language extensions
- `getTestDelimiters()` is just our assumption of what languages provide
- We're not testing the full pipeline: VS Code document → VSCodeScanner → language-config → paredit operations

## Goals

1. **Maintain cursor notation syntax** - Keep the ergonomic test format we have
2. **Test real integration** - Use actual VS Code documents and editors
3. **Verify language configuration** - Test that language extensions provide correct delimiters/comments
4. **Convert all cursor notation tests** - Move all 110+ tests to use real documents
5. **Graceful fallback** - Use default delimiters when language extension not installed

## Success Criteria

- [ ] Can write tests using cursor notation with real VS Code documents
- [ ] Tests verify actual language extension configuration (delimiters, comments)
- [ ] Tests run in VS Code test environment
- [ ] All 110+ paredit-cursor-notation tests converted to use RealDocument
- [ ] Tests work with JavaScript/TypeScript (single quotes as delimiters)
- [ ] Tests work with Racket (single quotes NOT delimiters)
- [ ] Graceful fallback when language extension not installed
- [ ] CI runs all integration tests on every commit
- [ ] Other unit tests (lexer, config, etc.) remain as Jest tests

## Non-Goals

- Replace other unit tests (lexer, config, token-cursor, etc.) - those stay as Jest tests
- Mock language extensions - use real ones
- Support every language - focus on JS/TS and Racket
- Change the cursor notation format

## User Stories

### As a developer
- I want to know that JavaScript's language extension actually provides `'` as a delimiter
- I want to verify that Racket's language extension doesn't provide `'` as a delimiter
- I want to test that comment detection works with real language configurations
- I want confidence that the full integration pipeline works correctly

### As a maintainer
- I want to catch bugs that only appear with real VS Code documents
- I want to verify that language-config.ts correctly reads extension configurations
- I want to ensure VSCodeScanner properly integrates with language extensions
- I want to identify gaps in TestDocument mocking

## Constraints

- Must work in VS Code test environment
- Must support mocking language extensions (for testing without installing real extensions)
- Must be fast enough for CI (integration tests can be slower than unit tests)
- Must not break existing tests
- Must support multiple languages (JavaScript, TypeScript, Racket, Lisp, etc.)

## Decisions Made

1. **Use real language extensions** - No mocking needed, test with actual JS/TS and Racket extensions
2. **Test languages**: JavaScript/TypeScript and Racket cover most interesting behavior differences
3. **All cursor notation tests use real documents** - Convert all 110+ tests in paredit-cursor-notation.test.ts
4. **Fallback behavior**: If language extension not installed, use default delimiters: `() [] {} ""`
5. **Run on every commit** - Integration tests are the primary test suite now
