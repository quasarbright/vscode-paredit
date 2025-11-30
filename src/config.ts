import * as vscode from 'vscode';

export interface DelimiterPair {
  open: string;
  close: string;
}

export interface PareditConfig {
  enabledLanguages: string[];
  enabledFileExtensions: string[];
  customDelimiters: Record<string, DelimiterPair[]>;
  killAlsoCutsToClipboard: boolean;
}

let configChangeListeners: Array<(config: PareditConfig) => void> = [];

/**
 * Default delimiters used when no custom configuration is provided
 * Note: Single quotes are NOT included by default because they have different
 * meanings in different languages (string delimiter in JS, quote operator in Lisp)
 */
export const DEFAULT_DELIMITERS: DelimiterPair[] = [
  { open: '(', close: ')' },
  { open: '[', close: ']' },
  { open: '{', close: '}' },
  { open: '"', close: '"' }
];

/**
 * Get the current paredit configuration
 */
export function getConfig(): PareditConfig {
  const config = vscode.workspace.getConfiguration('paredit');
  
  return {
    enabledLanguages: config.get<string[]>('enabledLanguages', [
      'javascript',
      'typescript',
      'json',
      'clojure',
      'lisp',
      'scheme',
      'racket'
    ]),
    enabledFileExtensions: config.get<string[]>('enabledFileExtensions', []),
    customDelimiters: config.get<Record<string, DelimiterPair[]>>('customDelimiters', {}),
    killAlsoCutsToClipboard: config.get<boolean>('killAlsoCutsToClipboard', true)
  };
}

/**
 * Check if paredit is enabled for the given document
 */
export function isLanguageEnabled(document: vscode.TextDocument): boolean {
  const config = getConfig();
  
  // Check if language ID matches
  if (config.enabledLanguages.includes(document.languageId)) {
    return true;
  }
  
  // Check if file extension matches
  const fileName = document.fileName;
  return config.enabledFileExtensions.some(ext => {
    // Ensure extension starts with a dot
    const normalizedExt = ext.startsWith('.') ? ext : '.' + ext;
    return fileName.endsWith(normalizedExt);
  });
}

/**
 * Get delimiter configuration for a specific language
 * Priority: user config > language extension config > default
 */
export function getDelimitersForLanguage(languageId: string): DelimiterPair[] {
  const config = getConfig();
  
  // 1. Return custom delimiters if defined for this language (highest priority)
  if (config.customDelimiters[languageId]) {
    return config.customDelimiters[languageId];
  }
  
  // 2. Try to get brackets from VS Code's language extension
  try {
    const { getLanguageConfig } = require('./cursor-doc/language-config');
    const langConfig = getLanguageConfig(languageId);
    
    if (langConfig && langConfig.brackets && langConfig.brackets.length > 0) {
      // Start with brackets from the language extension
      const result = [...langConfig.brackets];
      
      // Add double quotes if not already present (most languages use them)
      const hasDoubleQuote = result.some((b: DelimiterPair) => b.open === '"' && b.close === '"');
      if (!hasDoubleQuote) {
        result.push({ open: '"', close: '"' });
      }
      
      // Check if the language uses single quotes for strings by looking at autoClosingPairs
      // This is language-agnostic - we check what the language extension defines
      const hasSingleQuote = result.some((b: DelimiterPair) => b.open === "'" && b.close === "'");
      if (!hasSingleQuote && langConfig.autoClosingPairs) {
        // Check if single quote is in autoClosingPairs (indicates it's used for strings)
        const usesSingleQuote = langConfig.autoClosingPairs.some(
          (pair: any) => pair.open === "'" && pair.close === "'"
        );
        if (usesSingleQuote) {
          result.push({ open: "'", close: "'" });
        }
      }
      
      return result;
    }
  } catch (error) {
    // Language config module not available or error occurred
  }
  
  // 3. Return default delimiters (fallback)
  return DEFAULT_DELIMITERS;
}

/**
 * Register a listener for configuration changes
 */
export function onConfigChange(listener: (config: PareditConfig) => void): vscode.Disposable {
  configChangeListeners.push(listener);
  
  return {
    dispose: () => {
      const index = configChangeListeners.indexOf(listener);
      if (index > -1) {
        configChangeListeners.splice(index, 1);
      }
    }
  };
}

/**
 * Initialize configuration management and listen for changes
 */
export function initializeConfig(context: vscode.ExtensionContext): void {
  // Listen for configuration changes
  const disposable = vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('paredit')) {
      const newConfig = getConfig();
      
      // Notify all listeners
      configChangeListeners.forEach(listener => {
        try {
          listener(newConfig);
        } catch (error) {
          console.error('Error in config change listener:', error);
        }
      });
    }
  });
  
  context.subscriptions.push(disposable);
}
