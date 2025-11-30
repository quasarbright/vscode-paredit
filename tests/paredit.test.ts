/**
 * Tests for paredit operations
 */

/// <reference types="jest" />

import { 
  forwardSexpRange,
  backwardSexpRange,
  forwardSexpOrUpRange,
  backwardSexpOrUpRange,
  rangeToForwardUpList,
  rangeToBackwardUpList,
  rangeToForwardDownList,
  rangeToBackwardDownList,
  selectCurrentForm,
  selectForwardSexp,
  selectBackwardSexp,
  selectForwardUpSexp,
  selectBackwardUpSexp,
  selectForwardDownSexp,
  selectBackwardDownSexp,
  sexpRangeExpansion,
  sexpRangeContraction
} from '../src/paredit';
import { LineInputModel } from '../src/cursor-doc/model';

// Mock EditableDocument for testing
class MockEditableDocument {
  private model: LineInputModel;

  constructor(text: string) {
    this.model = new LineInputModel(text);
  }

  getTokenCursor(offset: number = 0) {
    return this.model.getTokenCursor(offset);
  }

  getText(start: number, end: number): string {
    return this.model.getText(start, end);
  }
}

describe('Paredit Range-Finding Functions', () => {
  describe('forwardSexpRange', () => {
    test('should move forward over atom', () => {
      // |foo bar → foo| bar
      const doc = new MockEditableDocument('foo bar') as any;
      const [start, end] = forwardSexpRange(doc, 0);
      
      expect(start).toBe(0);
      expect(end).toBe(3); // After 'foo' (before the space)
    });

    test('should move forward from middle of atom', () => {
      // foo |bar baz → foo bar| baz
      const doc = new MockEditableDocument('foo bar baz') as any;
      const [start, end] = forwardSexpRange(doc, 4); // Start at 'bar'
      
      expect(start).toBe(4);
      expect(end).toBe(7); // After 'bar' (before the space)
    });

    test('should move forward over list', () => {
      // |(foo bar) baz → (foo bar)| baz
      const doc = new MockEditableDocument('(foo bar) baz') as any;
      const [start, end] = forwardSexpRange(doc, 0);
      
      expect(start).toBe(0);
      expect(end).toBe(9); // After '(foo bar)' (before the space)
    });

    test('should handle nested lists', () => {
      // |(a (b c) d) → (a (b c) d)|
      const doc = new MockEditableDocument('(a (b c) d)') as any;
      const [start, end] = forwardSexpRange(doc, 0);
      
      expect(start).toBe(0);
      expect(end).toBe(11); // After entire expression (end of document)
    });

    test('should move forward when at end of atom without trailing space', () => {
      // foo| bar → foo bar|
      const doc = new MockEditableDocument('foo bar') as any;
      const [start, end] = forwardSexpRange(doc, 3); // At end of 'foo'
      
      expect(start).toBe(3);
      expect(end).toBe(7); // After 'bar' (end of document)
    });

    test('should return same position at document end', () => {
      // foo| → foo|
      const doc = new MockEditableDocument('foo') as any;
      const [start, end] = forwardSexpRange(doc, 3);
      
      expect(start).toBe(end);
    });

    test('should skip whitespace before moving', () => {
      // |  foo bar →   foo| bar
      const doc = new MockEditableDocument('  foo bar') as any;
      const [start, end] = forwardSexpRange(doc, 0);
      
      expect(start).toBe(0);
      expect(end).toBe(5); // After 'foo' (before the space after foo)
    });

    test('should move forward across lines', () => {
      // foo bar|
      // baz boo → foo bar
      //           baz| boo
      const doc = new MockEditableDocument('foo bar\nbaz boo') as any;
      const [start, end] = forwardSexpRange(doc, 7); // At end of 'bar'
      
      expect(start).toBe(7);
      expect(end).toBe(11); // After 'baz' (position 11 = 7 + 1 newline + 3 chars)
    });
  });

  describe('backwardSexpRange', () => {
    test('should move backward over atom', () => {
      const doc = new MockEditableDocument('foo bar') as any;
      const [start, end] = backwardSexpRange(doc, 7);
      
      expect(start).toBe(4);
      expect(end).toBe(7);
    });

    test('should move backward over list', () => {
      const doc = new MockEditableDocument('(foo bar) baz') as any;
      const [start, end] = backwardSexpRange(doc, 13);
      
      expect(start).toBe(10);
      expect(end).toBe(13);
    });

    test('should handle nested lists', () => {
      const doc = new MockEditableDocument('(a (b c) d) x') as any;
      const [start, end] = backwardSexpRange(doc, 13);
      
      expect(start).toBe(12);
      expect(end).toBe(13);
    });

    test('should return same position at document start', () => {
      const doc = new MockEditableDocument('foo') as any;
      const [start, end] = backwardSexpRange(doc, 0);
      
      expect(start).toBe(end);
    });
  });

  describe('forwardSexpOrUpRange', () => {
    test('should move forward over atom', () => {
      const doc = new MockEditableDocument('foo bar') as any;
      const [start, end] = forwardSexpOrUpRange(doc, 0);
      
      expect(start).toBe(0);
      expect(end).toBe(4);
    });

    test('should move past closing delimiter', () => {
      const doc = new MockEditableDocument('(foo bar)') as any;
      const [start, end] = forwardSexpOrUpRange(doc, 8);
      
      expect(start).toBe(8);
      expect(end).toBe(9);
    });

    test('should handle position before closing delimiter', () => {
      const doc = new MockEditableDocument('(foo bar)') as any;
      const [start, end] = forwardSexpOrUpRange(doc, 7);
      
      // Should move to after the closing paren
      expect(end).toBeGreaterThan(start);
    });
  });

  describe('backwardSexpOrUpRange', () => {
    test('should move backward over atom', () => {
      const doc = new MockEditableDocument('foo bar') as any;
      const [start, end] = backwardSexpOrUpRange(doc, 7);
      
      expect(start).toBe(4);
      expect(end).toBe(7);
    });

    test('should stay at opening delimiter', () => {
      const doc = new MockEditableDocument('(foo bar)') as any;
      const [start, end] = backwardSexpOrUpRange(doc, 0);
      
      expect(start).toBe(0);
      expect(end).toBe(0);
    });
  });

  describe('rangeToForwardUpList', () => {
    test('should move to closing delimiter of parent list', () => {
      const doc = new MockEditableDocument('(a (b c) d)') as any;
      const [start, end] = rangeToForwardUpList(doc, 5);
      
      // From space after 'b', should move to closing ')' of inner list
      expect(end).toBeGreaterThan(start);
      expect(doc.getText(end, end + 1)).toBe(')');
    });

    test('should handle deeply nested lists', () => {
      const doc = new MockEditableDocument('(a (b (c d) e) f)') as any;
      const [start, end] = rangeToForwardUpList(doc, 8);
      
      // From 'c' position
      expect(end).toBeGreaterThan(start);
    });

    test('should return same position at top level', () => {
      const doc = new MockEditableDocument('foo bar') as any;
      const [start, end] = rangeToForwardUpList(doc, 0);
      
      expect(start).toBe(end);
    });
  });

  describe('rangeToBackwardUpList', () => {
    test('should move to opening delimiter of parent list', () => {
      const doc = new MockEditableDocument('(a (b c) d)') as any;
      const [start, end] = rangeToBackwardUpList(doc, 5);
      
      // From 'b' position, should move to inner '('
      expect(start).toBeLessThan(end);
      expect(doc.getText(start, start + 1)).toBe('(');
    });

    test('should handle deeply nested lists', () => {
      const doc = new MockEditableDocument('(a (b (c d) e) f)') as any;
      const [start, end] = rangeToBackwardUpList(doc, 8);
      
      // From 'c' position
      expect(start).toBeLessThan(end);
    });

    test('should return same position at top level', () => {
      const doc = new MockEditableDocument('foo bar') as any;
      const [start, end] = rangeToBackwardUpList(doc, 0);
      
      expect(start).toBe(end);
    });
  });

  describe('rangeToForwardDownList', () => {
    test('should move down to first child list', () => {
      const doc = new MockEditableDocument('(a (b c) d)') as any;
      const [start, end] = rangeToForwardDownList(doc, 0);
      
      // From outer '(', should move to inner '('
      expect(end).toBeGreaterThan(start);
      expect(doc.getText(end, end + 1)).toBe('(');
    });

    test('should handle multiple child lists', () => {
      const doc = new MockEditableDocument('((a b) (c d))') as any;
      const [start, end] = rangeToForwardDownList(doc, 0);
      
      // Should move to first child list
      expect(end).toBeGreaterThan(start);
    });

    test('should return same position when no child list', () => {
      const doc = new MockEditableDocument('(a b c)') as any;
      const [start, end] = rangeToForwardDownList(doc, 0);
      
      // No child list, should stay at same position
      expect(start).toBe(end);
    });
  });

  describe('rangeToBackwardDownList', () => {
    test('should move down to first child list', () => {
      const doc = new MockEditableDocument('(a (b c) d)') as any;
      const [start, end] = rangeToBackwardDownList(doc, 10);
      
      // From end, should move to inner '('
      expect(start).toBeLessThan(end);
    });

    test('should return same position when no child list', () => {
      const doc = new MockEditableDocument('(a b c)') as any;
      const [start, end] = rangeToBackwardDownList(doc, 6);
      
      // No child list
      expect(start).toBe(end);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty document', () => {
      const doc = new MockEditableDocument('') as any;
      const [start, end] = forwardSexpRange(doc, 0);
      
      expect(start).toBe(end);
    });

    test('should handle document with only whitespace', () => {
      const doc = new MockEditableDocument('   ') as any;
      const [start, end] = forwardSexpRange(doc, 0);
      
      expect(start).toBe(end);
    });

    test('should handle unbalanced delimiters gracefully', () => {
      const doc = new MockEditableDocument('(foo bar') as any;
      const [start, end] = forwardSexpRange(doc, 0);
      
      // Should still attempt to process
      expect(start).toBeDefined();
      expect(end).toBeDefined();
    });

    test('should handle cursor at various positions in nested structure', () => {
      const doc = new MockEditableDocument('(a (b c) d)') as any;
      
      // Test from different positions
      const range1 = forwardSexpRange(doc, 0);
      expect(range1[1]).toBeGreaterThan(range1[0]);
      
      const range2 = forwardSexpRange(doc, 3);
      expect(range2[1]).toBeGreaterThan(range2[0]);
      
      const range3 = forwardSexpRange(doc, 5);
      expect(range3[1]).toBeGreaterThan(range3[0]);
    });
  });
});


describe('Paredit Selection Operations', () => {
  // Helper to create a mock editable document with selections
  class MockEditableDocumentWithSelections extends MockEditableDocument {
    public _selections: any[];

    constructor(text: string, selections: Array<[number, number]>) {
      super(text);
      this._selections = selections.map(([anchor, active]) => ({
        anchor,
        active,
        start: Math.min(anchor, active),
        end: Math.max(anchor, active),
        constructor: function(a: number, b: number) {
          return { anchor: a, active: b, start: Math.min(a, b), end: Math.max(a, b), constructor: this };
        }
      }));
    }

    get selections() {
      return this._selections;
    }

    set selections(sels: any[]) {
      this._selections = sels;
    }
  }

  describe('selectCurrentForm', () => {
    test('should select current sexp with single cursor', () => {
      const doc = new MockEditableDocumentWithSelections('(foo bar)', [[2, 2]]) as any;
      selectCurrentForm(doc);
      
      expect(doc.selections.length).toBe(1);
      expect(doc.selections[0].start).toBe(0);
      expect(doc.selections[0].end).toBe(9);
    });

    test('should handle multiple cursors', () => {
      const doc = new MockEditableDocumentWithSelections('(foo) (bar)', [[2, 2], [8, 8]]) as any;
      selectCurrentForm(doc);
      
      expect(doc.selections.length).toBe(2);
      expect(doc.selections[0].start).toBe(0);
      expect(doc.selections[0].end).toBe(5);
      expect(doc.selections[1].start).toBe(6);
      expect(doc.selections[1].end).toBe(11);
    });
  });

  describe('selectForwardSexp', () => {
    test('should extend selection forward', () => {
      const doc = new MockEditableDocumentWithSelections('foo bar baz', [[0, 0]]) as any;
      selectForwardSexp(doc);
      
      expect(doc.selections[0].anchor).toBe(0);
      expect(doc.selections[0].active).toBeGreaterThan(0);
    });

    test('should work with multiple cursors', () => {
      const doc = new MockEditableDocumentWithSelections('foo bar', [[0, 0], [4, 4]]) as any;
      selectForwardSexp(doc);
      
      expect(doc.selections.length).toBe(2);
      expect(doc.selections[0].active).toBeGreaterThan(0);
      expect(doc.selections[1].active).toBeGreaterThan(4);
    });
  });

  describe('selectBackwardSexp', () => {
    test('should extend selection backward', () => {
      const doc = new MockEditableDocumentWithSelections('foo bar', [[7, 7]]) as any;
      selectBackwardSexp(doc);
      
      expect(doc.selections[0].anchor).toBe(7);
      expect(doc.selections[0].active).toBeLessThan(7);
    });
  });

  describe('selectForwardUpSexp', () => {
    test('should select to end of parent list', () => {
      const doc = new MockEditableDocumentWithSelections('(a (b c) d)', [[5, 5]]) as any;
      selectForwardUpSexp(doc);
      
      expect(doc.selections[0].anchor).toBe(5);
      expect(doc.selections[0].active).toBeGreaterThan(5);
    });
  });

  describe('selectBackwardUpSexp', () => {
    test('should select to start of parent list', () => {
      const doc = new MockEditableDocumentWithSelections('(a (b c) d)', [[5, 5]]) as any;
      selectBackwardUpSexp(doc);
      
      expect(doc.selections[0].anchor).toBe(5);
      expect(doc.selections[0].active).toBeLessThan(5);
    });
  });

  describe('selectForwardDownSexp', () => {
    test('should select into child list', () => {
      const doc = new MockEditableDocumentWithSelections('(a (b c) d)', [[0, 0]]) as any;
      selectForwardDownSexp(doc);
      
      expect(doc.selections[0].anchor).toBe(0);
      expect(doc.selections[0].active).toBeGreaterThan(0);
    });
  });

  describe('selectBackwardDownSexp', () => {
    test('should select into child list from end', () => {
      const doc = new MockEditableDocumentWithSelections('(a (b c) d)', [[10, 10]]) as any;
      selectBackwardDownSexp(doc);
      
      expect(doc.selections[0].anchor).toBe(10);
      expect(doc.selections[0].active).toBeLessThan(10);
    });
  });

  describe('sexpRangeExpansion', () => {
    test('should expand selection to parent', () => {
      const doc = new MockEditableDocumentWithSelections('(a (b c) d)', [[4, 7]]) as any;
      sexpRangeExpansion(doc);
      
      // Should expand from inner list to outer list
      expect(doc.selections[0].start).toBe(0);
      expect(doc.selections[0].end).toBe(11);
    });

    test('should not expand if already at top level', () => {
      const doc = new MockEditableDocumentWithSelections('foo bar', [[0, 3]]) as any;
      sexpRangeExpansion(doc);
      
      // Should stay the same
      expect(doc.selections[0].start).toBe(0);
      expect(doc.selections[0].end).toBe(3);
    });
  });

  describe('sexpRangeContraction', () => {
    test('should contract selection to first child', () => {
      const doc = new MockEditableDocumentWithSelections('(a (b c) d)', [[0, 11]]) as any;
      sexpRangeContraction(doc);
      
      // Should contract to first element 'a'
      expect(doc.selections[0].start).toBeGreaterThan(0);
      expect(doc.selections[0].end).toBeLessThan(11);
    });

    test('should not contract if no children', () => {
      const doc = new MockEditableDocumentWithSelections('foo', [[0, 3]]) as any;
      sexpRangeContraction(doc);
      
      // Should stay the same
      expect(doc.selections[0].start).toBe(0);
      expect(doc.selections[0].end).toBe(3);
    });
  });
});
