/**
 * Command handlers for paredit operations
 * These are thin wrappers that call paredit functions with the appropriate parameters
 */

import * as vscode from 'vscode';
import { EditableDocument } from './cursor-doc/model';
import * as paredit from './paredit';

/**
 * Get the multicursor configuration setting
 */
function isMulticursorEnabled(): boolean {
  const config = vscode.workspace.getConfiguration('paredit');
  return config.get<boolean>('multicursor', false);
}

// ============================================================================
// Navigation Command Handlers
// ============================================================================

/**
 * Move cursor forward one sexp
 */
export function forwardSexp(doc: EditableDocument): void {
  const isMulti = isMulticursorEnabled();
  const selections = isMulti ? doc.selections : [doc.selections[0]];
  
  const newSelections = selections.map(sel => {
    const [_, end] = paredit.forwardSexpRange(doc, sel.active);
    return new (sel.constructor as any)(end, end);
  });
  
  doc.selections = newSelections;
}

/**
 * Move cursor backward one sexp
 */
export function backwardSexp(doc: EditableDocument): void {
  const isMulti = isMulticursorEnabled();
  const selections = isMulti ? doc.selections : [doc.selections[0]];
  
  const newSelections = selections.map(sel => {
    const [start, _] = paredit.backwardSexpRange(doc, sel.active);
    return new (sel.constructor as any)(start, start);
  });
  
  doc.selections = newSelections;
}

/**
 * Move cursor forward and up (to end of parent list)
 */
export function forwardUpSexp(doc: EditableDocument): void {
  const isMulti = isMulticursorEnabled();
  const selections = isMulti ? doc.selections : [doc.selections[0]];
  
  const newSelections = selections.map(sel => {
    const [_, end] = paredit.rangeToForwardUpList(doc, sel.active);
    return new (sel.constructor as any)(end, end);
  });
  
  doc.selections = newSelections;
}

/**
 * Move cursor backward and up (to start of parent list)
 */
export function backwardUpSexp(doc: EditableDocument): void {
  const isMulti = isMulticursorEnabled();
  const selections = isMulti ? doc.selections : [doc.selections[0]];
  
  const newSelections = selections.map(sel => {
    const [start, _] = paredit.rangeToBackwardUpList(doc, sel.active);
    return new (sel.constructor as any)(start, start);
  });
  
  doc.selections = newSelections;
}

/**
 * Move cursor forward and down (into first child list)
 */
export function forwardDownSexp(doc: EditableDocument): void {
  const isMulti = isMulticursorEnabled();
  const selections = isMulti ? doc.selections : [doc.selections[0]];
  
  const newSelections = selections.map(sel => {
    const [_, end] = paredit.rangeToForwardDownList(doc, sel.active);
    return new (sel.constructor as any)(end, end);
  });
  
  doc.selections = newSelections;
}

/**
 * Move cursor backward and down (into child list from end)
 */
export function backwardDownSexp(doc: EditableDocument): void {
  const isMulti = isMulticursorEnabled();
  const selections = isMulti ? doc.selections : [doc.selections[0]];
  
  const newSelections = selections.map(sel => {
    const [start, _] = paredit.rangeToBackwardDownList(doc, sel.active);
    return new (sel.constructor as any)(start, start);
  });
  
  doc.selections = newSelections;
}

/**
 * Move cursor forward one sexp, or up if at the end of a list
 */
export function forwardSexpOrUp(doc: EditableDocument): void {
  const isMulti = isMulticursorEnabled();
  const selections = isMulti ? doc.selections : [doc.selections[0]];
  
  const newSelections = selections.map(sel => {
    const [_, end] = paredit.forwardSexpOrUpRange(doc, sel.active);
    return new (sel.constructor as any)(end, end);
  });
  
  doc.selections = newSelections;
}

/**
 * Move cursor backward one sexp, or up if at the start of a list
 */
export function backwardSexpOrUp(doc: EditableDocument): void {
  const isMulti = isMulticursorEnabled();
  const selections = isMulti ? doc.selections : [doc.selections[0]];
  
  const newSelections = selections.map(sel => {
    const [start, _] = paredit.backwardSexpOrUpRange(doc, sel.active);
    return new (sel.constructor as any)(start, start);
  });
  
  doc.selections = newSelections;
}


// ============================================================================
// Selection Command Handlers
// ============================================================================

/**
 * Select the current form (sexp) at the cursor position
 */
export function selectCurrentForm(doc: EditableDocument): void {
  paredit.selectCurrentForm(doc);
}

/**
 * Select forward one sexp from cursor
 */
export function selectForwardSexp(doc: EditableDocument): void {
  paredit.selectForwardSexp(doc);
}

/**
 * Select backward one sexp from cursor
 */
export function selectBackwardSexp(doc: EditableDocument): void {
  paredit.selectBackwardSexp(doc);
}

/**
 * Select forward and up (to end of parent list)
 */
export function selectForwardUpSexp(doc: EditableDocument): void {
  paredit.selectForwardUpSexp(doc);
}

/**
 * Select backward and up (to start of parent list)
 */
export function selectBackwardUpSexp(doc: EditableDocument): void {
  paredit.selectBackwardUpSexp(doc);
}

/**
 * Select forward and down (into first child list)
 */
export function selectForwardDownSexp(doc: EditableDocument): void {
  paredit.selectForwardDownSexp(doc);
}

/**
 * Select backward and down (into child list from end)
 */
export function selectBackwardDownSexp(doc: EditableDocument): void {
  paredit.selectBackwardDownSexp(doc);
}

/**
 * Expand selection to include the next outer sexp
 */
export function expandSelection(doc: EditableDocument): void {
  paredit.sexpRangeExpansion(doc);
}

/**
 * Contract selection to the first child sexp
 */
export function contractSelection(doc: EditableDocument): void {
  paredit.sexpRangeContraction(doc);
}

/**
 * Select the top-level form (defun) at the cursor position
 */
export function selectDefun(doc: EditableDocument): void {
  const sel = doc.selections[0];
  const cursor = doc.getTokenCursor(sel.active);
  const [start, end] = cursor.rangeForDefun(sel.active);
  
  doc.selections = [new (sel.constructor as any)(start, end)];
}


// ============================================================================
// Manipulation Command Handlers
// ============================================================================

/**
 * Slurp the next sexp into the current list (forward slurp)
 */
export async function slurpForward(doc: EditableDocument): Promise<void> {
  await paredit.slurpSexpForward(doc);
}

/**
 * Slurp the previous sexp into the current list (backward slurp)
 */
export async function slurpBackward(doc: EditableDocument): Promise<void> {
  await paredit.slurpSexpBackward(doc);
}

/**
 * Barf the last sexp out of the current list (forward barf)
 */
export async function barfForward(doc: EditableDocument): Promise<void> {
  await paredit.barfSexpForward(doc);
}

/**
 * Barf the first sexp out of the current list (backward barf)
 */
export async function barfBackward(doc: EditableDocument): Promise<void> {
  await paredit.barfSexpBackward(doc);
}

/**
 * Raise the current sexp, replacing its parent with it
 */
export async function raiseSexp(doc: EditableDocument): Promise<void> {
  await paredit.raiseSexp(doc);
}

/**
 * Splice the current list, removing its delimiters
 */
export async function spliceSexp(doc: EditableDocument): Promise<void> {
  await paredit.spliceSexp(doc);
}

/**
 * Wrap the current sexp with parentheses
 */
export async function wrapWithParen(doc: EditableDocument): Promise<void> {
  await paredit.wrapSexp(doc, '(', ')');
}

/**
 * Wrap the current sexp with square brackets
 */
export async function wrapWithBracket(doc: EditableDocument): Promise<void> {
  await paredit.wrapSexp(doc, '[', ']');
}

/**
 * Wrap the current sexp with curly braces
 */
export async function wrapWithBrace(doc: EditableDocument): Promise<void> {
  await paredit.wrapSexp(doc, '{', '}');
}

/**
 * Transpose (swap) the current sexp with the next one
 */
export async function transposeSexp(doc: EditableDocument): Promise<void> {
  await paredit.transposeSexp(doc);
}


// ============================================================================
// Clipboard Command Handlers
// ============================================================================

/**
 * Kill (cut) forward sexp from cursor
 */
export async function killForwardSexp(doc: EditableDocument): Promise<void> {
  const config = vscode.workspace.getConfiguration('paredit');
  const killAlsoCutsToClipboard = config.get<boolean>('killAlsoCutsToClipboard', true);
  
  const sel = doc.selections[0];
  const [_, end] = paredit.forwardSexpRange(doc, sel.active);
  
  if (end > sel.active) {
    const text = doc.getText(sel.active, end);
    
    if (killAlsoCutsToClipboard) {
      await vscode.env.clipboard.writeText(text);
    }
    
    await paredit.killRange(doc, sel.active, end);
  }
}

/**
 * Kill (cut) backward sexp from cursor
 */
export async function killBackwardSexp(doc: EditableDocument): Promise<void> {
  const config = vscode.workspace.getConfiguration('paredit');
  const killAlsoCutsToClipboard = config.get<boolean>('killAlsoCutsToClipboard', true);
  
  const sel = doc.selections[0];
  const [start, _] = paredit.backwardSexpRange(doc, sel.active);
  
  if (start < sel.active) {
    const text = doc.getText(start, sel.active);
    
    if (killAlsoCutsToClipboard) {
      await vscode.env.clipboard.writeText(text);
    }
    
    await paredit.killRange(doc, start, sel.active);
  }
}

/**
 * Kill (cut) the current sexp
 */
export async function killSexp(doc: EditableDocument): Promise<void> {
  const config = vscode.workspace.getConfiguration('paredit');
  const killAlsoCutsToClipboard = config.get<boolean>('killAlsoCutsToClipboard', true);
  
  const sel = doc.selections[0];
  const cursor = doc.getTokenCursor(sel.active);
  const [start, end] = cursor.rangeForCurrentForm(sel.active);
  
  const text = doc.getText(start, end);
  
  if (killAlsoCutsToClipboard) {
    await vscode.env.clipboard.writeText(text);
  }
  
  await paredit.killRange(doc, start, end);
}

/**
 * Copy the current sexp to clipboard
 */
export async function copySexp(doc: EditableDocument): Promise<void> {
  const sel = doc.selections[0];
  const cursor = doc.getTokenCursor(sel.active);
  const [start, end] = cursor.rangeForCurrentForm(sel.active);
  
  const text = doc.getText(start, end);
  await vscode.env.clipboard.writeText(text);
}

/**
 * Copy forward sexp to clipboard
 */
export async function copyForwardSexp(doc: EditableDocument): Promise<void> {
  const sel = doc.selections[0];
  const [_, end] = paredit.forwardSexpRange(doc, sel.active);
  
  if (end > sel.active) {
    const text = doc.getText(sel.active, end);
    await vscode.env.clipboard.writeText(text);
  }
}

/**
 * Copy backward sexp to clipboard
 */
export async function copyBackwardSexp(doc: EditableDocument): Promise<void> {
  const sel = doc.selections[0];
  const [start, _] = paredit.backwardSexpRange(doc, sel.active);
  
  if (start < sel.active) {
    const text = doc.getText(start, sel.active);
    await vscode.env.clipboard.writeText(text);
  }
}

/**
 * Kill (cut) forward up to closing delimiter (not including delimiter)
 */
export async function killForwardUpSexp(doc: EditableDocument): Promise<void> {
  const sel = doc.selections[0];
  const [_, end] = paredit.rangeToForwardUpList(doc, sel.active);
  
  if (end > sel.active) {
    await paredit.killRange(doc, sel.active, end);
  }
}

/**
 * Kill (cut) backward up to opening delimiter (not including delimiter)
 */
export async function killBackwardUpSexp(doc: EditableDocument): Promise<void> {
  const sel = doc.selections[0];
  const cursor = doc.getTokenCursor(sel.active);
  
  // Move up to parent opening delimiter
  if (cursor.upList()) {
    // Use offsetEnd to exclude the opening delimiter
    const startAfterDelimiter = cursor.offsetEnd;
    if (startAfterDelimiter < sel.active) {
      await paredit.killRange(doc, startAfterDelimiter, sel.active);
    }
  }
}

/**
 * Copy forward up to closing delimiter (not including delimiter)
 */
export async function copyForwardUpSexp(doc: EditableDocument): Promise<void> {
  const sel = doc.selections[0];
  const [_, end] = paredit.rangeToForwardUpList(doc, sel.active);
  
  if (end > sel.active) {
    const text = doc.getText(sel.active, end);
    await vscode.env.clipboard.writeText(text);
  }
}

/**
 * Copy backward up to opening delimiter (not including delimiter)
 */
export async function copyBackwardUpSexp(doc: EditableDocument): Promise<void> {
  const sel = doc.selections[0];
  const cursor = doc.getTokenCursor(sel.active);
  
  // Move up to parent opening delimiter
  if (cursor.upList()) {
    // Use offsetEnd to exclude the opening delimiter
    const startAfterDelimiter = cursor.offsetEnd;
    if (startAfterDelimiter < sel.active) {
      const text = doc.getText(startAfterDelimiter, sel.active);
      await vscode.env.clipboard.writeText(text);
    }
  }
}

