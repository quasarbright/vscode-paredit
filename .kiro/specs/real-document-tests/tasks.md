# Real Document Integration Tests - Tasks

## Status: DRAFT

## Phase 1: Foundation (Estimated: 4-6 hours)

### Task 1.1: Extract Cursor Notation Utilities
- [x] Move `parseCursorString()` and `formatCursorString()` to shared location
- [x] Make them available to both Jest and Mocha tests
- [x] Verify existing tests still pass

**Acceptance Criteria:**
- Cursor notation functions are reusable
- Both test systems can use them
- All existing tests pass
- No duplication

### Task 1.2: Set Up VS Code Test Environment
- [x] Install `@vscode/test-electron` and `@vscode/test-cli`
- [x] Create `src/test/suite/index.ts` (Mocha test runner)
- [x] Create `src/test/runTest.ts` (test launcher)
- [x] Add `.vscode-test` to `.gitignore`
- [x] Add `test:integration` script to package.json
- [x] Configure VS Code test workspace

**Acceptance Criteria:**
- Can run `npm run test:integration` to launch VS Code tests
- Mocha test runner configured
- VS Code downloads and runs tests in headless mode
- Documentation on how to run tests locally

**Reference:** https://code.visualstudio.com/api/working-with-extensions/testing-extension

### Task 1.3: Add Fallback for Missing Language Extensions
- [x] Update `language-config.ts` to handle missing extensions gracefully
- [x] Return default delimiters `() [] {} ""` when extension not found
- [x] Add logging/warning when falling back to defaults
- [x] Test fallback behavior

**Acceptance Criteria:**
- Tests work even if Racket extension not installed
- Falls back to default delimiters gracefully
- Warning logged when extension not found
- No test failures due to missing extensions

### Task 1.4: Create Test Helper Functions
- [x] Create `tests/integration/suite/test-helpers.ts`
- [x] Implement `createDocumentWithCursor()` - parses cursor notation, creates VS Code doc
- [x] Implement `getDocumentWithCursor()` - formats document with cursor notation
- [x] Implement `closeDocument()` - cleanup helper
- [x] Reuse existing `parseCursorString()` and `formatCursorString()` from test-utils

**Acceptance Criteria:**
- Helper functions create real VS Code documents
- Cursor notation works (parse and format)
- Returns `EditableDocument` (our existing class)
- Proper cleanup helper
- No wrapper class needed

## Phase 2: Convert All Cursor Notation Tests (Estimated: 4-6 hours)

### Task 2.1: Convert Cursor Notation Tests to Mocha
- [x] Create `src/test/suite/paredit-integration.test.ts`
- [x] Copy all tests from `tests/paredit-cursor-notation.test.ts`
- [x] Convert Jest syntax to Mocha (`describe` → `suite`, `it` → `test`)
- [x] Use helper functions (`createDocumentWithCursor`, `getDocumentWithCursor`) with `EditableDocument`
- [x] Add proper setup/teardown (close documents after each test)
- [x] Ensure all 110+ tests are converted

**Acceptance Criteria:**
- All cursor notation tests converted to Mocha
- Tests use helper functions with real VS Code documents and `EditableDocument`
- Tests use cursor notation (same format)
- Tests pass with real VS Code documents
- Proper cleanup after each test (documents closed)
- Tests run with `npm run test:integration`

### Task 2.2: Test Language-Specific Behavior
- [ ] Add tests for JavaScript single-quote strings
- [ ] Add tests for Racket single-quote (NOT a delimiter)
- [ ] Add tests for JavaScript comment detection (//)
- [ ] Add tests for Racket comment detection (;)
- [ ] Verify delimiter configuration from real extensions

**Acceptance Criteria:**
- JavaScript tests verify `'` works as string delimiter
- Racket tests verify `'` does NOT work as delimiter
- Comment detection works for both languages
- Tests demonstrate real language extension integration

### Task 2.3: Remove TestDocument (Optional)
- [x] Decide if TestDocument should be removed or kept
- [ ] If keeping: document when to use TestDocument vs integration tests
- [x] If removing: delete TestDocument class and old tests
- [-] Update documentation

**Acceptance Criteria:**
- Clear decision made
- Documentation updated
- No confusion about which test approach to use

## Phase 3: Language Configuration Testing (Estimated: 2-3 hours)

### Task 3.1: Test JavaScript Configuration
- [ ] Verify JavaScript gets correct delimiters from extension
- [ ] Test single-quote string handling
- [ ] Test comment detection (//)
- [ ] Test block comments (/* */)

**Acceptance Criteria:**
- JavaScript delimiter configuration verified
- Single quotes work as string delimiters
- Comment detection works correctly

### Task 3.2: Test Racket Configuration
- [ ] Verify Racket gets correct delimiters from extension
- [ ] Test that single-quote is NOT a delimiter
- [ ] Test comment detection (;)
- [ ] Test block comments (#| |#)

**Acceptance Criteria:**
- Racket delimiter configuration verified
- Single quotes do NOT work as delimiters
- Comment detection works correctly

### Task 3.3: Test Language-Config Module
- [ ] Test that language-config.ts reads mock extensions
- [ ] Test getBracketPairs() with different languages
- [ ] Test getCommentConfig() with different languages
- [ ] Test caching behavior

**Acceptance Criteria:**
- language-config.ts works with mock extensions
- Correct configuration returned for each language
- Caching works properly

## Phase 4: CI Integration (Estimated: 2-3 hours)

### Task 4.1: Configure CI for Integration Tests
- [ ] Update CI configuration to run integration tests
- [ ] Install Xvfb for headless testing on Linux
- [ ] Set up display for VS Code in CI
- [ ] Configure test reporting
- [ ] Set appropriate timeouts
- [ ] Add separate CI job for integration tests

**Acceptance Criteria:**
- Integration tests run in CI (GitHub Actions)
- Xvfb configured for headless mode
- Test results reported properly
- CI doesn't take too long (< 5 min total)

**Example CI Configuration:**
```yaml
- name: Run Integration Tests
  run: xvfb-run -a npm run test:integration
  if: runner.os == 'Linux'
```

### Task 4.2: Documentation
- [x] Document how to run integration tests locally
- [x] Document how to add new integration tests
- [x] Document mock language extension system
- [x] Update README with testing information

**Acceptance Criteria:**
- Clear documentation for developers
- Examples of adding new tests
- Troubleshooting guide

### Task 4.3: Performance Optimization
- [ ] Measure integration test performance
- [ ] Optimize slow tests
- [ ] Consider parallel execution
- [ ] Set up test result caching if needed

**Acceptance Criteria:**
- Integration tests complete in reasonable time
- No significant CI slowdown
- Performance metrics documented

## Future Enhancements (Not in Initial Scope)

- [ ] Add more language configurations (Python, Clojure, etc.)
- [ ] Add visual regression tests
- [ ] Performance benchmarking suite
- [ ] Test in browser environment (VS Code for Web)

## Dependencies

**New npm packages needed:**
- `@vscode/test-electron` - Downloads and runs VS Code for testing
- `@vscode/test-cli` - CLI for running tests
- `mocha` - Test framework (required by VS Code testing)
- `@types/mocha` - TypeScript types for Mocha
- `glob` - For finding test files

**System dependencies (CI):**
- Xvfb - For headless testing on Linux
- Display server for VS Code

**Knowledge:**
- VS Code extension testing guide: https://code.visualstudio.com/api/working-with-extensions/testing-extension
- Understanding of VS Code language extension system

## Risks

1. **VS Code Test Environment Complexity**: Setting up proper test environment might be harder than expected
2. **Mock Extension Limitations**: Mock extensions might not perfectly match real behavior
3. **Test Performance**: Integration tests might be too slow for CI
4. **Maintenance Burden**: Two test systems to maintain

## Mitigation Strategies

1. Start with simple mock system, iterate as needed
2. Keep integration tests focused on critical scenarios
3. Use parallel execution and caching
4. Share test cases between TestDocument and RealDocument
5. Document differences clearly

## Success Metrics

- [ ] All 110+ cursor notation tests converted to use helper functions with `EditableDocument`
- [ ] All tests passing with real VS Code documents
- [ ] Language configuration verified for JavaScript/TypeScript and Racket
- [ ] Fallback to default delimiters when extension not installed
- [ ] Integration tests running in CI on every commit
- [ ] Other unit tests (lexer, config, etc.) still run with Jest
- [ ] Documentation complete
