/**
 * Language-specific support for comment syntax detection
 * 
 * This module provides fallback comment syntax configuration.
 * The primary source of comment syntax should be from VS Code's language extensions
 * via the language-support-vscode module.
 */

import { CommentSyntax } from './cursor-doc/lexer';

/**
 * Default fallback comment syntax (Lisp/Racket style)
 * 
 * This is used when no language extension provides comment configuration.
 * We use Lisp/Racket syntax as the default because:
 * - This extension is primarily for structural editing in Lisp-family languages
 * - Semicolon comments are common in many languages (Lisp, Clojure, Scheme, etc.)
 * - It avoids incorrectly treating # as a comment (which breaks Racket, Ruby, Python, etc.)
 */
export const DEFAULT_COMMENT_SYNTAX: CommentSyntax = {
  lineComment: ';',
  blockComment: ['#|', '|#']
};

/**
 * Get default comment syntax (Lisp/Racket style)
 */
export function getDefaultCommentSyntax(): CommentSyntax {
  return DEFAULT_COMMENT_SYNTAX;
}


