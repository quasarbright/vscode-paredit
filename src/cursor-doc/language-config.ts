/**
 * Language configuration helper
 * 
 * This module provides language-agnostic comment detection by querying
 * VS Code's extension host for language configurations.
 * 
 * NO HARDCODED COMMENT SYNTAX - everything is delegated to language extensions.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_DELIMITERS } from './lexer';

/**
 * Comment configuration for a language
 */
export interface CommentConfig {
  lineComment?: string;
  blockComment?: [string, string];
}

/**
 * Bracket/delimiter pair
 */
export interface BracketPair {
  open: string;
  close: string;
}

/**
 * Auto-closing pair configuration
 */
export interface AutoClosingPair {
  open: string;
  close: string;
  notIn?: string[];
}

/**
 * Full language configuration
 */
export interface LanguageConfig {
  comments: CommentConfig | null;
  brackets: BracketPair[];
  autoClosingPairs?: AutoClosingPair[];
}

/**
 * Cache of language configurations
 */
const configCache = new Map<string, LanguageConfig | null>();

/**
 * Track which languages we've warned about (to avoid duplicate warnings)
 */
const warnedLanguages = new Set<string>();

/**
 * Get full language configuration for a language by querying VS Code's extensions
 * This is completely language-agnostic - it reads the configuration from
 * the language extension's package.json and language-configuration.json
 */
export function getLanguageConfig(languageId: string): LanguageConfig | null {
  // Check cache
  if (configCache.has(languageId)) {
    return configCache.get(languageId)!;
  }

  // Find the language configuration
  const config = loadLanguageConfig(languageId);
  configCache.set(languageId, config);
  return config;
}

/**
 * Get comment configuration for a language (convenience method)
 */
export function getCommentConfig(languageId: string): CommentConfig | null {
  const config = getLanguageConfig(languageId);
  return config?.comments || null;
}

/**
 * Get bracket pairs for a language (convenience method)
 * Falls back to default delimiters if no language extension found
 */
export function getBracketPairs(languageId: string): BracketPair[] {
  const config = getLanguageConfig(languageId);
  
  // If no config found or no brackets defined, fall back to defaults
  if (!config || !config.brackets || config.brackets.length === 0) {
    // Only log warning once per language
    if (!warnedLanguages.has(languageId)) {
      console.warn(`No language extension found for '${languageId}', using default delimiters`);
      warnedLanguages.add(languageId);
    }
    return DEFAULT_DELIMITERS;
  }
  
  return config.brackets;
}

/**
 * Load language configuration from VS Code extensions
 */
function loadLanguageConfig(languageId: string): LanguageConfig | null {
  try {
    // Search all extensions for this language
    for (const extension of vscode.extensions.all) {
      const languages = extension.packageJSON?.contributes?.languages;
      if (!languages || !Array.isArray(languages)) continue;

      for (const lang of languages) {
        if (lang.id === languageId && lang.configuration) {
          // Found the language configuration file path
          const configPath = path.join(extension.extensionPath, lang.configuration);
          
          try {
            // Read the configuration file
            const configContent = fs.readFileSync(configPath, 'utf8');
            
            // Parse JSON (with comments support)
            const config = parseJsonWithComments(configContent);
            
            // Extract comment configuration
            const comments: CommentConfig | null = config.comments ? {
              lineComment: config.comments.lineComment,
              blockComment: config.comments.blockComment
            } : null;
            
            // Extract bracket pairs
            const brackets: BracketPair[] = [];
            
            // Check for brackets array (most common)
            if (config.brackets && Array.isArray(config.brackets)) {
              for (const bracket of config.brackets) {
                if (Array.isArray(bracket) && bracket.length === 2) {
                  brackets.push({ open: bracket[0], close: bracket[1] });
                }
              }
            }
            
            // Also check autoClosingPairs as fallback for brackets
            if (brackets.length === 0 && config.autoClosingPairs && Array.isArray(config.autoClosingPairs)) {
              for (const pair of config.autoClosingPairs) {
                if (pair.open && pair.close) {
                  brackets.push({ open: pair.open, close: pair.close });
                }
              }
            }
            
            // Extract autoClosingPairs (for detecting string delimiters)
            const autoClosingPairs: AutoClosingPair[] = [];
            if (config.autoClosingPairs && Array.isArray(config.autoClosingPairs)) {
              for (const pair of config.autoClosingPairs) {
                if (pair.open && pair.close) {
                  autoClosingPairs.push({
                    open: pair.open,
                    close: pair.close,
                    notIn: pair.notIn
                  });
                }
              }
            }
            
            return { comments, brackets, autoClosingPairs };
          } catch (error) {
            // Failed to read or parse config file
            continue;
          }
        }
      }
    }
  } catch (error) {
    // Extension API not available
  }

  return null;
}

/**
 * Parse JSON with comments (JSONC format)
 * VS Code language configuration files use JSONC format
 * 
 * Note: We use a simple approach that just tries JSON.parse first,
 * since most config files are valid JSON. If that fails, we strip
 * comments more carefully.
 */
function parseJsonWithComments(content: string): any {
  try {
    // First, try parsing as-is (many config files are valid JSON)
    return JSON.parse(content);
  } catch (firstError) {
    try {
      // If that fails, try stripping comments
      // This is a simplified approach - a full JSONC parser would be better
      // but this handles the common cases
      
      let cleaned = content;
      
      // Remove single-line comments (but not inside strings)
      // This regex is imperfect but works for most cases
      cleaned = cleaned.replace(/(?:^|\s)\/\/.*$/gm, '');
      
      // Remove multi-line comments (but not inside strings)
      // This is tricky - we use a simple heuristic: only remove /* */ 
      // if they're not inside quotes
      // For now, we'll skip this since it's error-prone
      
      // Remove trailing commas (common in JSONC)
      cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
      
      return JSON.parse(cleaned);
    } catch (secondError) {
      // If parsing still fails, return empty object
      return {};
    }
  }
}

/**
 * Clear the configuration cache
 */
export function clearConfigCache(): void {
  configCache.clear();
  warnedLanguages.clear();
}
