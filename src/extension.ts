import * as vscode from 'vscode';
import { EditableDocument } from './cursor-doc/model';
import { VSCodeScanner } from './cursor-doc/vscode-scanner';
import * as commands from './commands';
import * as config from './config';

/**
 * Command wrapper that checks language activation and wraps the editor
 */
function wrapPareditCommand(
  handler: (doc: EditableDocument) => void | Promise<void>
): () => Promise<void> {
  return async () => {
    const editor = vscode.window.activeTextEditor;
    
    // Handle case where no editor is active
    if (!editor) {
      return;
    }
    
    // Check if paredit is enabled for this language
    if (!config.isLanguageEnabled(editor.document)) {
      return;
    }
    
    // Get delimiters for this language
    const delimiters = config.getDelimitersForLanguage(editor.document.languageId);
    
    // Create VS Code-aware scanner that detects comments
    const scanner = new VSCodeScanner(editor.document, delimiters);
    
    // Wrap the editor in EditableDocument
    const doc = new EditableDocument(editor, scanner);
    
    try {
      await handler(doc);
    } catch (error) {
      console.error('Paredit command error:', error);
      vscode.window.showErrorMessage(`Paredit error: ${error}`);
    }
  };
}

/**
 * Update the paredit.isActive context based on the current editor
 */
function updatePareditContext(editor: vscode.TextEditor | undefined): void {
  const isActive = editor ? config.isLanguageEnabled(editor.document) : false;
  vscode.commands.executeCommand('setContext', 'paredit.isActive', isActive);
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Paredit extension is now active');
  
  // Initialize configuration management
  config.initializeConfig(context);
  
  // Set initial context
  updatePareditContext(vscode.window.activeTextEditor);
  
  // Update context when active editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      updatePareditContext(editor);
    })
  );
  
  // Update context when document language changes
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(() => {
      updatePareditContext(vscode.window.activeTextEditor);
    })
  );
  
  // Update context when configuration changes
  context.subscriptions.push(
    config.onConfigChange(() => {
      updatePareditContext(vscode.window.activeTextEditor);
    })
  );
  

  
  // Register all navigation commands
  context.subscriptions.push(
    vscode.commands.registerCommand('paredit.forwardSexp', wrapPareditCommand(commands.forwardSexp)),
    vscode.commands.registerCommand('paredit.backwardSexp', wrapPareditCommand(commands.backwardSexp)),
    vscode.commands.registerCommand('paredit.forwardUpSexp', wrapPareditCommand(commands.forwardUpSexp)),
    vscode.commands.registerCommand('paredit.backwardUpSexp', wrapPareditCommand(commands.backwardUpSexp)),
    vscode.commands.registerCommand('paredit.forwardDownSexp', wrapPareditCommand(commands.forwardDownSexp)),
    vscode.commands.registerCommand('paredit.backwardDownSexp', wrapPareditCommand(commands.backwardDownSexp)),
    vscode.commands.registerCommand('paredit.forwardSexpOrUp', wrapPareditCommand(commands.forwardSexpOrUp)),
    vscode.commands.registerCommand('paredit.backwardSexpOrUp', wrapPareditCommand(commands.backwardSexpOrUp))
  );
  
  // Register all selection commands
  context.subscriptions.push(
    vscode.commands.registerCommand('paredit.selectCurrentForm', wrapPareditCommand(commands.selectCurrentForm)),
    vscode.commands.registerCommand('paredit.selectForwardSexp', wrapPareditCommand(commands.selectForwardSexp)),
    vscode.commands.registerCommand('paredit.selectBackwardSexp', wrapPareditCommand(commands.selectBackwardSexp)),
    vscode.commands.registerCommand('paredit.selectForwardUpSexp', wrapPareditCommand(commands.selectForwardUpSexp)),
    vscode.commands.registerCommand('paredit.selectBackwardUpSexp', wrapPareditCommand(commands.selectBackwardUpSexp)),
    vscode.commands.registerCommand('paredit.selectForwardDownSexp', wrapPareditCommand(commands.selectForwardDownSexp)),
    vscode.commands.registerCommand('paredit.selectBackwardDownSexp', wrapPareditCommand(commands.selectBackwardDownSexp)),
    vscode.commands.registerCommand('paredit.expandSelection', wrapPareditCommand(commands.expandSelection)),
    vscode.commands.registerCommand('paredit.contractSelection', wrapPareditCommand(commands.contractSelection)),
    vscode.commands.registerCommand('paredit.selectDefun', wrapPareditCommand(commands.selectDefun))
  );
  
  // Register all manipulation commands
  context.subscriptions.push(
    vscode.commands.registerCommand('paredit.slurpForward', wrapPareditCommand(commands.slurpForward)),
    vscode.commands.registerCommand('paredit.slurpBackward', wrapPareditCommand(commands.slurpBackward)),
    vscode.commands.registerCommand('paredit.barfForward', wrapPareditCommand(commands.barfForward)),
    vscode.commands.registerCommand('paredit.barfBackward', wrapPareditCommand(commands.barfBackward)),
    vscode.commands.registerCommand('paredit.raiseSexp', wrapPareditCommand(commands.raiseSexp)),
    vscode.commands.registerCommand('paredit.spliceSexp', wrapPareditCommand(commands.spliceSexp)),
    vscode.commands.registerCommand('paredit.wrapWithParen', wrapPareditCommand(commands.wrapWithParen)),
    vscode.commands.registerCommand('paredit.wrapWithBracket', wrapPareditCommand(commands.wrapWithBracket)),
    vscode.commands.registerCommand('paredit.wrapWithBrace', wrapPareditCommand(commands.wrapWithBrace)),
    vscode.commands.registerCommand('paredit.transposeSexp', wrapPareditCommand(commands.transposeSexp))
  );
  
  // Register all clipboard commands
  context.subscriptions.push(
    vscode.commands.registerCommand('paredit.killForwardSexp', wrapPareditCommand(commands.killForwardSexp)),
    vscode.commands.registerCommand('paredit.killBackwardSexp', wrapPareditCommand(commands.killBackwardSexp)),
    vscode.commands.registerCommand('paredit.killSexp', wrapPareditCommand(commands.killSexp)),
    vscode.commands.registerCommand('paredit.killForwardUpSexp', wrapPareditCommand(commands.killForwardUpSexp)),
    vscode.commands.registerCommand('paredit.killBackwardUpSexp', wrapPareditCommand(commands.killBackwardUpSexp)),
    vscode.commands.registerCommand('paredit.copySexp', wrapPareditCommand(commands.copySexp)),
    vscode.commands.registerCommand('paredit.copyForwardSexp', wrapPareditCommand(commands.copyForwardSexp)),
    vscode.commands.registerCommand('paredit.copyBackwardSexp', wrapPareditCommand(commands.copyBackwardSexp)),
    vscode.commands.registerCommand('paredit.copyForwardUpSexp', wrapPareditCommand(commands.copyForwardUpSexp)),
    vscode.commands.registerCommand('paredit.copyBackwardUpSexp', wrapPareditCommand(commands.copyBackwardUpSexp))
  );
}

export function deactivate() {
  // Cleanup if needed
}
