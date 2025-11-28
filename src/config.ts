import * as vscode from 'vscode';

export interface DelimiterPair {
  open: string;
  close: string;
}

export interface PareditConfig {
  enabledLanguages: string[];
  enabledFileExtensions: string[];
  customDelimiters: Record<string, DelimiterPair[]>;
  vimMode: boolean;
  multicursor: boolean;
  killAlsoCutsToClipboard: boolean;
}

let configChangeListeners: Array<(config: PareditConfig) => void> = [];

/**
 * Default delimiters used when no custom configuration is provided
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
      'lisp',
      'scheme',
      'racket'
    ]),
    enabledFileExtensions: config.get<string[]>('enabledFileExtensions', []),
    customDelimiters: config.get<Record<string, DelimiterPair[]>>('customDelimiters', {}),
    vimMode: config.get<boolean>('vimMode', true),
    multicursor: config.get<boolean>('multicursor', false),
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
 */
export function getDelimitersForLanguage(languageId: string): DelimiterPair[] {
  const config = getConfig();
  
  // Return custom delimiters if defined for this language
  if (config.customDelimiters[languageId]) {
    return config.customDelimiters[languageId];
  }
  
  // Return default delimiters
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
