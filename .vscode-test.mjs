/**
 * VS Code Test Configuration
 * 
 * This configuration file is used by @vscode/test-cli to set up the test environment.
 * It specifies how VS Code should be launched for integration tests.
 * 
 * Documentation: https://github.com/microsoft/vscode-test
 */

import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/suite/**/*.test.js',
  version: 'stable',
  workspaceFolder: './test-workspace',
  mocha: {
    ui: 'bdd',
    color: true,
    timeout: 10000
  },
  launchArgs: [
    '--disable-extensions',  // Disable other extensions to isolate tests
    '--disable-gpu',         // Disable GPU for better CI compatibility
    '--disable-workspace-trust' // Disable workspace trust prompt
  ]
});
