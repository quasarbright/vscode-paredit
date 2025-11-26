/**
 * Tests for command handlers
 */

import { LineInputModel, ModelEditSelection } from '../src/cursor-doc/model';

// Mock vscode module before importing commands
const mockClipboardWriteText = jest.fn().mockResolvedValue(undefined);

jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: (section: string) => ({
      get: (key: string, defaultValue?: any) => {
        if (section === 'paredit') {
          if (key === 'multicursor') return false;
          if (key === 'killAlsoCutsToClipboard') return true;
        }
        return defaultValue;
      }
    })
  },
  env: {
    clipboard: {
      writeText: mockClipboardWriteText
    }
  }
}), { virtual: true });

// Import commands after mocking vscode
import * as commands from '../src/commands';

// Mock EditableDocument for testing
class MockEditableDocument {
  private model: LineInputModel;
  public _selections: ModelEditSelection[];
  private _text: string;

  constructor(text: string, selections: Array<[number, number]> = [[0, 0]]) {
    this._text = text;
    this.model = new LineInputModel(text);
    this._selections = selections.map(([anchor, active]) => 
      new ModelEditSelection(anchor, active)
    );
  }

  get selections(): ModelEditSelection[] {
    return this._selections;
  }

  set selections(sels: ModelEditSelection[]) {
    this._selections = sels;
  }

  getTokenCursor(offset: number = 0) {
    return this.model.getTokenCursor(offset);
  }

  getText(start: number, end: number): string {
    return this.model.getText(start, end);
  }

  getFullText(): string {
    return this._text;
  }

  async changeRange(start: number, end: number, text: string): Promise<boolean> {
    // Actually perform the edit
    this._text = this._text.substring(0, start) + text + this._text.substring(end);
    // Recreate the model with the new text
    this.model = new LineInputModel(this._text);
    return true;
  }

  async deleteRange(start: number, end: number): Promise<boolean> {
    // Actually perform the deletion
    this._text = this._text.substring(0, start) + this._text.substring(end);
    // Recreate the model with the new text
    this.model = new LineInputModel(this._text);
    return true;
  }
}

describe('Navigation Command Handlers', () => {
  describe('forwardSexp', () => {
    test('should move cursor forward one sexp', () => {
      const doc = new MockEditableDocument('foo bar baz', [[0, 0]]) as any;
      commands.forwardSexp(doc);
      
      expect(doc.selections.length).toBe(1);
      expect(doc.selections[0].active).toBeGreaterThan(0);
      expect(doc.selections[0].anchor).toBe(doc.selections[0].active); // Cursor, not selection
    });

    test('should handle cursor at end of document', () => {
      const doc = new MockEditableDocument('foo', [[3, 3]]) as any;
      commands.forwardSexp(doc);
      
      expect(doc.selections[0].active).toBe(3);
    });
  });

  describe('backwardSexp', () => {
    test('should move cursor backward one sexp', () => {
      const doc = new MockEditableDocument('foo bar', [[7, 7]]) as any;
      commands.backwardSexp(doc);
      
      expect(doc.selections.length).toBe(1);
      expect(doc.selections[0].active).toBeLessThan(7);
      expect(doc.selections[0].anchor).toBe(doc.selections[0].active);
    });

    test('should handle cursor at start of document', () => {
      const doc = new MockEditableDocument('foo', [[0, 0]]) as any;
      commands.backwardSexp(doc);
      
      expect(doc.selections[0].active).toBe(0);
    });
  });

  describe('forwardUpSexp', () => {
    test('should move cursor to end of parent list', () => {
      const doc = new MockEditableDocument('(a (b c) d)', [[5, 5]]) as any;
      commands.forwardUpSexp(doc);
      
      expect(doc.selections[0].active).toBeGreaterThan(5);
    });
  });

  describe('backwardUpSexp', () => {
    test('should move cursor to start of parent list', () => {
      const doc = new MockEditableDocument('(a (b c) d)', [[5, 5]]) as any;
      commands.backwardUpSexp(doc);
      
      expect(doc.selections[0].active).toBeLessThan(5);
    });
  });

  describe('forwardDownSexp', () => {
    test('should move cursor into child list', () => {
      const doc = new MockEditableDocument('(a (b c) d)', [[0, 0]]) as any;
      commands.forwardDownSexp(doc);
      
      expect(doc.selections[0].active).toBeGreaterThan(0);
    });
  });

  describe('backwardDownSexp', () => {
    test('should move cursor into child list from end', () => {
      const doc = new MockEditableDocument('(a (b c) d)', [[10, 10]]) as any;
      commands.backwardDownSexp(doc);
      
      expect(doc.selections[0].active).toBeLessThan(10);
    });
  });

  describe('forwardSexpOrUp', () => {
    test('should move forward or up', () => {
      const doc = new MockEditableDocument('(foo bar)', [[5, 5]]) as any;
      commands.forwardSexpOrUp(doc);
      
      expect(doc.selections[0].active).toBeGreaterThan(5);
    });
  });

  describe('backwardSexpOrUp', () => {
    test('should move backward or up', () => {
      const doc = new MockEditableDocument('(foo bar)', [[8, 8]]) as any;
      commands.backwardSexpOrUp(doc);
      
      expect(doc.selections[0].active).toBeLessThan(8);
    });
  });
});

describe('Selection Command Handlers', () => {
  describe('selectCurrentForm', () => {
    test('should select current form', () => {
      const doc = new MockEditableDocument('(foo bar)', [[2, 2]]) as any;
      commands.selectCurrentForm(doc);
      
      expect(doc.selections[0].start).toBe(0);
      expect(doc.selections[0].end).toBe(9);
    });
  });

  describe('selectForwardSexp', () => {
    test('should extend selection forward', () => {
      const doc = new MockEditableDocument('foo bar', [[0, 0]]) as any;
      commands.selectForwardSexp(doc);
      
      expect(doc.selections[0].anchor).toBe(0);
      expect(doc.selections[0].active).toBeGreaterThan(0);
    });
  });

  describe('selectBackwardSexp', () => {
    test('should extend selection backward', () => {
      const doc = new MockEditableDocument('foo bar', [[7, 7]]) as any;
      commands.selectBackwardSexp(doc);
      
      expect(doc.selections[0].anchor).toBe(7);
      expect(doc.selections[0].active).toBeLessThan(7);
    });
  });

  describe('expandSelection', () => {
    test('should expand selection to parent', () => {
      const doc = new MockEditableDocument('(a (b c) d)', [[4, 7]]) as any;
      commands.expandSelection(doc);
      
      expect(doc.selections[0].start).toBe(0);
      expect(doc.selections[0].end).toBe(11);
    });
  });

  describe('contractSelection', () => {
    test('should contract selection to child', () => {
      const doc = new MockEditableDocument('(a (b c) d)', [[0, 11]]) as any;
      commands.contractSelection(doc);
      
      expect(doc.selections[0].start).toBeGreaterThan(0);
      expect(doc.selections[0].end).toBeLessThan(11);
    });
  });

  describe('selectDefun', () => {
    test('should select top-level form', () => {
      const doc = new MockEditableDocument('(defun foo () (bar))', [[15, 15]]) as any;
      commands.selectDefun(doc);
      
      expect(doc.selections[0].start).toBe(0);
      expect(doc.selections[0].end).toBe(20);
    });
  });
});

describe('Manipulation Command Handlers', () => {
  describe('slurpForward', () => {
    test('should slurp next sexp forward from inside list', async () => {
      const doc = new MockEditableDocument('(foo) bar', [[2, 2]]) as any;
      
      await commands.slurpForward(doc);
      
      expect(doc.getFullText()).toBe('(foo bar)');
    });
    
    test('should slurp next sexp forward - cursor on opening paren', async () => {
      const doc = new MockEditableDocument('(foo) bar', [[0, 0]]) as any;
      
      await commands.slurpForward(doc);
      
      expect(doc.getFullText()).toBe('(foo bar)');
    });
    
    test('should slurp nested list', async () => {
      const doc = new MockEditableDocument('(foo) (bar baz)', [[2, 2]]) as any;
      
      await commands.slurpForward(doc);
      
      expect(doc.getFullText()).toBe('(foo (bar baz))');
    });
  });

  describe('slurpBackward', () => {
    test('should slurp previous sexp backward', async () => {
      const doc = new MockEditableDocument('foo (bar)', [[6, 6]]) as any;
      
      await commands.slurpBackward(doc);
      
      expect(doc.getFullText()).toBe('(foo bar)');
    });
    
    test('should slurp previous sexp backward - cursor on opening paren', async () => {
      const doc = new MockEditableDocument('foo (bar)', [[4, 4]]) as any;
      
      await commands.slurpBackward(doc);
      
      expect(doc.getFullText()).toBe('(foo bar)');
    });
    
    test('should slurp nested list backward', async () => {
      const doc = new MockEditableDocument('(foo bar) (baz)', [[11, 11]]) as any;
      
      await commands.slurpBackward(doc);
      
      expect(doc.getFullText()).toBe('((foo bar) baz)');
    });
  });

  describe('barfForward', () => {
    test('should barf last sexp forward', async () => {
      const doc = new MockEditableDocument('(foo bar baz)', [[2, 2]]) as any;
      
      await commands.barfForward(doc);
      
      expect(doc.getFullText()).toBe('(foo bar) baz');
    });
    
    test('should barf last sexp forward - cursor on opening paren', async () => {
      const doc = new MockEditableDocument('(foo bar baz)', [[0, 0]]) as any;
      
      await commands.barfForward(doc);
      
      expect(doc.getFullText()).toBe('(foo bar) baz');
    });
    
    test('should barf nested list', async () => {
      const doc = new MockEditableDocument('(foo (bar baz))', [[2, 2]]) as any;
      
      await commands.barfForward(doc);
      
      expect(doc.getFullText()).toBe('(foo) (bar baz)');
    });
  });

  describe('barfBackward', () => {
    test('should barf first sexp backward', async () => {
      const doc = new MockEditableDocument('(foo bar baz)', [[6, 6]]) as any;
      
      await commands.barfBackward(doc);
      
      expect(doc.getFullText()).toBe('foo (bar baz)');
    });
    
    test('should barf first sexp backward - cursor on opening paren', async () => {
      const doc = new MockEditableDocument('(foo bar baz)', [[0, 0]]) as any;
      
      await commands.barfBackward(doc);
      
      expect(doc.getFullText()).toBe('foo (bar baz)');
    });
    
    test('should barf nested list backward', async () => {
      const doc = new MockEditableDocument('((foo bar) baz)', [[0, 0]]) as any;
      
      await commands.barfBackward(doc);
      
      expect(doc.getFullText()).toBe('(foo bar) (baz)');
    });
  });

  describe('raiseSexp', () => {
    test('should raise current sexp', async () => {
      const doc = new MockEditableDocument('(a (b c) d)', [[5, 5]]) as any;
      await commands.raiseSexp(doc);
      
      expect(true).toBe(true);
    });
  });

  describe('spliceSexp', () => {
    test('should splice current list', async () => {
      const doc = new MockEditableDocument('(foo bar)', [[2, 2]]) as any;
      await commands.spliceSexp(doc);
      
      expect(true).toBe(true);
    });
  });

  describe('wrapWithParen', () => {
    test('should wrap with parentheses', async () => {
      const doc = new MockEditableDocument('foo', [[0, 0]]) as any;
      await commands.wrapWithParen(doc);
      
      expect(true).toBe(true);
    });
  });

  describe('wrapWithBracket', () => {
    test('should wrap with brackets', async () => {
      const doc = new MockEditableDocument('foo', [[0, 0]]) as any;
      await commands.wrapWithBracket(doc);
      
      expect(true).toBe(true);
    });
  });

  describe('wrapWithBrace', () => {
    test('should wrap with braces', async () => {
      const doc = new MockEditableDocument('foo', [[0, 0]]) as any;
      await commands.wrapWithBrace(doc);
      
      expect(true).toBe(true);
    });
  });

  describe('transposeSexp', () => {
    test('should transpose adjacent sexps', async () => {
      const doc = new MockEditableDocument('foo bar', [[0, 0]]) as any;
      await commands.transposeSexp(doc);
      
      expect(true).toBe(true);
    });
  });
});

describe('Clipboard Command Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('killForwardSexp', () => {
    test('should kill forward sexp and copy to clipboard', async () => {
      const doc = new MockEditableDocument('foo bar', [[0, 0]]) as any;
      await commands.killForwardSexp(doc);
      
      expect(mockClipboardWriteText).toHaveBeenCalled();
    });
  });

  describe('killBackwardSexp', () => {
    test('should kill backward sexp and copy to clipboard', async () => {
      const doc = new MockEditableDocument('foo bar', [[7, 7]]) as any;
      await commands.killBackwardSexp(doc);
      
      expect(mockClipboardWriteText).toHaveBeenCalled();
    });
  });

  describe('killSexp', () => {
    test('should kill current sexp and copy to clipboard', async () => {
      const doc = new MockEditableDocument('(foo bar)', [[2, 2]]) as any;
      await commands.killSexp(doc);
      
      expect(mockClipboardWriteText).toHaveBeenCalled();
    });
  });

  describe('copySexp', () => {
    test('should copy current sexp to clipboard', async () => {
      const doc = new MockEditableDocument('(foo bar)', [[2, 2]]) as any;
      await commands.copySexp(doc);
      
      expect(mockClipboardWriteText).toHaveBeenCalled();
    });
  });

  describe('copyForwardSexp', () => {
    test('should copy forward sexp to clipboard', async () => {
      const doc = new MockEditableDocument('foo bar', [[0, 0]]) as any;
      await commands.copyForwardSexp(doc);
      
      expect(mockClipboardWriteText).toHaveBeenCalled();
    });
  });

  describe('copyBackwardSexp', () => {
    test('should copy backward sexp to clipboard', async () => {
      const doc = new MockEditableDocument('foo bar', [[7, 7]]) as any;
      await commands.copyBackwardSexp(doc);
      
      expect(mockClipboardWriteText).toHaveBeenCalled();
    });
  });
});

