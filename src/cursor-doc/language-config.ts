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
 * Cache of language configurations
 */
const configCache = new Map<string, CommentConfig | null>();

/**
 * Get comment configuration for a language by querying VS Code's extensions
 * This is completely language-agnostic - it reads the configuration from
 * the language extension's package.json and language-configuration.json
 */
export function getCommentConfig(languageId: string): CommentConfig | null {
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
 * Load language configuration from VS Code extensions
 */
function loadLanguageConfig(languageId: string): CommentConfig | null {
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
            if (config.comments) {
              return {
                lineComment: config.comments.lineComment,
                blockComment: config.comments.blockComment
              };
            }
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
