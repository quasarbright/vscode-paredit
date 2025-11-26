/**
 * Document model for structural editing
 * Provides line-based document representation with tokenization caching
 */

import { Scanner, ScannerState } from './lexer';
import { TextLine, LispTokenCursor } from './token-cursor';

/**
 * LineInputModel maintains a tokenized representation of a document
 * with caching for performance
 */
export class LineInputModel {
  private lines: TextLine[];
  private scanner: Scanner;
  private documentVersion: number;

  constructor(text: string, scanner?: Scanner) {
    this.scanner = scanner || new Scanner();
    this.documentVersion = 0;
    this.lines = this.tokenizeDocument(text);
  }

  /**
   * Tokenize the entire document into lines with tokens
   */
  private tokenizeDocument(text: string): TextLine[] {
    const lineStrings = text.split(/\r?\n/);
    const lines: TextLine[] = [];
    let state: ScannerState = { inString: false };

    for (const lineText of lineStrings) {
      const startState = { ...state };
      const tokens = this.scanner.processLine(lineText, startState);
      
      // Determine end state from last token
      const endState = tokens.length > 0 
        ? { ...tokens[tokens.length - 1].state }
        : { ...startState };

      lines.push({
        tokens,
        text: lineText,
        startState,
        endState
      });

      state = endState;
    }

    return lines;
  }

  /**
   * Get the absolute offset for the start of a given line
   * @param line - zero-based line number
   * @returns offset in the document
   */
  getOffsetForLine(line: number): number {
    if (line < 0 || line > this.lines.length) {
      return 0;
    }

    let offset = 0;
    for (let i = 0; i < line; i++) {
      offset += this.lines[i].text.length;
      offset += 1; // newline character
    }

    return offset;
  }

  /**
   * Get text between two offsets
   * @param start - start offset
   * @param end - end offset
   * @returns the text in the range
   */
  getText(start: number, end: number): string {
    const startPos = this.offsetToPosition(start);
    const endPos = this.offsetToPosition(end);

    if (startPos.line === endPos.line) {
      // Same line
      return this.lines[startPos.line].text.substring(startPos.character, endPos.character);
    }

    // Multiple lines
    let text = this.lines[startPos.line].text.substring(startPos.character) + '\n';
    
    for (let i = startPos.line + 1; i < endPos.line; i++) {
      text += this.lines[i].text + '\n';
    }
    
    text += this.lines[endPos.line].text.substring(0, endPos.character);
    
    return text;
  }

  /**
   * Convert an offset to a line/character position
   */
  private offsetToPosition(offset: number): { line: number; character: number } {
    let currentOffset = 0;
    
    for (let line = 0; line < this.lines.length; line++) {
      const lineLength = this.lines[line].text.length;
      
      if (currentOffset + lineLength >= offset) {
        return {
          line,
          character: offset - currentOffset
        };
      }
      
      currentOffset += lineLength + 1; // +1 for newline
    }

    // Past end of document
    const lastLine = this.lines.length - 1;
    return {
      line: lastLine,
      character: this.lines[lastLine].text.length
    };
  }

  /**
   * Get a token cursor at the specified offset
   * @param offset - document offset
   * @returns LispTokenCursor positioned at or before the offset
   */
  getTokenCursor(offset: number = 0): LispTokenCursor {
    const pos = this.offsetToPosition(offset);
    let tokenIndex = 0;

    // Find the token at or before the offset
    if (pos.line < this.lines.length) {
      const tokens = this.lines[pos.line].tokens;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].offset <= pos.character) {
          tokenIndex = i;
        } else {
          break;
        }
      }
    }

    return new LispTokenCursor(this.lines, pos.line, tokenIndex, this.scanner);
  }

  /**
   * Get all lines
   */
  getLines(): TextLine[] {
    return this.lines;
  }

  /**
   * Get the document version (increments on edits)
   */
  getVersion(): number {
    return this.documentVersion;
  }

  /**
   * Update the model with new text (invalidates cache)
   */
  update(text: string): void {
    this.lines = this.tokenizeDocument(text);
    this.documentVersion++;
  }

  /**
   * Get the total length of the document in characters
   */
  getLength(): number {
    let length = 0;
    for (let i = 0; i < this.lines.length; i++) {
      length += this.lines[i].text.length;
      if (i < this.lines.length - 1) {
        length += 1; // newline
      }
    }
    return length;
  }
}


/**
 * Represents a selection or cursor position in the document
 */
export class ModelEditSelection {
  constructor(
    public anchor: number,
    public active: number
  ) {}

  /**
   * Get the start of the selection (minimum of anchor and active)
   */
  get start(): number {
    return Math.min(this.anchor, this.active);
  }

  /**
   * Get the end of the selection (maximum of anchor and active)
   */
  get end(): number {
    return Math.max(this.anchor, this.active);
  }

  /**
   * Check if selection is reversed (anchor > active)
   */
  get isReversed(): boolean {
    return this.anchor > this.active;
  }

  /**
   * Get selection as a range [start, end]
   */
  get asRange(): [number, number] {
    return [this.start, this.end];
  }

  /**
   * Get selection as a directed range [anchor, active]
   */
  get asDirectedRange(): [number, number] {
    return [this.anchor, this.active];
  }

  /**
   * Check if this is a cursor (zero-width selection)
   */
  get isCursor(): boolean {
    return this.anchor === this.active;
  }
}

/**
 * Represents an edit operation on the document
 */
export type ModelEditFunction = 'insertString' | 'changeRange' | 'deleteRange';

export interface ModelEditOptions {
  selection?: ModelEditSelection;
  skipFormat?: boolean;
  undoStopBefore?: boolean;
  undoStopAfter?: boolean;
}

export class ModelEdit {
  constructor(
    public editFn: ModelEditFunction,
    public args: any[]
  ) {}
}

/**
 * EditableDocument wraps a VS Code TextEditor and provides
 * structural editing operations
 */
export class EditableDocument {
  private model: LineInputModel;
  private editor: any; // VS Code TextEditor
  private _selections: ModelEditSelection[];

  constructor(editor: any) {
    this.editor = editor;
    const text = editor.document.getText();
    this.model = new LineInputModel(text);
    this._selections = this.convertSelections(editor.selections);
  }

  /**
   * Convert VS Code selections to ModelEditSelections
   */
  private convertSelections(vscodeSelections: any[]): ModelEditSelection[] {
    return vscodeSelections.map(sel => {
      const anchor = this.editor.document.offsetAt(sel.anchor);
      const active = this.editor.document.offsetAt(sel.active);
      return new ModelEditSelection(anchor, active);
    });
  }

  /**
   * Convert offset to VS Code Position
   */
  private offsetToPosition(offset: number): any {
    return this.editor.document.positionAt(offset);
  }

  /**
   * Get current selections
   */
  get selections(): ModelEditSelection[] {
    return this._selections;
  }

  /**
   * Set selections
   */
  set selections(selections: ModelEditSelection[]) {
    this._selections = selections;
    
    // Update editor selections
    const vscodeSelections = selections.map(sel => {
      const anchor = this.offsetToPosition(sel.anchor);
      const active = this.offsetToPosition(sel.active);
      return new (this.editor.selection.constructor)(anchor, active);
    });
    
    this.editor.selections = vscodeSelections;
  }

  /**
   * Get a token cursor at the specified offset
   */
  getTokenCursor(offset: number = 0): LispTokenCursor {
    return this.model.getTokenCursor(offset);
  }

  /**
   * Get the underlying model
   */
  getModel(): LineInputModel {
    return this.model;
  }

  /**
   * Apply edits to the document
   */
  async edit(edits: ModelEdit[], options: ModelEditOptions = {}): Promise<boolean> {
    const success = await this.editor.edit((editBuilder: any) => {
      for (const edit of edits) {
        switch (edit.editFn) {
          case 'insertString': {
            const [offset, text] = edit.args;
            const position = this.offsetToPosition(offset);
            editBuilder.insert(position, text);
            break;
          }
          case 'changeRange': {
            const [start, end, text] = edit.args;
            const startPos = this.offsetToPosition(start);
            const endPos = this.offsetToPosition(end);
            // Create a Range using the same constructor as the selection
            // In VS Code, Selection extends Range, so we can use the selection's constructor
            const range = new (this.editor.selection.constructor as any)(startPos, endPos);
            editBuilder.replace(range, text);
            break;
          }
          case 'deleteRange': {
            const [start, end] = edit.args;
            const startPos = this.offsetToPosition(start);
            const endPos = this.offsetToPosition(end);
            // Create a Range using the same constructor as the selection
            const range = new (this.editor.selection.constructor as any)(startPos, endPos);
            editBuilder.delete(range);
            break;
          }
        }
      }
    }, {
      undoStopBefore: options.undoStopBefore ?? true,
      undoStopAfter: options.undoStopAfter ?? true
    });

    if (success) {
      // Update model with new text
      const newText = this.editor.document.getText();
      this.model.update(newText);
      
      // Update selections
      this._selections = this.convertSelections(this.editor.selections);
    }

    return success;
  }

  /**
   * Insert text at the specified offset
   */
  async insertString(offset: number, text: string): Promise<boolean> {
    return this.edit([new ModelEdit('insertString', [offset, text])]);
  }

  /**
   * Replace text in a range
   */
  async changeRange(start: number, end: number, text: string): Promise<boolean> {
    return this.edit([new ModelEdit('changeRange', [start, end, text])]);
  }

  /**
   * Delete text in a range
   */
  async deleteRange(start: number, end: number): Promise<boolean> {
    return this.edit([new ModelEdit('deleteRange', [start, end])]);
  }

  /**
   * Get text from the document
   */
  getText(start: number, end: number): string {
    return this.model.getText(start, end);
  }

  /**
   * Get the document length
   */
  getLength(): number {
    return this.model.getLength();
  }
}
