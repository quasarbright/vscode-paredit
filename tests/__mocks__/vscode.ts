/**
 * Mock VS Code API for Jest tests
 */

export const extensions = {
  all: [] as any[]
};

// Mock workspace API
export const workspace = {
  workspaceFolders: undefined,
  getConfiguration: () => ({
    get: () => undefined,
    has: () => false,
    inspect: () => undefined,
    update: () => Promise.resolve()
  }),
  openTextDocument: () => Promise.reject(new Error('Not implemented in mock'))
};

// Mock window API
export const window = {
  showTextDocument: () => Promise.reject(new Error('Not implemented in mock'))
};

// Mock commands API
export const commands = {
  executeCommand: () => Promise.reject(new Error('Not implemented in mock'))
};
