/**
 * Integration tests for Racket language navigation
 * Tests that sexpr navigation works correctly with Racket-specific syntax
 */

import { LineInputModel } from '../src/cursor-doc/model';
import { Scanner, CommentSyntax } from '../src/cursor-doc/lexer';

describe('Racket sexpr navigation', () => {
  let scanner: Scanner;

  beforeEach(() => {
    const racketSyntax: CommentSyntax = {
      lineComment: ';',
      blockComment: ['#|', '|#']
    };
    scanner = new Scanner(undefined, racketSyntax);
  });

  describe('Boolean literals', () => {
    test('should navigate forward over #t', () => {
      const model = new LineInputModel('(foo #t)', scanner);
      const cursor = model.getTokenCursor(5); // Position at #
      
      // Move forward - should skip over #t
      cursor.forwardSexp();
      
      // Should be at or after #t
      expect(cursor.offsetStart).toBeGreaterThanOrEqual(7);
    });

    test('should navigate backward over #f', () => {
      const model = new LineInputModel('(foo #f)', scanner);
      const cursor = model.getTokenCursor(8); // Position at )
      
      // Move backward - should skip over #f
      cursor.backwardSexp();
      
      // Should be at start of #f
      expect(cursor.offsetStart).toBe(5);
    });

    test('should find matching parens with #t inside', () => {
      const model = new LineInputModel('(foo #t)', scanner);
      const cursor = model.getTokenCursor(0); // Position at (
      
      // Move to matching close paren
      cursor.forwardList();
      
      // Should be at the closing paren
      const token = cursor.getToken();
      expect(token?.type).toBe('close');
      expect(token?.raw).toBe(')');
    });
  });

  describe('Character literals', () => {
    test('should treat #\\space as a single token', () => {
      const model = new LineInputModel('(char? #\\space)', scanner);
      const cursor = model.getTokenCursor(7); // Position at #
      
      // Get the token
      const token = cursor.getToken();
      expect(token?.type).toBe('id');
      expect(token?.raw).toBe('#\\space');
    });

    test('should navigate over character literals', () => {
      const model = new LineInputModel('(#\\a #\\b)', scanner);
      const cursor = model.getTokenCursor(1); // Position at first #
      
      // Move forward
      cursor.forwardSexp();
      
      // Should be at or after #\a
      expect(cursor.offsetStart).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Comments', () => {
    test('should treat ; as a comment', () => {
      const model = new LineInputModel('(foo bar) ; comment', scanner);
      const cursor = model.getTokenCursor(10); // Position at ;
      
      // Get the token
      const token = cursor.getToken();
      expect(token?.type).toBe('comment');
    });

    test('should not navigate into line comments', () => {
      const model = new LineInputModel('(foo bar) ; (not a list)', scanner);
      const cursor = model.getTokenCursor(0); // Position at (
      
      // Move to matching close paren
      cursor.forwardList();
      
      // Should be at the first closing paren, not the one in the comment
      expect(cursor.offsetStart).toBe(8);
    });

    test('should handle block comments', () => {
      const model = new LineInputModel('(foo #| comment |# bar)', scanner);
      const cursor = model.getTokenCursor(5); // Position at #|
      
      // Get the token
      const token = cursor.getToken();
      expect(token?.type).toBe('comment');
      expect(token?.raw).toBe('#| comment |#');
    });
  });

  describe('Hash literals', () => {
    test('should handle #lang directive', () => {
      const model = new LineInputModel('#lang racket', scanner);
      const cursor = model.getTokenCursor(0);
      
      // Get the token
      const token = cursor.getToken();
      expect(token?.type).toBe('id');
      expect(token?.raw).toBe('#lang');
    });

    test('should handle hash prefixed identifiers', () => {
      const model = new LineInputModel('(#:keyword value)', scanner);
      const cursor = model.getTokenCursor(1);
      
      // Get the token
      const token = cursor.getToken();
      expect(token?.type).toBe('id');
      expect(token?.raw).toBe('#:keyword');
    });
  });

  describe('Complex expressions', () => {
    test('should navigate through if expression with booleans', () => {
      const model = new LineInputModel('(if #t "yes" "no")', scanner);
      const cursor = model.getTokenCursor(0);
      
      // Move to matching close paren
      cursor.forwardList();
      
      // Should be at the closing paren
      const token = cursor.getToken();
      expect(token?.type).toBe('close');
      expect(cursor.offsetStart).toBe(17);
    });

    test('should handle nested expressions with hash literals', () => {
      const model = new LineInputModel('(define (test x) (if #t x #f))', scanner);
      const cursor = model.getTokenCursor(0);
      
      // Move to matching close paren
      cursor.forwardList();
      
      // Should be at the outermost closing paren (last character is at index 30)
      const token = cursor.getToken();
      expect(token?.type).toBe('close');
      expect(cursor.offsetStart).toBeGreaterThanOrEqual(29);
    });

    test('should handle expressions with comments and hash literals', () => {
      const model = new LineInputModel('(foo #t) ; #f is false', scanner);
      const cursor = model.getTokenCursor(0);
      
      // Move to matching close paren
      cursor.forwardList();
      
      // Should be at the closing paren before the comment
      expect(cursor.offsetStart).toBe(7);
      
      // The #f in the comment should not affect navigation
      const token = cursor.getToken();
      expect(token?.type).toBe('close');
    });
  });
});

describe('Python comment navigation', () => {
  let scanner: Scanner;

  beforeEach(() => {
    const pythonSyntax: CommentSyntax = {
      lineComment: '#'
    };
    scanner = new Scanner(undefined, pythonSyntax);
  });

  test('should treat # as comment start', () => {
    const model = new LineInputModel('[1, 2] # comment', scanner);
    const cursor = model.getTokenCursor(7);
    
    const token = cursor.getToken();
    expect(token?.type).toBe('comment');
  });

  test('should not navigate into comments', () => {
    const model = new LineInputModel('[1, 2] # [3, 4]', scanner);
    const cursor = model.getTokenCursor(0);
    
    // Move to matching close bracket
    cursor.forwardList();
    
    // Should be at the first closing bracket, not the one in the comment
    expect(cursor.offsetStart).toBe(5);
  });
});

describe('JavaScript comment navigation', () => {
  let scanner: Scanner;

  beforeEach(() => {
    const jsSyntax: CommentSyntax = {
      lineComment: '//',
      blockComment: ['/*', '*/']
    };
    scanner = new Scanner(undefined, jsSyntax);
  });

  test('should handle // comments', () => {
    const model = new LineInputModel('{a: 1} // comment', scanner);
    const cursor = model.getTokenCursor(7);
    
    const token = cursor.getToken();
    expect(token?.type).toBe('comment');
  });

  test('should handle /* */ comments', () => {
    const model = new LineInputModel('{a: /* comment */ 1}', scanner);
    const cursor = model.getTokenCursor(4);
    
    // Skip whitespace to get to comment
    cursor.forwardWhitespace();
    const token = cursor.getToken();
    expect(token?.type).toBe('comment');
  });

  test('should NOT treat # as comment', () => {
    const model = new LineInputModel('{hash: "#value"}', scanner);
    const tokens = model.getLines()[0].tokens;
    
    // Should not have any comment tokens
    const commentTokens = tokens.filter(t => t.type === 'comment');
    expect(commentTokens).toHaveLength(0);
  });
});

describe('Multi-language comment handling', () => {
  test('Racket: # is not a comment', () => {
    const racketSyntax: CommentSyntax = {
      lineComment: ';',
      blockComment: ['#|', '|#']
    };
    const scanner = new Scanner(undefined, racketSyntax);
    const model = new LineInputModel('(foo #t)', scanner);
    
    const tokens = model.getLines()[0].tokens;
    const commentTokens = tokens.filter(t => t.type === 'comment');
    expect(commentTokens).toHaveLength(0);
  });

  test('Python: # is a comment', () => {
    const pythonSyntax: CommentSyntax = {
      lineComment: '#'
    };
    const scanner = new Scanner(undefined, pythonSyntax);
    const model = new LineInputModel('x = 1 # comment', scanner);
    
    const tokens = model.getLines()[0].tokens;
    const commentTokens = tokens.filter(t => t.type === 'comment');
    expect(commentTokens).toHaveLength(1);
  });

  test('JavaScript: # is not a comment', () => {
    const jsSyntax: CommentSyntax = {
      lineComment: '//',
      blockComment: ['/*', '*/']
    };
    const scanner = new Scanner(undefined, jsSyntax);
    const model = new LineInputModel('const x = "#";', scanner);
    
    const tokens = model.getLines()[0].tokens;
    const commentTokens = tokens.filter(t => t.type === 'comment');
    expect(commentTokens).toHaveLength(0);
  });

  test('Clojure: ; is a comment, # is not', () => {
    const clojureSyntax: CommentSyntax = {
      lineComment: ';'
    };
    const scanner = new Scanner(undefined, clojureSyntax);
    const model = new LineInputModel('#{:a :b} ; set', scanner);
    
    const tokens = model.getLines()[0].tokens;
    const commentTokens = tokens.filter(t => t.type === 'comment');
    expect(commentTokens).toHaveLength(1);
    expect(commentTokens[0].raw).toBe('; set');
  });
});
