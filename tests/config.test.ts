/**
 * Configuration Manager Tests
 */

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

      expect(config.enabledLanguages).toEqual([
        'javascript',
        'typescript',
        'json',
        'lisp',
        'scheme',
        'racket'
      ]);
      expect(config.enabledFileExtensions).toEqual([]);
      expect(config.customDelimiters).toEqual({});
      expect(config.vimMode).toBe(true);
      expect(config.multicursor).toBe(false);
      expect(config.killAlsoCutsToClipboard).toBe(true);
    });

    test('should return custom configuration values', () => {
      const customConfig = {
        enabledLanguages: ['python', 'ruby'],
        enabledFileExtensions: ['.py', '.rb'],
        customDelimiters: { python: ['[', ']'] },
        vimMode: false,
        multicursor: true,
        killAlsoCutsToClipboard: false
      };

      const mockGet = jest.fn((key: string) => {
        const configMap: Record<string, any> = {
          'enabledLanguages': customConfig.enabledLanguages,
          'enabledFileExtensions': customConfig.enabledFileExtensions,
          'customDelimiters': customConfig.customDelimiters,
          'vimMode': customConfig.vimMode,
          'multicursor': customConfig.multicursor,
          'killAlsoCutsToClipboard': customConfig.killAlsoCutsToClipboard
        };
        return configMap[key];
      });

      mockGetConfiguration.mockReturnValue({
        get: mockGet
      });

      const config = getConfig();

      expect(config.enabledLanguages).toEqual(['python', 'ruby']);
      expect(config.enabledFileExtensions).toEqual(['.py', '.rb']);
      expect(config.customDelimiters).toEqual({ python: ['[', ']'] });
      expect(config.vimMode).toBe(false);
      expect(config.multicursor).toBe(true);
      expect(config.killAlsoCutsToClipboard).toBe(false);
    });
  });

  describe('isLanguageEnabled', () => {
    test('should return true for enabled language ID', () => {
      const mockGet = jest.fn((key: string, defaultValue: any) => {
        if (key === 'enabledLanguages') {
          return ['javascript', 'typescript'];
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
        if (key === 'enabledLanguages') {
          return ['javascript', 'typescript'];
        }
        return defaultValue || [];
      });

      mockGetConfiguration.mockReturnValue({
        get: mockGet
      });

      const mockDocument = new MockTextDocument('python', 'test.py');

      expect(isLanguageEnabled(mockDocument as any)).toBe(false);
    });

    test('should return true for enabled file extension', () => {
      const mockGet = jest.fn((key: string, defaultValue: any) => {
        if (key === 'enabledLanguages') {
          return [];
        }
        if (key === 'enabledFileExtensions') {
          return ['.lisp', '.scm'];
        }
        return defaultValue || [];
      });

      mockGetConfiguration.mockReturnValue({
        get: mockGet
      });

      const mockDocument = new MockTextDocument('plaintext', '/path/to/file.lisp');

      expect(isLanguageEnabled(mockDocument as any)).toBe(true);
    });

    test('should handle file extensions without leading dot', () => {
      const mockGet = jest.fn((key: string, defaultValue: any) => {
        if (key === 'enabledLanguages') {
          return [];
        }
        if (key === 'enabledFileExtensions') {
          return ['lisp', 'scm'];
        }
        return defaultValue || [];
      });

      mockGetConfiguration.mockReturnValue({
        get: mockGet
      });

      const mockDocument = new MockTextDocument('plaintext', '/path/to/file.lisp');

      expect(isLanguageEnabled(mockDocument as any)).toBe(true);
    });

    test('should return false when neither language nor extension matches', () => {
      const mockGet = jest.fn((key: string, defaultValue: any) => {
        if (key === 'enabledLanguages') {
          return ['javascript'];
        }
        if (key === 'enabledFileExtensions') {
          return ['.lisp'];
        }
        return defaultValue || [];
      });

      mockGetConfiguration.mockReturnValue({
        get: mockGet
      });

      const mockDocument = new MockTextDocument('python', '/path/to/file.py');

      expect(isLanguageEnabled(mockDocument as any)).toBe(false);
    });
  });

  describe('getDelimitersForLanguage', () => {
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

      expect(delimiters).toEqual([
        { open: '(', close: ')' },
        { open: '[', close: ']' },
        { open: '{', close: '}' },
        { open: '"', close: '"' }
      ]);
    });
  });
});
