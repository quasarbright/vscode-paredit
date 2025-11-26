/**
 * Tests for EditableDocument
 */

import { EditableDocument, ModelEditSelection, ModelEdit } from '../src/cursor-doc/model';

/**
 * Mock VS Code types for testing
 */
class MockPosition {
  constructor(public line: number, public character: number) {}
}

class MockRange {
  constructor(public start: MockPosition, public end: MockPosition) {}
}

class MockSelection {
  constructor(public anchor: MockPosition, public active: MockPosition) {}
  
  // Selection extends Range in VS Code, so it has start and end properties
  get start(): MockPosition {
    return this.anchor.line < this.active.line || 
           (this.anchor.line === this.active.line && this.anchor.character <= this.active.character)
      ? this.anchor
      : this.active;
  }
  
  get end(): MockPosition {
    return this.anchor.line > this.active.line || 
           (this.anchor.line === this.active.line && this.anchor.character > this.active.character)
      ? this.anchor
      : this.active;
  }
}

// Attach Range as a static property
(MockSelection as any).Range = MockRange;

class MockDocument {
  private text: string;
  
  constructor(text: string) {
    this.text = text;
  }

  getText(): string {
    return this.text;
  }

  setText(text: string): void {
    this.text = text;
  }

  offsetAt(position: MockPosition): number {
    const lines = this.text.split('\n');
    let offset = 0;
    
    for (let i = 0; i < position.line && i < lines.length; i++) {
      offset += lines[i].length + 1; // +1 for newline
    }
    
    offset += position.character;
    return offset;
  }

  positionAt(offset: number): MockPosition {
    const lines = this.text.split('\n');
    let currentOffset = 0;
    
    for (let line = 0; line < lines.length; line++) {
      const lineLength = lines[line].length;
      
      if (currentOffset + lineLength >= offset) {
        return new MockPosition(line, offset - currentOffset);
      }
      
      currentOffset += lineLength + 1; // +1 for newline
    }

    // Past end of document
    const lastLine = lines.length - 1;
    return new MockPosition(lastLine, lines[lastLine].length);
  }
}

class MockEditBuilder {
  public operations: Array<{ type: string; args: any[] }> = [];

  insert(position: MockPosition, text: string): void {
    this.operations.push({ type: 'insert', args: [position, text] });
  }

  replace(range: MockRange, text: string): void {
    this.operations.push({ type: 'replace', args: [range, text] });
  }

  delete(range: MockRange): void {
    this.operations.push({ type: 'delete', args: [range] });
  }
}

class MockTextEditor {
  public document: MockDocument;
  public selections: MockSelection[];
  public selection: MockSelection;

  constructor(text: string, selections?: MockSelection[]) {
    this.document = new MockDocument(text);
    this.selections = selections || [
      new MockSelection(new MockPosition(0, 0), new MockPosition(0, 0))
    ];
    // Create a dummy selection to provide access to the constructor
    this.selection = new MockSelection(new MockPosition(0, 0), new MockPosition(0, 0));
  }

  async edit(
    callback: (editBuilder: MockEditBuilder) => void,
    _options?: any
  ): Promise<boolean> {
    const builder = new MockEditBuilder();
    callback(builder);

    // Apply edits to document
    let text = this.document.getText();
    
    // Sort operations by position (reverse order to maintain offsets)
    const ops = builder.operations.reverse();
    
    for (const op of ops) {
      if (op.type === 'insert') {
        const [position, insertText] = op.args;
        const offset = this.document.offsetAt(position);
        text = text.slice(0, offset) + insertText + text.slice(offset);
      } else if (op.type === 'replace') {
        const [range, replaceText] = op.args;
        const start = this.document.offsetAt(range.start);
        const end = this.document.offsetAt(range.end);
        text = text.slice(0, start) + replaceText + text.slice(end);
      } else if (op.type === 'delete') {
        const [range] = op.args;
        const start = this.document.offsetAt(range.start);
        const end = this.document.offsetAt(range.end);
        text = text.slice(0, start) + text.slice(end);
      }
    }

    this.document.setText(text);
    return true;
  }
}

describe('EditableDocument', () => {
  describe('constructor and selections', () => {
    it('should wrap a text editor', () => {
      const editor = new MockTextEditor('(foo bar)');
      const doc = new EditableDocument(editor);
      
      expect(doc.selections).toHaveLength(1);
      expect(doc.selections[0].anchor).toBe(0);
      expect(doc.selections[0].active).toBe(0);
    });

    it('should convert multiple selections', () => {
      const editor = new MockTextEditor('(foo bar)', [
        new MockSelection(new MockPosition(0, 0), new MockPosition(0, 3)),
        new MockSelection(new MockPosition(0, 5), new MockPosition(0, 8))
      ]);
      const doc = new EditableDocument(editor);
      
      expect(doc.selections).toHaveLength(2);
      expect(doc.selections[0].start).toBe(0);
      expect(doc.selections[0].end).toBe(3);
      expect(doc.selections[1].start).toBe(5);
      expect(doc.selections[1].end).toBe(8);
    });
  });

  describe('getTokenCursor', () => {
    it('should create token cursor at offset', () => {
      const editor = new MockTextEditor('(foo bar)');
      const doc = new EditableDocument(editor);
      
      const cursor = doc.getTokenCursor(1);
      const token = cursor.getToken();
      expect(token?.raw).toBe('foo');
    });

    it('should create cursor at default offset 0', () => {
      const editor = new MockTextEditor('(foo bar)');
      const doc = new EditableDocument(editor);
      
      const cursor = doc.getTokenCursor();
      const token = cursor.getToken();
      expect(token?.type).toBe('open');
    });
  });

  describe('edit operations', () => {
    it('should insert text', async () => {
      const editor = new MockTextEditor('(foo)');
      const doc = new EditableDocument(editor);
      
      await doc.insertString(4, ' bar');
      
      expect(editor.document.getText()).toBe('(foo bar)');
    });

    it('should replace text in range', async () => {
      const editor = new MockTextEditor('(foo bar)');
      const doc = new EditableDocument(editor);
      
      await doc.changeRange(1, 4, 'baz');
      
      expect(editor.document.getText()).toBe('(baz bar)');
    });

    it('should delete text in range', async () => {
      const editor = new MockTextEditor('(foo bar)');
      const doc = new EditableDocument(editor);
      
      await doc.deleteRange(4, 8);
      
      expect(editor.document.getText()).toBe('(foo)');
    });

    it('should apply multiple edits', async () => {
      const editor = new MockTextEditor('(foo bar)');
      const doc = new EditableDocument(editor);
      
      const edits = [
        new ModelEdit('insertString', [4, ' baz']),
        new ModelEdit('changeRange', [1, 4, 'qux'])
      ];
      
      await doc.edit(edits);
      
      // Note: edits are applied in reverse order in our mock
      expect(editor.document.getText()).toContain('qux');
    });
  });

  describe('getText and getLength', () => {
    it('should get text from document', () => {
      const editor = new MockTextEditor('(foo bar)');
      const doc = new EditableDocument(editor);
      
      expect(doc.getText(1, 4)).toBe('foo');
      expect(doc.getText(5, 8)).toBe('bar');
    });

    it('should get document length', () => {
      const editor = new MockTextEditor('(foo bar)');
      const doc = new EditableDocument(editor);
      
      expect(doc.getLength()).toBe(9);
    });
  });

  describe('multi-cursor support', () => {
    it('should handle multiple cursors', () => {
      const editor = new MockTextEditor('(foo bar)', [
        new MockSelection(new MockPosition(0, 1), new MockPosition(0, 4)),
        new MockSelection(new MockPosition(0, 5), new MockPosition(0, 8))
      ]);
      const doc = new EditableDocument(editor);
      
      expect(doc.selections).toHaveLength(2);
      
      // Get cursors for each selection
      const cursor1 = doc.getTokenCursor(doc.selections[0].start);
      const cursor2 = doc.getTokenCursor(doc.selections[1].start);
      
      expect(cursor1.getToken()?.raw).toBe('foo');
      expect(cursor2.getToken()?.raw).toBe('bar');
    });
  });
});

describe('ModelEditSelection', () => {
  it('should calculate start and end correctly', () => {
    const sel1 = new ModelEditSelection(5, 10);
    expect(sel1.start).toBe(5);
    expect(sel1.end).toBe(10);
    expect(sel1.isReversed).toBe(false);

    const sel2 = new ModelEditSelection(10, 5);
    expect(sel2.start).toBe(5);
    expect(sel2.end).toBe(10);
    expect(sel2.isReversed).toBe(true);
  });

  it('should detect cursor (zero-width selection)', () => {
    const cursor = new ModelEditSelection(5, 5);
    expect(cursor.isCursor).toBe(true);
    expect(cursor.start).toBe(5);
    expect(cursor.end).toBe(5);

    const selection = new ModelEditSelection(5, 10);
    expect(selection.isCursor).toBe(false);
  });

  it('should return ranges correctly', () => {
    const sel = new ModelEditSelection(10, 5);
    
    expect(sel.asRange).toEqual([5, 10]);
    expect(sel.asDirectedRange).toEqual([10, 5]);
  });
});
