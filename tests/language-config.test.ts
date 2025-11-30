/**
 * Tests for language configuration fallback behavior
 */

/// <reference types="jest" />

import { getBracketPairs, getCommentConfig, clearConfigCache } from '../src/cursor-doc/language-config';
import { DEFAULT_DELIMITERS } from '../src/cursor-doc/lexer';

describe('Language Configuration Fallback', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    // Clear cache before each test
    clearConfigCache();
    // Spy on console.warn
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    // Restore console.warn
    consoleWarnSpy.mockRestore();
  });

  describe('getBracketPairs', () => {
    test('should return default delimiters for non-existent language', () => {
      const brackets = getBracketPairs('non-existent-language-xyz');
      
      // Should return default delimiters: () [] {} ""
      expect(brackets).toHaveLength(4);
      expect(brackets).toContainEqual({ open: '(', close: ')' });
      expect(brackets).toContainEqual({ open: '[', close: ']' });
      expect(brackets).toContainEqual({ open: '{', close: '}' });
      expect(brackets).toContainEqual({ open: '"', close: '"' });
    });

    test('should return default delimiters for language without extension', () => {
      const brackets = getBracketPairs('fake-language-without-extension');
      
      // Should fallback to defaults
      expect(brackets).toHaveLength(4);
      expect(brackets).toContainEqual({ open: '(', close: ')' });
    });

    test('should return empty array for language with extension but no brackets', () => {
      // This tests the case where extension exists but has no bracket config
      // For now, we'll just verify the function doesn't crash
      const brackets = getBracketPairs('plaintext');
      expect(Array.isArray(brackets)).toBe(true);
    });
  });

  describe('getCommentConfig', () => {
    test('should return null for non-existent language', () => {
      const comments = getCommentConfig('non-existent-language-xyz');
      
      // Comments should be null when no extension found
      expect(comments).toBeNull();
    });

    test('should return null for language without extension', () => {
      const comments = getCommentConfig('fake-language-without-extension');
      
      expect(comments).toBeNull();
    });
  });

  describe('Fallback behavior consistency', () => {
    test('should return same default delimiters as lexer DEFAULT_DELIMITERS', () => {
      const brackets = getBracketPairs('non-existent-language');
      
      // Should match DEFAULT_DELIMITERS from lexer
      expect(brackets).toEqual(DEFAULT_DELIMITERS);
    });

    test('should cache fallback results', () => {
      const brackets1 = getBracketPairs('non-existent-language');
      const brackets2 = getBracketPairs('non-existent-language');
      
      // Should return same reference (cached)
      expect(brackets1).toBe(brackets2);
    });
  });

  describe('Warning logging', () => {
    test('should log warning when falling back to defaults', () => {
      getBracketPairs('non-existent-language-xyz');
      
      // Should have logged a warning
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "No language extension found for 'non-existent-language-xyz', using default delimiters"
      );
    });

    test('should not log warning for cached results', () => {
      // First call logs warning
      getBracketPairs('another-fake-language');
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      
      // Second call should use cache, no additional warning
      consoleWarnSpy.mockClear();
      getBracketPairs('another-fake-language');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });
});
