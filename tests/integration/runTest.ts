/**
 * Test launcher for VS Code integration tests
 * 
 * This file downloads VS Code (if needed) and launches the integration test suite.
 * It uses @vscode/test-electron to run tests in a real VS Code environment.
 * 
 * Based on: https://code.visualstudio.com/api/working-with-extensions/testing-extension
 */

import * as path from 'path';
import { runTests, downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath } from '@vscode/test-electron';
import { execSync } from 'child_process';

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../../../');

    // The path to the extension test runner script
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    // The workspace folder to open in VS Code
    const testWorkspace = path.resolve(__dirname, '../../../test-workspace');

    // Download VS Code if needed
    const vscodeExecutablePath = await downloadAndUnzipVSCode();
    const [cliPath, ...args] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);

    // Install Magic Racket extension for tests
    console.log('Installing Magic Racket extension for tests...');
    try {
      execSync(`"${cliPath}" ${args.join(' ')} --install-extension evzen-wybitul.magic-racket`, {
        encoding: 'utf-8',
        stdio: 'inherit'
      });
    } catch (err) {
      console.warn('Warning: Failed to install Magic Racket extension:', err);
    }

    // Download VS Code, unzip it and run the integration test
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        testWorkspace,             // Open the test workspace
        '--disable-gpu',           // Disable GPU for better CI compatibility
        '--disable-workspace-trust', // Disable workspace trust prompt
        '--skip-welcome',          // Skip welcome page
        '--skip-release-notes',    // Skip release notes
        '--no-sandbox'             // Run without sandbox (helps with headless)
      ],
    });
  } catch (err) {
    console.error('Failed to run tests:', err);
    process.exit(1);
  }
}

main();
