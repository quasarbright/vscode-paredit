/**
 * Extension activation tests
 */

// Mock vscode module
const mockRegisterCommand = jest.fn(() => ({ dispose: jest.fn() }));
const mockExecuteCommand = jest.fn();
const mockOnDidChangeActiveTextEditor = jest.fn(() => ({ dispose: jest.fn() }));
const mockOnDidChangeConfiguration = jest.fn(() => ({ dispose: jest.fn() }));
const mockOnDidOpenTextDocument = jest.fn(() => ({ dispose: jest.fn() }));

jest.mock('vscode', () => ({
  commands: {
    registerCommand: mockRegisterCommand,
    executeCommand: mockExecuteCommand
  },
  window: {
    activeTextEditor: undefined,
    onDidChangeActiveTextEditor: mockOnDidChangeActiveTextEditor,
    showErrorMessage: jest.fn()
  },
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn((_key: string, defaultValue?: any) => defaultValue)
    })),
    onDidChangeConfiguration: mockOnDidChangeConfiguration,
    onDidOpenTextDocument: mockOnDidOpenTextDocument
  }
}), { virtual: true });

describe('Extension', () => {
  let extension: any;
  let mockContext: any;

  beforeEach(() => {
    jest.clearAllMocks();
    extension = require('../src/extension');
    
    mockContext = {
      subscriptions: []
    };
  });

  test('should export activate function', () => {
    expect(extension.activate).toBeDefined();
    expect(typeof extension.activate).toBe('function');
  });

  test('should export deactivate function', () => {
    expect(extension.deactivate).toBeDefined();
    expect(typeof extension.deactivate).toBe('function');
  });

  test('should register all navigation commands', () => {
    extension.activate(mockContext);
    
    const calls = mockRegisterCommand.mock.calls;
    
    expect(calls.some((call: any) => call[0] === 'paredit.forwardSexp')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.backwardSexp')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.forwardUpSexp')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.backwardUpSexp')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.forwardDownSexp')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.backwardDownSexp')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.forwardSexpOrUp')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.backwardSexpOrUp')).toBe(true);
  });

  test('should register all selection commands', () => {
    extension.activate(mockContext);
    
    const calls = mockRegisterCommand.mock.calls;
    
    expect(calls.some((call: any) => call[0] === 'paredit.selectCurrentForm')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.selectForwardSexp')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.selectBackwardSexp')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.expandSelection')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.contractSelection')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.selectDefun')).toBe(true);
  });

  test('should register all manipulation commands', () => {
    extension.activate(mockContext);
    
    const calls = mockRegisterCommand.mock.calls;
    
    expect(calls.some((call: any) => call[0] === 'paredit.slurpForward')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.slurpBackward')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.barfForward')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.barfBackward')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.raiseSexp')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.spliceSexp')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.wrapWithParen')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.wrapWithBracket')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.wrapWithBrace')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.transposeSexp')).toBe(true);
  });

  test('should register all clipboard commands', () => {
    extension.activate(mockContext);
    
    const calls = mockRegisterCommand.mock.calls;
    
    expect(calls.some((call: any) => call[0] === 'paredit.killForwardSexp')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.killBackwardSexp')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.killSexp')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.copySexp')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.copyForwardSexp')).toBe(true);
    expect(calls.some((call: any) => call[0] === 'paredit.copyBackwardSexp')).toBe(true);
  });

  test('should set paredit.isActive context on activation', () => {
    extension.activate(mockContext);
    
    expect(mockExecuteCommand).toHaveBeenCalledWith('setContext', 'paredit.isActive', false);
  });

  test('should add subscriptions to context', () => {
    extension.activate(mockContext);
    
    // Should have registered commands and event listeners
    expect(mockContext.subscriptions.length).toBeGreaterThan(0);
  });

  test('should register editor change listener', () => {
    extension.activate(mockContext);
    
    expect(mockOnDidChangeActiveTextEditor).toHaveBeenCalled();
  });

  test('should register configuration change listener', () => {
    extension.activate(mockContext);
    
    expect(mockOnDidChangeConfiguration).toHaveBeenCalled();
  });

  test('should register document open listener', () => {
    extension.activate(mockContext);
    
    expect(mockOnDidOpenTextDocument).toHaveBeenCalled();
  });
});
