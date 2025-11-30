# Test Workspace

This directory serves as the workspace folder for VS Code integration tests.

## Purpose

When running integration tests with `@vscode/test-cli`, VS Code needs a workspace folder to open. This directory provides that workspace context.

## Contents

- `.vscode/settings.json` - Paredit configuration for tests
- Test documents are created dynamically during test execution and cleaned up afterward

## Usage

This workspace is automatically used when running:
```bash
npm run test:integration
```

Do not manually edit files in this directory - it's managed by the test suite.
