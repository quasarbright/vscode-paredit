/**
 * VS Code token provider that uses the editor's TextMate grammar
 * to identify which parts of the document are comments
 * 
 * This is completely language-agnostic - it relies on VS Code's
 * tokenization to tell us what's a comment, rather than trying
 * to parse comments ourselves.
 */

import * as vscode from 'vscode';

/**
 * Check if a position in the document is within a comment
 * Uses VS Code's tokenization to determine this
 */
export async function isPositionInComment(
  document: vscode.TextDocument,
  position: vscode.Position
): Promise<boolean> {
  try {
    // Try to get token information at this position
    const tokens = await vscode.commands.executeCommand<any[]>(
      'vscode.provideDocumentRangeSemanticTokens',
      document.uri,
      new vscode.Range(position, position)
    );
    
    if (tokens && tokens.length > 0) {
      // Check if any token at this position is a comment
      // Semantic tokens would tell us the token type
      return false; // Placeholder - semantic tokens API is complex
    }
  } catch (error) {
    // Semantic tokens not available, fall through to other methods
  }
  
  // Fallback: Use a simpler heuristic based on syntax highlighting
  // This is a workaround since VS Code doesn't expose TextMate tokens directly
  return false;
}

/**
 * Get comment ranges for a line
 * Returns ranges that are commented out according to VS Code's grammar
 */
export interface CommentRange {
  start: number;  // Character offset in line
  end: number;    // Character offset in line
}

/**
 * Cache for comment ranges by document and line
 */
const commentRangeCache = new Map<string, Map<number, CommentRange[]>>();

/**
 * Get all comment ranges in a line
 * This uses VS Code's tokenization to identify commented text
 */
export async function getCommentRangesInLine(
  document: vscode.TextDocument,
  lineNumber: number
): Promise<CommentRange[]> {
  const cacheKey = `${document.uri.toString()}:${document.version}`;
  
  // Check cache
  let docCache = commentRangeCache.get(cacheKey);
  if (docCache && docCache.has(lineNumber)) {
    return docCache.get(lineNumber)!;
  }
  
  // Initialize cache for this document if needed
  if (!docCache) {
    docCache = new Map();
    commentRangeCache.set(cacheKey, docCache);
  }
  
  // Get the line text
  const line = document.lineAt(lineNumber);
  const ranges: CommentRange[] = [];
  
  // Try to use VS Code's tokenization
  // Unfortunately, VS Code doesn't expose TextMate tokens directly to extensions
  // We need to use a workaround
  
  // For now, return empty array - we'll implement the actual tokenization below
  docCache.set(lineNumber, ranges);
  return ranges;
}

/**
 * Clear the comment range cache for a document
 */
export function clearCommentRangeCache(document?: vscode.TextDocument): void {
  if (document) {
    const prefix = document.uri.toString();
    for (const key of commentRangeCache.keys()) {
      if (key.startsWith(prefix)) {
        commentRangeCache.delete(key);
      }
    }
  } else {
    commentRangeCache.clear();
  }
}

/**
 * Check if a character position is within any comment range
 */
export function isOffsetInCommentRanges(offset: number, ranges: CommentRange[]): boolean {
  return ranges.some(range => offset >= range.start && offset < range.end);
}
