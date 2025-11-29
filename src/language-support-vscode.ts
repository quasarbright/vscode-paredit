/**
 * VS Code-specific language support utilities
 * 
 * This module reads comment syntax from VS Code language extensions by:
 * 1. Finding the extension that contributes the language
 * 2. Reading its language-configuration.json file
 * 3. Extracting the comment syntax
 * 
 * Falls back to hardcoded configurations if the extension doesn't provide one.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CommentSyntax } from './cursor-doc/lexer';
import { getDefaultCommentSyntax } from './language-support';

/**
 * Read comment syntax from a language extension's configuration file
 */
async function readCommentSyntaxFromExtension(languageId: string): Promise<CommentSyntax | null> {
  try {
    const extensions = vscode.extensions.all;
    
    // Find the extension that contributes this language
    for (const ext of extensions) {
      const languages = ext.packageJSON?.contributes?.languages;
      if (!languages) continue;
      
      for (const lang of languages) {
        if (lang.id === languageId && lang.configuration) {
          // Found the language configuration file path
          const configPath = path.join(ext.extensionPath, lang.configuration);
          
          try {
            // Read the configuration file
            const configContent = await fs.promises.readFile(configPath, 'utf8');
            
            // Parse JSON (with comments support)
            const config = parseJsonWithComments(configContent);
            
            if (config.comments) {
              const commentSyntax: CommentSyntax = {};
              
              if (config.comments.lineComment) {
                commentSyntax.lineComment = config.comments.lineComment;
              }
              
              if (config.comments.blockComment && Array.isArray(config.comments.blockComment)) {
                commentSyntax.blockComment = [
                  config.comments.blockComment[0],
                  config.comments.blockComment[1]
                ];
              }
              
              return commentSyntax;
            }
          } catch (fileError) {
            // Configuration file not found or not readable, continue to next extension
            continue;
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error reading comment syntax from extension:', error);
    return null;
  }
}

/**
 * Parse JSON with comments (JSONC format)
 * VS Code language configuration files often contain comments
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
    // If parsing fails, try without comment removal
    return JSON.parse(content);
  }
}

/**
 * Check if a language extension is installed for the given language
 */
export function isLanguageExtensionInstalled(languageId: string): boolean {
  try {
    const extensions = vscode.extensions.all;
    
    // Check if any extension contributes this language
    for (const ext of extensions) {
      const languages = ext.packageJSON?.contributes?.languages;
      if (languages) {
        const hasLanguage = languages.some((lang: any) => lang.id === languageId);
        if (hasLanguage) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Show a warning that no language support is available
 * Only shows once per session per language
 */
const warnedLanguages = new Set<string>();

export function warnNoLanguageSupport(languageId: string): void {
  if (warnedLanguages.has(languageId)) {
    return;
  }
  
  warnedLanguages.add(languageId);
  
  vscode.window.showWarningMessage(
    `Paredit: No language extension found for '${languageId}'. ` +
    `Using default comment syntax (semicolon). ` +
    `Install a language extension for accurate comment detection.`,
    'Dismiss'
  );
}

/**
 * Cache for comment syntax by language ID
 * Avoids re-reading extension files on every document open
 */
const commentSyntaxCache = new Map<string, CommentSyntax>();

/**
 * Get comment syntax for a document
 * 
 * Priority order:
 * 1. Read from language extension's configuration file
 * 2. Fall back to default (Lisp/Racket style: semicolon comments)
 * 
 * Results are cached for performance.
 */
export async function getCommentSyntaxOrWarn(document: vscode.TextDocument): Promise<CommentSyntax> {
  const languageId = document.languageId;
  
  // Check cache first
  if (commentSyntaxCache.has(languageId)) {
    return commentSyntaxCache.get(languageId)!;
  }
  
  // Try to read from language extension
  const extensionSyntax = await readCommentSyntaxFromExtension(languageId);
  
  if (extensionSyntax) {
    commentSyntaxCache.set(languageId, extensionSyntax);
    return extensionSyntax;
  }
  
  // Fall back to default (Lisp/Racket style)
  const defaultSyntax = getDefaultCommentSyntax();
  commentSyntaxCache.set(languageId, defaultSyntax);
  
  // Show warning if no language extension is installed
  if (!isLanguageExtensionInstalled(languageId)) {
    warnNoLanguageSupport(languageId);
  }
  
  return defaultSyntax;
}

/**
 * Clear the comment syntax cache
 * Useful when extensions are installed/uninstalled
 */
export function clearCommentSyntaxCache(): void {
  commentSyntaxCache.clear();
}
