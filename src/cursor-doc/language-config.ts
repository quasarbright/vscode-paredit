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
 * Full language configuration
 */
export interface LanguageConfig {
  comments: CommentConfig | null;
  brackets: BracketPair[];
}

/**
 * Cache of language configurations
 */
const configCache = new Map<string, LanguageConfig | null>();

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
 */
export function getBracketPairs(languageId: string): BracketPair[] {
  const config = getLanguageConfig(languageId);
  return config?.brackets || [];
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
            
            // Also check autoClosingPairs as fallback
            if (brackets.length === 0 && config.autoClosingPairs && Array.isArray(config.autoClosingPairs)) {
              for (const pair of config.autoClosingPairs) {
                if (pair.open && pair.close) {
                  brackets.push({ open: pair.open, close: pair.close });
                }
              }
            }
            
            return { comments, brackets };
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
 */
function parseJsonWithComments(content: string): any {
  try {
    // Remove single-line comments
    let cleaned = content.replace(/\/\/.*$/gm, '');
    
    // Remove multi-line comments
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Remove trailing commas (common in JSONC)
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    
    return JSON.parse(cleaned);
  } catch (error) {
    // If parsing fails, return empty object
    return {};
  }
}

/**
 * Clear the configuration cache
 */
export function clearConfigCache(): void {
  configCache.clear();
}
