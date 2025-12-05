/**
 * Configuration Manager Tests
 */

/// <reference types="jest" />

// Mock vscode module before importing config
const mockGetConfiguration = jest.fn();
const mockOnDidChangeConfiguration = jest.fn();

jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: mockGetConfiguration,
    onDidChangeConfiguration: mockOnDidChangeConfiguration
  }
}), { virtual: true });

import { getConfig, isLanguageEnabled, getDelimitersForLanguage } from '../src/config';

/**
 * Mock TextDocument for testing
 */
class MockTextDocument {
  constructor(public languageId: string, public fileName: string) {}
}

describe('Configuration Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConfig', () => {
    test('should return default configuration values', () => {
      const mockGet = jest.fn((_key: string, defaultValue: any) => defaultValue);
      mockGetConfiguration.mockReturnValue({
        get: mockGet
      });

      const config = getConfig();

      expect(config.disabledLanguages).toEqual([]);
      expect(config.disabledFileExtensions).toEqual([]);
      expect(config.customDelimiters).toEqual({});
      expect(config.killAlsoCutsToClipboard).toBe(true);
    });

    test('should return custom configuration values', () => {
      const customConfig = {
        disabledLanguages: ['markdown', 'plaintext'],
        disabledFileExtensions: ['.md', '.txt'],
        customDelimiters: { python: ['[', ']'] },
        killAlsoCutsToClipboard: false
      };

      const mockGet = jest.fn((key: string) => {
        const configMap: Record<string, any> = {
          'disabledLanguages': customConfig.disabledLanguages,
          'disabledFileExtensions': customConfig.disabledFileExtensions,
          'customDelimiters': customConfig.customDelimiters,
          'killAlsoCutsToClipboard': customConfig.killAlsoCutsToClipboard
        };
        return configMap[key];
      });

      mockGetConfiguration.mockReturnValue({
        get: mockGet
      });

      const config = getConfig();

      expect(config.disabledLanguages).toEqual(['markdown', 'plaintext']);
      expect(config.disabledFileExtensions).toEqual(['.md', '.txt']);
      expect(config.customDelimiters).toEqual({ python: ['[', ']'] });
      expect(config.killAlsoCutsToClipboard).toBe(false);
    });
  });

  describe('isLanguageEnabled', () => {
    test('should return true for any language by default', () => {
      const mockGet = jest.fn((key: string, defaultValue: any) => {
        if (key === 'disabledLanguages') {
          return [];
        }
        return defaultValue || [];
      });

      mockGetConfiguration.mockReturnValue({
        get: mockGet
      });

      const mockDocument = new MockTextDocument('javascript', 'test.js');

      expect(isLanguageEnabled(mockDocument as any)).toBe(true);
    });

    test('should return false for disabled language ID', () => {
      const mockGet = jest.fn((key: string, defaultValue: any) => {
        if (key === 'disabledLanguages') {
          return ['markdown', 'plaintext'];
        }
        return defaultValue || [];
      });

      mockGetConfiguration.mockReturnValue({
        get: mockGet
      });

      const mockDocument = new MockTextDocument('markdown', 'test.md');

      expect(isLanguageEnabled(mockDocument as any)).toBe(false);
    });

    test('should return false for disabled file extension', () => {
      const mockGet = jest.fn((key: string, defaultValue: any) => {
        if (key === 'disabledLanguages') {
          return [];
        }
        if (key === 'disabledFileExtensions') {
          return ['.md', '.txt'];
        }
        return defaultValue || [];
      });

      mockGetConfiguration.mockReturnValue({
        get: mockGet
      });

      const mockDocument = new MockTextDocument('markdown', '/path/to/file.md');

      expect(isLanguageEnabled(mockDocument as any)).toBe(false);
    });

    test('should handle file extensions without leading dot', () => {
      const mockGet = jest.fn((key: string, defaultValue: any) => {
        if (key === 'disabledLanguages') {
          return [];
        }
        if (key === 'disabledFileExtensions') {
          return ['md', 'txt'];
        }
        return defaultValue || [];
      });

      mockGetConfiguration.mockReturnValue({
        get: mockGet
      });

      const mockDocument = new MockTextDocument('markdown', '/path/to/file.md');

      expect(isLanguageEnabled(mockDocument as any)).toBe(false);
    });

    test('should return true for non-disabled language and non-disabled extension', () => {
      const mockGet = jest.fn((key: string, defaultValue: any) => {
        if (key === 'disabledLanguages') {
          return ['markdown'];
        }
        if (key === 'disabledFileExtensions') {
          return ['.txt'];
        }
        return defaultValue || [];
      });

      mockGetConfiguration.mockReturnValue({
        get: mockGet
      });

      const mockDocument = new MockTextDocument('python', '/path/to/file.py');

      expect(isLanguageEnabled(mockDocument as any)).toBe(true);
    });

    test('should prioritize disabled file extension over language', () => {
      const mockGet = jest.fn((key: string, defaultValue: any) => {
        if (key === 'disabledLanguages') {
          return [];
        }
        if (key === 'disabledFileExtensions') {
          return ['.js'];
        }
        return defaultValue || [];
      });

      mockGetConfiguration.mockReturnValue({
        get: mockGet
      });

      const mockDocument = new MockTextDocument('javascript', '/path/to/file.js');

      expect(isLanguageEnabled(mockDocument as any)).toBe(false);
    });
  });

  describe('getDelimitersForLanguage', () => {
    // Note: In a real VS Code environment, this would also check language extension
    // bracket configurations. In tests, it falls back to defaults.
    test('should return default delimiters when no custom delimiters defined', () => {
      const mockGet = jest.fn((key: string, defaultValue: any) => {
        if (key === 'customDelimiters') {
          return {};
        }
        return defaultValue;
      });

      mockGetConfiguration.mockReturnValue({
        get: mockGet
      });

      const delimiters = getDelimitersForLanguage('javascript');

      // Note: When language extension is not found, we fall back to DEFAULT_DELIMITERS
      // which doesn't include single quotes (they come from the language extension's autoClosingPairs)
      expect(delimiters).toEqual([
        { open: '(', close: ')' },
        { open: '[', close: ']' },
        { open: '{', close: '}' },
        { open: '"', close: '"' }
      ]);
    });

    test('should return custom delimiters for specific language', () => {
      const mockGet = jest.fn((key: string, defaultValue: any) => {
        if (key === 'customDelimiters') {
          return {
            html: [{ open: '<', close: '>' }],
            xml: [{ open: '<', close: '>' }]
          };
        }
        return defaultValue;
      });

      mockGetConfiguration.mockReturnValue({
        get: mockGet
      });

      const delimiters = getDelimitersForLanguage('html');

      expect(delimiters).toEqual([{ open: '<', close: '>' }]);
    });

    test('should return default delimiters for language without custom config', () => {
      const mockGet = jest.fn((key: string, defaultValue: any) => {
        if (key === 'customDelimiters') {
          return {
            html: [{ open: '<', close: '>' }]
          };
        }
        return defaultValue;
      });

      mockGetConfiguration.mockReturnValue({
        get: mockGet
      });

      const delimiters = getDelimitersForLanguage('javascript');

      // Note: When language extension is not found, we fall back to DEFAULT_DELIMITERS
      // which doesn't include single quotes (they come from the language extension's autoClosingPairs)
      expect(delimiters).toEqual([
        { open: '(', close: ')' },
        { open: '[', close: ']' },
        { open: '{', close: '}' },
        { open: '"', close: '"' }
      ]);
    });
  });
});
