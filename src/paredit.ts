/**
 * Core paredit operations for structural editing
 * Provides range-finding, selection, and manipulation functions
 */

import { EditableDocument } from './cursor-doc/model';

/**
 * Type alias for ranges [start, end]
 */
export type Range = [number, number];

/**
 * Get the range for moving forward one sexp from the given offset
 * @param doc - the editable document
 * @param offset - starting offset
 * @returns [start, end] range for the forward sexp movement
 * The end position is 1 character after the end of the next s-expression
 */
export function forwardSexpRange(doc: EditableDocument, offset: number): Range {
  const cursor = doc.getTokenCursor(offset);
  let startToken = cursor.getToken();
  
  // If we're on an empty line or past the end, try to move to the next token
  if (!startToken) {
    if (!cursor.next()) {
      return [offset, offset];
    }
    startToken = cursor.getToken();
    if (!startToken) {
      return [offset, offset];
    }
  }
  
  // If we're at or past the end of the current token, move to the next token
  if (offset >= cursor.offsetEnd) {
    if (!cursor.next()) {
      return [offset, offset];
    }
    startToken = cursor.getToken();
    if (!startToken) {
      return [offset, offset];
    }
  }
  
  // Skip whitespace and comments at the start
  if (startToken.type === 'ws' || startToken.type === 'ws-nl' || startToken.type === 'comment') {
    if (!cursor.forwardWhitespace()) {
      // No non-whitespace tokens after this position
      return [offset, offset];
    }
    startToken = cursor.getToken();
    if (!startToken) {
      // Reached end of document
      return [offset, offset];
    }
  }
  
  // Special handling for when we're at an open delimiter or string start
  // We need to move to the matching close and then past it
  if (startToken.type === 'open' || startToken.type === 'str-start') {
    if (!cursor.forwardList()) {
      return [offset, offset];
    }
    // Now we're at the closing delimiter
    // Return the position after it (offsetEnd = 1 char after the closing delimiter)
    return [offset, cursor.offsetEnd];
  }
  
  // For atoms and close delimiters, return the position right after them
  // offsetEnd is 1 character after the end of the token
  return [offset, cursor.offsetEnd];
}

/**
 * Get the range for moving backward one sexp from the given offset
 * @param doc - the editable document
 * @param offset - starting offset
 * @returns [start, end] range for the backward sexp movement
 * The start position is at the beginning of the previous s-expression
 */
export function backwardSexpRange(doc: EditableDocument, offset: number): Range {
  if (offset === 0) {
    return [offset, offset];
  }
  
  const cursor = doc.getTokenCursor(offset);
  let token = cursor.getToken();
  
  // If we're past the end of the current token, we might be in whitespace
  if (token && cursor.offsetEnd < offset) {
    // Move to the next token
    cursor.next();
    token = cursor.getToken();
  }
  
  // If we're on whitespace or comment, skip backward over it to find the actual sexp
  while (token && (token.type === 'ws' || token.type === 'ws-nl' || token.type === 'comment')) {
    if (!cursor.previous()) {
      return [offset, offset];
    }
    token = cursor.getToken();
  }
  
  if (!token) {
    return [offset, offset];
  }
  
  // Now we're at a non-whitespace token
  // Check if we're at the START of this token (offset == offsetStart)
  // If so, we need to move to the PREVIOUS sexp
  if (offset <= cursor.offsetStart) {
    // We're at or before the start of this token, move to previous sexp
    if (!cursor.backwardSexp()) {
      return [offset, offset];
    }
    return [cursor.offsetStart, offset];
  }
  
  // We're in the middle or at the end of a token
  // Find the start of the current sexp
  if (token.type === 'close' || token.type === 'str-end') {
    // We're at a closing delimiter, find the matching opening delimiter
    if (!cursor.backwardList()) {
      return [offset, offset];
    }
    return [cursor.offsetStart, offset];
  } else if (token.type === 'open') {
    // We're at an opening delimiter
    return [cursor.offsetStart, offset];
  } else {
    // We're at an atom
    return [cursor.offsetStart, offset];
  }
}

/**
 * Get the range for moving forward one sexp, or up if at the end of a list
 * @param doc - the editable document
 * @param offset - starting offset
 * @returns [start, end] range for the movement
 */
export function forwardSexpOrUpRange(doc: EditableDocument, offset: number): Range {
  const cursor = doc.getTokenCursor(offset);
  
  // Skip whitespace
  cursor.forwardWhitespace();
  
  // Check if we're at a closing delimiter
  const token = cursor.getToken();
  if (token && (token.type === 'close' || token.type === 'str-end')) {
    // Move past the closing delimiter
    const endOffset = cursor.offsetEnd;
    cursor.next();
    cursor.forwardWhitespace();
    return [offset, cursor.offsetStart > endOffset ? cursor.offsetStart : endOffset];
  }
  
  // Try to move forward one sexp
  if (cursor.forwardSexp()) {
    cursor.forwardWhitespace();
    return [offset, cursor.offsetStart];
  }
  
  // Can't move forward, return current position
  return [offset, offset];
}

/**
 * Get the range for moving backward one sexp, or up if at the start of a list
 * @param doc - the editable document
 * @param offset - starting offset
 * @returns [start, end] range for the movement
 */
export function backwardSexpOrUpRange(doc: EditableDocument, offset: number): Range {
  if (offset === 0) {
    return [offset, offset];
  }
  
  const cursor = doc.getTokenCursor(offset);
  
  // Position the cursor correctly
  if (cursor.offsetEnd < offset) {
    cursor.next();
  }
  
  // Check if we're at an opening delimiter
  let token = cursor.getToken();
  if (token && token.type === 'open') {
    // We're at the start of a list, this is already "up"
    return [offset, offset];
  }
  
  // Move backward to skip any whitespace we might be on
  while (token && (token.type === 'ws' || token.type === 'ws-nl')) {
    if (!cursor.previous()) {
      return [offset, offset];
    }
    token = cursor.getToken();
  }
  
  if (!token) {
    return [offset, offset];
  }
  
  // Check if we're at a closing delimiter - if so, try to move backward first
  if (token.type === 'close' || token.type === 'str-end') {
    // Try to move backward one sexp
    if (cursor.backwardSexp()) {
      return [cursor.offsetStart, offset];
    }
    // Can't move backward, stay at current position
    return [offset, offset];
  }
  
  // For backward movement, return the range of the current sexp
  const [start, end] = cursor.rangeForCurrentForm(offset);
  
  // Only return a valid range if it's actually before our offset
  if (end <= offset) {
    return [start, offset];
  }
  
  // If the current form extends past our offset, we're inside it
  return [start, offset];
}

/**
 * Get the range for moving to the closing delimiter of the parent list
 * @param doc - the editable document
 * @param offset - starting offset
 * @returns [start, end] range for the movement
 */
export function rangeToForwardUpList(doc: EditableDocument, offset: number): Range {
  const cursor = doc.getTokenCursor(offset);
  
  // Check if we're on a closing delimiter
  const token = cursor.getToken();
  if (token && (token.type === 'close' || token.type === 'str-end') && cursor.offsetStart === offset) {
    // We're on a closing delimiter, move up one more level
    // First move past this closing delimiter
    if (!cursor.next()) {
      return [offset, offset];
    }
  }
  
  // Try to move up to parent opening delimiter
  if (cursor.upList()) {
    // Now move to the matching closing delimiter
    if (cursor.forwardList()) {
      // Position ON the closing delimiter for navigation
      return [offset, cursor.offsetStart];
    }
  }
  
  // Can't move up, return current position
  return [offset, offset];
}

/**
 * Get the range for moving to the opening delimiter of the parent list
 * @param doc - the editable document
 * @param offset - starting offset
 * @returns [start, end] range for the movement
 * For navigation: returns position ON the opening delimiter (offsetStart)
 * For kill/copy/select: use offsetEnd to exclude the delimiter
 */
export function rangeToBackwardUpList(doc: EditableDocument, offset: number): Range {
  const cursor = doc.getTokenCursor(offset);
  
  // Try to move up to parent opening delimiter
  if (cursor.upList()) {
    // Return position ON the opening delimiter for navigation
    return [cursor.offsetStart, offset];
  }
  
  // Can't move up, return current position
  return [offset, offset];
}

/**
 * Get the range for moving down to the first child list (forward direction)
 * @param doc - the editable document
 * @param offset - starting offset
 * @returns [start, end] range for the movement
 */
export function rangeToForwardDownList(doc: EditableDocument, offset: number): Range {
  const cursor = doc.getTokenCursor(offset);
  
  // Try to move down to child list
  if (cursor.downList()) {
    return [offset, cursor.offsetStart];
  }
  
  // Can't move down, return current position
  return [offset, offset];
}

/**
 * Get the range for moving down to the first child list (backward direction)
 * From the current position, move up to parent then down to first child
 * @param doc - the editable document
 * @param offset - starting offset
 * @returns [start, end] range for the movement
 */
export function rangeToBackwardDownList(doc: EditableDocument, offset: number): Range {
  const cursor = doc.getTokenCursor(offset);
  
  // First try to move up to the parent opening delimiter
  if (cursor.upList()) {
    // Now try to move down to the first child list
    if (cursor.downList()) {
      return [cursor.offsetStart, offset];
    }
  }
  
  // Can't move down, return current position
  return [offset, offset];
}

/**
 * Select the current form (sexp) at the cursor position
 * If cursor is inside a list, select the entire list
 * @param doc - the editable document
 * @returns updated selections
 */
export function selectCurrentForm(doc: EditableDocument): void {
  const selections = doc.selections;
  const newSelections = selections.map(sel => {
    const cursor = doc.getTokenCursor(sel.active);
    
    // First, try to move up to find the containing list
    const upCursor = cursor.clone() as any;
    if (upCursor.upList()) {
      // We're inside a list, select the whole list
      const [start, end] = upCursor.rangeForCurrentForm(sel.active);
      return new (sel.constructor as any)(start, end);
    }
    
    // Not inside a list, select the current token/form
    const [start, end] = cursor.rangeForCurrentForm(sel.active);
    return new (sel.constructor as any)(start, end);
  });
  
  doc.selections = newSelections;
}

/**
 * Select forward one sexp from each cursor
 * @param doc - the editable document
 */
export function selectForwardSexp(doc: EditableDocument): void {
  const selections = doc.selections;
  const newSelections = selections.map(sel => {
    let startPos = sel.active;
    let anchorPos = sel.anchor;
    
    // Special case: if we're just after an opening delimiter, move back to include it
    // This handles both empty selections and Vim visual mode (where anchor might be at the delimiter)
    if (startPos > 0) {
      const cursor = doc.getTokenCursor(startPos - 1);
      const token = cursor.getToken();
      if (token && token.type === 'open' && cursor.offsetEnd === startPos) {
        // We're right after an opening delimiter
        // Check if anchor is at or before the position just after the opening delimiter
        if (anchorPos <= startPos) {
          // Move back to include the opening delimiter
          startPos = cursor.offsetStart;
          // If anchor was at or after the delimiter, move it back too
          if (anchorPos >= cursor.offsetStart) {
            anchorPos = cursor.offsetStart;
          }
        }
      }
    }
    
    const [_, end] = forwardSexpRange(doc, startPos);
    return new (sel.constructor as any)(anchorPos, end);
  });
  
  doc.selections = newSelections;
}

/**
 * Select backward one sexp from each cursor
 * @param doc - the editable document
 */
export function selectBackwardSexp(doc: EditableDocument): void {
  const selections = doc.selections;
  const newSelections = selections.map(sel => {
    const [start, _] = backwardSexpRange(doc, sel.active);
    return new (sel.constructor as any)(sel.anchor, start);
  });
  
  doc.selections = newSelections;
}

/**
 * Select forward and up (to end of parent list)
 * @param doc - the editable document
 */
export function selectForwardUpSexp(doc: EditableDocument): void {
  const selections = doc.selections;
  const newSelections = selections.map(sel => {
    let startPos = sel.active;
    
    // Handle Vim visual mode: when anchor and active are adjacent (visual mode just started),
    // we need to adjust the starting position back by 1
    if (!sel.isCursor && Math.abs(sel.active - sel.anchor) === 1 && sel.active > sel.anchor) {
      // Visual mode with active one position ahead of anchor
      startPos = sel.active - 1;
    }
    
    const [_, end] = rangeToForwardUpList(doc, startPos);
    return new (sel.constructor as any)(sel.anchor, end);
  });
  
  doc.selections = newSelections;
}

/**
 * Select backward and up (to start of parent list, excluding the delimiter)
 * @param doc - the editable document
 */
export function selectBackwardUpSexp(doc: EditableDocument): void {
  const selections = doc.selections;
  const newSelections = selections.map(sel => {
    const cursor = doc.getTokenCursor(sel.active);
    
    // Move up to parent opening delimiter
    if (cursor.upList()) {
      // Use offsetEnd to exclude the opening delimiter
      const startAfterDelimiter = cursor.offsetEnd;
      return new (sel.constructor as any)(sel.anchor, startAfterDelimiter);
    }
    
    // Can't move up, keep current selection
    return sel;
  });
  
  doc.selections = newSelections;
}

/**
 * Select forward and down (into first child list)
 * @param doc - the editable document
 */
export function selectForwardDownSexp(doc: EditableDocument): void {
  const selections = doc.selections;
  const newSelections = selections.map(sel => {
    const [_, end] = rangeToForwardDownList(doc, sel.active);
    return new (sel.constructor as any)(sel.anchor, end);
  });
  
  doc.selections = newSelections;
}

/**
 * Select backward and down (into child list from end)
 * @param doc - the editable document
 */
export function selectBackwardDownSexp(doc: EditableDocument): void {
  const selections = doc.selections;
  const newSelections = selections.map(sel => {
    const [start, _] = rangeToBackwardDownList(doc, sel.active);
    return new (sel.constructor as any)(sel.anchor, start);
  });
  
  doc.selections = newSelections;
}

/**
 * Expand selection to include the next outer sexp
 * @param doc - the editable document
 */
export function sexpRangeExpansion(doc: EditableDocument): void {
  const selections = doc.selections;
  const newSelections = selections.map(sel => {
    // Start from the beginning of the selection
    let cursor = doc.getTokenCursor(sel.start);
    
    // Move up to find the containing form
    if (!cursor.upList()) {
      // Not inside a list, can't expand
      return sel;
    }
    
    // Get the range of the containing form
    let [start, end] = cursor.rangeForCurrentForm(sel.start);
    
    // If this is the same as our current selection, try to expand one more level
    if (start === sel.start && end === sel.end) {
      if (cursor.upList()) {
        const [newStart, newEnd] = cursor.rangeForCurrentForm(sel.start);
        return new (sel.constructor as any)(newStart, newEnd);
      }
      // Can't expand further
      return sel;
    }
    
    // If the containing form is only slightly larger than our selection,
    // it might be the immediate parent - try to expand one more level
    if (start < sel.start && end > sel.end) {
      if (cursor.upList()) {
        const [outerStart, outerEnd] = cursor.rangeForCurrentForm(sel.start);
        // If there's a meaningful outer form, return it
        if (outerStart < start || outerEnd > end) {
          return new (sel.constructor as any)(outerStart, outerEnd);
        }
      }
      // Otherwise return the immediate containing form
      return new (sel.constructor as any)(start, end);
    }
    
    // Return the containing form
    return new (sel.constructor as any)(start, end);
  });
  
  doc.selections = newSelections;
}

/**
 * Contract selection to the first child sexp
 * @param doc - the editable document
 */
export function sexpRangeContraction(doc: EditableDocument): void {
  const selections = doc.selections;
  const newSelections = selections.map(sel => {
    const cursor = doc.getTokenCursor(sel.start);
    
    // Skip the opening delimiter if we're on it
    const token = cursor.getToken();
    if (token && token.type === 'open') {
      cursor.next();
    }
    
    // Skip whitespace
    cursor.forwardWhitespace();
    
    // Get the range of the first child
    const [start, end] = cursor.rangeForCurrentForm(sel.start);
    
    // Only contract if the new range is smaller
    if (start >= sel.start && end <= sel.end && (start > sel.start || end < sel.end)) {
      return new (sel.constructor as any)(start, end);
    }
    
    // Can't contract, keep current selection
    return sel;
  });
  
  doc.selections = newSelections;
}

// ============================================================================
// Slurp and Barf Operations
// ============================================================================

/**
 * Slurp the next sexp into the current list (forward slurp)
 * Moves the closing delimiter past the next sexp
 * Example: (foo bar)| baz -> (foo bar baz)|
 * @param doc - the editable document
 */
export async function slurpSexpForward(doc: EditableDocument): Promise<void> {
  const sel = doc.selections[0];
  const cursor = doc.getTokenCursor(sel.active);
  
  // Check if we're on an opening delimiter
  const token = cursor.getToken();
  if (token?.type === 'open') {
    // We're on the opening delimiter, use this list
  } else {
    // Navigate to the enclosing list's opening delimiter
    if (!cursor.upList()) {
      return; // Not in a list
    }
  }
  
  // Now find the matching closing delimiter
  if (!cursor.forwardList()) {
    return; // Can't find closing delimiter
  }
  
  const closeOffset = cursor.offsetStart;
  const closeDelim = cursor.getToken()?.raw;
  
  if (!closeDelim) {
    return;
  }
  
  // Move past the closing delimiter
  if (!cursor.next()) {
    return; // Nothing after closing delimiter
  }
  
  // Skip any whitespace
  cursor.forwardWhitespace();
  
  // Check if there's a sexp to slurp
  const nextToken = cursor.getToken();
  if (!nextToken || nextToken.type === 'close' || nextToken.type === 'str-end') {
    return; // Nothing to slurp
  }
  
  // Get the end position of the next sexp
  let endOfNext: number;
  if (nextToken.type === 'open') {
    // It's a list, move to its closing delimiter
    if (!cursor.forwardList()) {
      return;
    }
    endOfNext = cursor.offsetEnd;
  } else {
    // It's an atom, get its end position
    endOfNext = cursor.offsetEnd;
  }
  
  // Get the text between the closing delimiter and end of next sexp
  const textToMove = doc.getText(closeOffset + closeDelim.length, endOfNext);
  
  // Replace: just move the closing delimiter to after the next sexp
  await doc.changeRange(closeOffset, endOfNext, textToMove + closeDelim);
  
  // Move cursor to the new position of the closing delimiter
  const newClosePos = closeOffset + textToMove.length;
  doc.selections = [new (sel.constructor as any)(newClosePos, newClosePos)];
}

/**
 * Slurp the previous sexp into the current list (backward slurp)
 * Moves the opening delimiter before the previous sexp
 * Example: foo (bar)| -> (foo bar)|
 * @param doc - the editable document
 */
export async function slurpSexpBackward(doc: EditableDocument): Promise<void> {
  const sel = doc.selections[0];
  const cursor = doc.getTokenCursor(sel.active);
  
  // Check if we're on an opening delimiter
  const token = cursor.getToken();
  if (token?.type === 'open') {
    // We're on the opening delimiter, use this list
  } else {
    // Navigate to the enclosing list's opening delimiter
    if (!cursor.upList()) {
      return; // Not in a list
    }
  }
  
  const openOffset = cursor.offsetStart;
  const openDelim = cursor.getToken()?.raw;
  
  if (!openDelim) {
    return;
  }
  
  // Move before the opening delimiter
  if (!cursor.previous()) {
    return; // Nothing before opening delimiter
  }
  
  // Skip whitespace backward
  while (cursor.isWhitespace()) {
    if (!cursor.previous()) {
      return; // Only whitespace before, nothing to slurp
    }
  }
  
  // Check if there's a sexp to slurp
  const prevToken = cursor.getToken();
  if (!prevToken || prevToken.type === 'open') {
    return; // Nothing to slurp
  }
  
  // Get the start position of the previous sexp
  let startOfPrev: number;
  if (prevToken.type === 'close' || prevToken.type === 'str-end') {
    // It's a list, move to its opening delimiter
    if (!cursor.backwardList()) {
      return;
    }
    startOfPrev = cursor.offsetStart;
  } else {
    // It's an atom - we're already at it, just get its start position
    startOfPrev = cursor.offsetStart;
  }
  
  // Get the text from start of previous sexp to the opening delimiter
  const textToMove = doc.getText(startOfPrev, openOffset);
  
  // Replace: move opening delimiter to before the previous sexp
  await doc.changeRange(startOfPrev, openOffset + openDelim.length, openDelim + textToMove);
  
  // Move cursor to the new position of the opening delimiter
  const newOpenPos = startOfPrev;
  doc.selections = [new (sel.constructor as any)(newOpenPos, newOpenPos)];
}

/**
 * Barf the last sexp out of the current list (forward barf)
 * Moves the closing delimiter to after the second-to-last sexp
 * Example: (foo bar baz) -> (foo bar) baz
 * @param doc - the editable document
 */
export async function barfSexpForward(doc: EditableDocument): Promise<void> {
  const sel = doc.selections[0];
  const cursor = doc.getTokenCursor(sel.active);
  
  // Check if we're on an opening delimiter
  const token = cursor.getToken();
  if (token?.type === 'open') {
    // We're on the opening delimiter, use this list
  } else {
    // Navigate to the enclosing list's opening delimiter
    if (!cursor.upList()) {
      return; // Not in a list
    }
  }
  
  // Move to the closing delimiter
  if (!cursor.forwardList()) {
    return;
  }
  
  const closeOffset = cursor.offsetStart;
  const closeDelim = cursor.getToken()?.raw;
  
  if (!closeDelim) {
    return;
  }
  
  // Move back one token (should be before the closing delimiter)
  if (!cursor.previous()) {
    return; // Empty list
  }
  
  // Skip whitespace backward to get to the last sexp
  while (cursor.isWhitespace()) {
    if (!cursor.previous()) {
      return; // Only whitespace
    }
  }
  
  // Now we're at the end of the last sexp
  // If it's a closing paren, we need to find its matching opening paren
  const lastToken = cursor.getToken();
  if (lastToken?.type === 'close') {
    // It's a list - move to its opening paren
    if (!cursor.backwardList()) {
      return;
    }
  }
  
  // Now cursor is at the start of the last sexp (either an atom or opening paren of a list)
  // Move back to find where the previous sexp ends
  if (!cursor.previous()) {
    return; // Only one element
  }
  
  // Skip whitespace backward
  while (cursor.isWhitespace()) {
    if (!cursor.previous()) {
      return; // Only one element
    }
  }
  
  // Now we're at the second-to-last sexp
  // The closing delimiter should go after this sexp ends
  const newClosePosition = cursor.offsetEnd;
  
  // Get the text from the new close position to the old close position (including delimiter)
  const textToMove = doc.getText(newClosePosition, closeOffset + closeDelim.length);
  
  // Replace: insert closing delimiter at new position, then the text that was between
  await doc.changeRange(newClosePosition, closeOffset + closeDelim.length, closeDelim + textToMove.substring(0, textToMove.length - closeDelim.length));
  
  // Move cursor to the new position of the closing delimiter
  doc.selections = [new (sel.constructor as any)(newClosePosition, newClosePosition)];
}

/**
 * Barf the first sexp out of the current list (backward barf)
 * Moves the opening delimiter to after the first sexp
 * Example: (foo bar| baz) -> foo (bar baz)
 * @param doc - the editable document
 */
export async function barfSexpBackward(doc: EditableDocument): Promise<void> {
  const sel = doc.selections[0];
  const cursor = doc.getTokenCursor(sel.active);
  
  // Check if we're on an opening delimiter
  const token = cursor.getToken();
  if (token?.type === 'open') {
    // We're on the opening delimiter, use this list
  } else {
    // Navigate to the enclosing list's opening delimiter
    if (!cursor.upList()) {
      return; // Not in a list
    }
  }
  
  const openOffset = cursor.offsetStart;
  const openDelim = cursor.getToken()?.raw;
  
  if (!openDelim) {
    return;
  }
  
  // Move past the opening delimiter
  if (!cursor.next()) {
    return; // Empty list
  }
  
  // Skip whitespace forward to get to the first sexp
  while (cursor.isWhitespace()) {
    if (!cursor.next()) {
      return; // Only whitespace
    }
  }
  
  // Now we're at the start of the first sexp
  // If it's an opening paren, we need to find its matching closing paren
  const firstToken = cursor.getToken();
  if (firstToken?.type === 'open') {
    // It's a list - move to its closing paren
    if (!cursor.forwardList()) {
      return;
    }
  }
  
  // Now cursor is at the end of the first sexp (either an atom or closing paren of a list)
  // Move forward to find where the second sexp starts
  if (!cursor.next()) {
    return; // Only one element
  }
  
  // Skip whitespace forward
  while (cursor.isWhitespace()) {
    if (!cursor.next()) {
      return; // Only one element
    }
  }
  
  // Now we're at the second sexp
  // The opening delimiter should go right before this position
  const newOpenPosition = cursor.offsetStart;
  
  // Get the text from the opening delimiter to the new position
  const textToMove = doc.getText(openOffset, newOpenPosition);
  
  // Replace: move the first sexp before the opening delimiter
  await doc.changeRange(openOffset, newOpenPosition, textToMove.substring(openDelim.length) + openDelim);
  
  // Move cursor to the new position of the opening delimiter
  const newOpenPos = openOffset + textToMove.length - openDelim.length;
  doc.selections = [new (sel.constructor as any)(newOpenPos, newOpenPos)];
}

// ============================================================================
// Raise, Splice, and Wrap Operations
// ============================================================================

/**
 * Raise the current sexp, replacing its parent with it
 * @param doc - the editable document
 */
export async function raiseSexp(doc: EditableDocument): Promise<void> {
  const sel = doc.selections[0];
  const cursor = doc.getTokenCursor(sel.active);
  
  // Get the current sexp range
  const [currentStart, currentEnd] = cursor.rangeForCurrentForm(sel.active);
  const currentText = doc.getText(currentStart, currentEnd);
  
  // Find the parent list
  if (!cursor.upList()) {
    return; // Not in a list
  }
  
  // Get the parent range - use cursor's current position after upList
  const [parentStart, parentEnd] = cursor.rangeForCurrentForm(cursor.offsetStart);
  
  // Replace the parent with the current sexp
  await doc.changeRange(parentStart, parentEnd, currentText);
  
  // Update cursor position to the start of the raised sexp
  doc.selections = [new (sel.constructor as any)(parentStart, parentStart)];
}

/**
 * Splice the current list, removing its delimiters
 * @param doc - the editable document
 */
export async function spliceSexp(doc: EditableDocument): Promise<void> {
  const sel = doc.selections[0];
  const cursor = doc.getTokenCursor(sel.active);
  
  // Find the opening delimiter of the current list
  if (!cursor.upList()) {
    return; // Not in a list
  }
  
  const openOffset = cursor.offsetStart;
  const openDelim = cursor.getToken()?.raw;
  
  if (!openDelim) {
    return;
  }
  
  // Find the closing delimiter
  if (!cursor.forwardList()) {
    return;
  }
  
  const closeOffset = cursor.offsetStart;
  const closeDelim = cursor.getToken()?.raw;
  
  if (!closeDelim) {
    return;
  }
  
  // Get the content between delimiters
  const content = doc.getText(openOffset + openDelim.length, closeOffset);
  
  // Replace the entire list with just the content
  await doc.changeRange(openOffset, closeOffset + closeDelim.length, content);
  
  // Update cursor position - adjust for removed opening delimiter
  // If cursor was after the opening delimiter, move it back by the delimiter length
  let newCursorPos = sel.active;
  if (sel.active > openOffset) {
    newCursorPos = sel.active - openDelim.length;
  }
  doc.selections = [new (sel.constructor as any)(newCursorPos, newCursorPos)];
}

/**
 * Wrap the current sexp with delimiters
 * @param doc - the editable document
 * @param open - opening delimiter (default: '(')
 * @param close - closing delimiter (default: ')')
 */
export async function wrapSexp(doc: EditableDocument, open: string = '(', close: string = ')'): Promise<void> {
  const sel = doc.selections[0];
  const cursor = doc.getTokenCursor(sel.active);
  
  // Get the current sexp range
  const [start, end] = cursor.rangeForCurrentForm(sel.active);
  const text = doc.getText(start, end);
  
  // Wrap it
  await doc.changeRange(start, end, open + text + close);
  
  // Update cursor position - move after the wrapped sexp
  const newCursorPos = start + open.length + text.length;
  doc.selections = [new (sel.constructor as any)(newCursorPos, newCursorPos)];
}

// ============================================================================
// Kill and Copy Operations
// ============================================================================

/**
 * Kill (cut) the sexp at the given range
 * @param doc - the editable document
 * @param start - start offset
 * @param end - end offset
 */
export async function killRange(doc: EditableDocument, start: number, end: number): Promise<void> {
  // Copy to clipboard (VS Code API would be used here)
  // For now, just delete
  await doc.deleteRange(start, end);
  
  // Update cursor position to the start of the deleted range
  const sel = doc.selections[0];
  doc.selections = [new (sel.constructor as any)(start, start)];
}

/**
 * Copy the sexp at the given range to clipboard
 * @param doc - the editable document
 * @param start - start offset
 * @param end - end offset
 */
export async function copyRangeToClipboard(_doc: EditableDocument, _start: number, _end: number): Promise<void> {
  // In a real implementation, this would use VS Code's clipboard API
  // For now, this is a placeholder
  // The text would be: doc.getText(start, end)
}

/**
 * Kill forward sexp from cursor
 * @param doc - the editable document
 */
export async function killForwardSexp(doc: EditableDocument): Promise<void> {
  const sel = doc.selections[0];
  const [_, end] = forwardSexpRange(doc, sel.active);
  
  if (end > sel.active) {
    await killRange(doc, sel.active, end);
  }
}

/**
 * Kill backward sexp from cursor
 * @param doc - the editable document
 */
export async function killBackwardSexp(doc: EditableDocument): Promise<void> {
  const sel = doc.selections[0];
  const [start, _] = backwardSexpRange(doc, sel.active);
  
  if (start < sel.active) {
    await killRange(doc, start, sel.active);
  }
}

/**
 * Copy current sexp to clipboard
 * @param doc - the editable document
 */
export async function copySexp(doc: EditableDocument): Promise<void> {
  const sel = doc.selections[0];
  const cursor = doc.getTokenCursor(sel.active);
  const [start, end] = cursor.rangeForCurrentForm(sel.active);
  
  await copyRangeToClipboard(doc, start, end);
}

// ============================================================================
// Transpose Operation
// ============================================================================

/**
 * Transpose (swap) the current sexp with the next one
 * @param doc - the editable document
 */
export async function transposeSexp(doc: EditableDocument): Promise<void> {
  const sel = doc.selections[0];
  
  // Get the cursor and check what we're at
  let cursor = doc.getTokenCursor(sel.active);
  let token = cursor.getToken();
  
  // If we're on whitespace, move backward to the previous sexp
  if (token && (token.type === 'ws' || token.type === 'ws-nl')) {
    if (!cursor.backwardSexp()) {
      return; // No previous sexp
    }
  }
  
  // Now get the current sexp
  const [currentStart, currentEnd] = cursor.rangeForCurrentForm(cursor.offsetStart);
  const currentText = doc.getText(currentStart, currentEnd);
  
  // Find the next sexp and the whitespace between them
  // We need to start from currentEnd and move forward
  const nextCursor = doc.getTokenCursor(currentEnd);
  
  // Make sure we're actually past the current sexp
  // If the cursor is still at or before currentEnd, move it forward
  while (nextCursor.offsetStart < currentEnd && nextCursor.next()) {
    // Keep moving until we're past currentEnd
  }
  
  const wsStart = currentEnd;
  nextCursor.forwardWhitespace();
  const wsEnd = nextCursor.offsetStart;
  const whitespaceBetween = doc.getText(wsStart, wsEnd);
  
  // Get the next sexp
  const [nextStart, nextEnd] = nextCursor.rangeForCurrentForm(nextCursor.offsetStart);
  const nextText = doc.getText(nextStart, nextEnd);
  
  if (!nextText || nextStart === nextEnd) {
    return; // No next sexp
  }
  
  // Swap them: nextText + whitespace + currentText
  await doc.changeRange(currentStart, nextEnd, nextText + whitespaceBetween + currentText);
  
  // Update cursor position to after the transposed current sexp
  const newCursorPos = currentStart + nextText.length + whitespaceBetween.length + currentText.length;
  doc.selections = [new (sel.constructor as any)(newCursorPos, newCursorPos)];
}
