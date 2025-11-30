/**
 * Mocha test runner for VS Code integration tests
 * 
 * This file sets up the Mocha test environment for running integration tests
 * within VS Code. It discovers and runs all test files in the suite directory.
 * 
 * Based on: https://code.visualstudio.com/api/working-with-extensions/testing-extension
 */

import * as path from 'path';
import Mocha = require('mocha');
import { glob } from 'glob';

export async function run(): Promise<void> {
  // Create the mocha test runner
  const mocha = new Mocha({
    ui: 'tdd', // Use TDD interface (suite/test instead of describe/it)
    color: true,
    timeout: 10000 // Integration tests need more time than unit tests
  });

  const testsRoot = path.resolve(__dirname, '..');

  // Find all test files in the suite directory
  const files = await glob('suite/**/*.test.js', { cwd: testsRoot });
  
  // Add files to the test suite
  files.forEach((f: string) => mocha.addFile(path.resolve(testsRoot, f)));

  // Run the mocha test
  return new Promise<void>((resolve, reject) => {
    try {
      mocha.run((failures: number) => {
        if (failures > 0) {
          reject(new Error(`${failures} tests failed.`));
        } else {
          resolve();
        }
      });
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
}
