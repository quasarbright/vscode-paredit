# Test Workspace Configuration

This directory contains VS Code workspace settings for integration tests.

## settings.json

Configures paredit for the test environment:

- **enabledLanguages**: Languages where paredit is active during tests
  - javascript
  - typescript
  - racket
  - lisp
  - scheme

## Purpose

This configuration ensures that:
1. Paredit extension is active for test documents
2. Language-specific behavior can be tested
3. Tests have a consistent, predictable environment
4. Configuration is isolated from user's global settings

## Modifying Settings

To add new languages or change configuration for tests, edit `settings.json`.

Changes will apply to all integration tests that run in this workspace.
