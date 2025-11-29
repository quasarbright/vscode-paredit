/**
 * Tests for language-specific comment syntax support
 */

import { Scanner, CommentSyntax } from '../src/cursor-doc/lexer';
import { getDefaultCommentSyntax } from '../src/language-support';

describe('Language Support', () => {
  describe('getDefaultCommentSyntax', () => {
    test('should return Lisp/Racket style comment syntax', () => {
      const syntax = getDefaultCommentSyntax();
      expect(syntax).toEqual({
        lineComment: ';',
        blockComment: ['#|', '|#']
      });
    });
  });
});

describe('Scanner with language-specific comment syntax', () => {
  describe('Racket language', () => {
    let scanner: Scanner;

    beforeEach(() => {
      const racketSyntax: CommentSyntax = {
        lineComment: ';',
        blockComment: ['#|', '|#']
      };
      scanner = new Scanner(undefined, racketSyntax);
    });

    test('should NOT treat #t as a comment', () => {
      const tokens = scanner.processLine('(foo #t)', { inString: false });
      
      // Should tokenize as: ( foo <space> #t )
      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe('open');
      expect(tokens[0].raw).toBe('(');
      expect(tokens[1].type).toBe('id');
      expect(tokens[1].raw).toBe('foo');
      expect(tokens[2].type).toBe('ws');
      expect(tokens[3].type).toBe('id');
      expect(tokens[3].raw).toBe('#t');
      expect(tokens[4].type).toBe('close');
      expect(tokens[4].raw).toBe(')');
    });

    test('should NOT treat #f as a comment', () => {
      const tokens = scanner.processLine('(if #f "no" "yes")', { inString: false });
      
      // Find the #f token
      const hashFToken = tokens.find(t => t.raw === '#f');
      expect(hashFToken).toBeDefined();
      expect(hashFToken?.type).toBe('id');
    });

    test('should treat ; as a line comment', () => {
      const tokens = scanner.processLine('(foo bar) ; comment', { inString: false });
      
      // Should have tokens for (foo bar) and then a comment
      const commentToken = tokens.find(t => t.type === 'comment');
      expect(commentToken).toBeDefined();
      expect(commentToken?.raw).toBe('; comment');
    });

    test('should treat #| |# as block comments', () => {
      const tokens = scanner.processLine('(foo #| comment |# bar)', { inString: false });
      
      // Should have a comment token
      const commentToken = tokens.find(t => t.type === 'comment');
      expect(commentToken).toBeDefined();
      expect(commentToken?.raw).toBe('#| comment |#');
    });

    test('should handle #lang directive as identifier', () => {
      const tokens = scanner.processLine('#lang racket', { inString: false });
      
      // #lang should be an identifier, not a comment
      expect(tokens[0].type).toBe('id');
      expect(tokens[0].raw).toBe('#lang');
    });

    test('should handle character literals like #\\a', () => {
      const tokens = scanner.processLine('(char? #\\a)', { inString: false });
      
      // #\a should be an identifier
      const charToken = tokens.find(t => t.raw.startsWith('#\\'));
      expect(charToken).toBeDefined();
      expect(charToken?.type).toBe('id');
    });
  });

  describe('Python language', () => {
    let scanner: Scanner;

    beforeEach(() => {
      const pythonSyntax: CommentSyntax = {
        lineComment: '#'
      };
      scanner = new Scanner(undefined, pythonSyntax);
    });

    test('should treat # as a comment', () => {
      const tokens = scanner.processLine('x = 1 # comment', { inString: false });
      
      const commentToken = tokens.find(t => t.type === 'comment');
      expect(commentToken).toBeDefined();
      expect(commentToken?.raw).toBe('# comment');
    });

    test('should handle # at start of line', () => {
      const tokens = scanner.processLine('# This is a comment', { inString: false });
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe('comment');
      expect(tokens[0].raw).toBe('# This is a comment');
    });
  });

  describe('JavaScript language', () => {
    let scanner: Scanner;

    beforeEach(() => {
      const jsSyntax: CommentSyntax = {
        lineComment: '//',
        blockComment: ['/*', '*/']
      };
      scanner = new Scanner(undefined, jsSyntax);
    });

    test('should treat // as a line comment', () => {
      const tokens = scanner.processLine('const x = 1; // comment', { inString: false });
      
      const commentToken = tokens.find(t => t.type === 'comment');
      expect(commentToken).toBeDefined();
      expect(commentToken?.raw).toBe('// comment');
    });

    test('should treat /* */ as block comments', () => {
      const tokens = scanner.processLine('const x = /* comment */ 1;', { inString: false });
      
      const commentToken = tokens.find(t => t.type === 'comment');
      expect(commentToken).toBeDefined();
      expect(commentToken?.raw).toBe('/* comment */');
    });

    test('should NOT treat # as a comment', () => {
      const tokens = scanner.processLine('const hash = "#value";', { inString: false });
      
      // # should be part of an identifier or string, not a comment
      const commentTokens = tokens.filter(t => t.type === 'comment');
      expect(commentTokens).toHaveLength(0);
    });
  });

  describe('Clojure language', () => {
    let scanner: Scanner;

    beforeEach(() => {
      const clojureSyntax: CommentSyntax = {
        lineComment: ';'
      };
      scanner = new Scanner(undefined, clojureSyntax);
    });

    test('should treat ; as a line comment', () => {
      const tokens = scanner.processLine('(def x 1) ; comment', { inString: false });
      
      const commentToken = tokens.find(t => t.type === 'comment');
      expect(commentToken).toBeDefined();
      expect(commentToken?.raw).toBe('; comment');
    });

    test('should NOT treat # as a comment', () => {
      const tokens = scanner.processLine('#{:a :b :c}', { inString: false });
      
      // # should be part of the set literal syntax
      const hashToken = tokens.find(t => t.raw.includes('#'));
      expect(hashToken).toBeDefined();
      expect(hashToken?.type).not.toBe('comment');
    });
  });

  describe('Haskell language', () => {
    let scanner: Scanner;

    beforeEach(() => {
      const haskellSyntax: CommentSyntax = {
        lineComment: '--',
        blockComment: ['{-', '-}']
      };
      scanner = new Scanner(undefined, haskellSyntax);
    });

    test('should treat -- as a line comment', () => {
      const tokens = scanner.processLine('x = 1 -- comment', { inString: false });
      
      const commentToken = tokens.find(t => t.type === 'comment');
      expect(commentToken).toBeDefined();
      expect(commentToken?.raw).toBe('-- comment');
    });

    test('should treat {- -} as block comments', () => {
      const tokens = scanner.processLine('x = {- comment -} 1', { inString: false });
      
      const commentToken = tokens.find(t => t.type === 'comment');
      expect(commentToken).toBeDefined();
      expect(commentToken?.raw).toBe('{- comment -}');
    });

    test('should NOT treat # as a comment', () => {
      const tokens = scanner.processLine('x = #value', { inString: false });
      
      const commentTokens = tokens.filter(t => t.type === 'comment');
      expect(commentTokens).toHaveLength(0);
    });
  });

  describe('Fallback behavior (default comment syntax)', () => {
    let scanner: Scanner;

    beforeEach(() => {
      // Create scanner with default (Lisp/Racket) comment syntax
      const defaultSyntax = getDefaultCommentSyntax();
      scanner = new Scanner(undefined, defaultSyntax);
    });

    test('should use Lisp/Racket style comments as default', () => {
      // Semicolon should be recognized as comment
      const tokens1 = scanner.processLine('; comment', { inString: false });
      expect(tokens1[0].type).toBe('comment');

      // Block comments should work
      const tokens2 = scanner.processLine('#| comment |#', { inString: false });
      expect(tokens2[0].type).toBe('comment');

      // Hash alone should NOT be a comment (important for Racket #t, #f, etc.)
      const tokens3 = scanner.processLine('#t', { inString: false });
      expect(tokens3[0].type).toBe('id');
      expect(tokens3[0].raw).toBe('#t');
    });
  });
});

describe('Integration: Racket sexpr navigation', () => {
  let scanner: Scanner;

  beforeEach(() => {
    const racketSyntax: CommentSyntax = {
      lineComment: ';',
      blockComment: ['#|', '|#']
    };
    scanner = new Scanner(undefined, racketSyntax);
  });

  test('should correctly tokenize (foo #t) without treating ) as commented', () => {
    const tokens = scanner.processLine('(foo #t)', { inString: false });
    
    // Verify we have the closing paren
    const closeParen = tokens.find(t => t.raw === ')');
    expect(closeParen).toBeDefined();
    expect(closeParen?.type).toBe('close');
    
    // Verify #t is an identifier
    const hashT = tokens.find(t => t.raw === '#t');
    expect(hashT).toBeDefined();
    expect(hashT?.type).toBe('id');
  });

  test('should handle complex Racket expressions', () => {
    const tokens = scanner.processLine('(if #t #f #\\space)', { inString: false });
    
    // Should have proper structure
    expect(tokens[0].type).toBe('open');
    expect(tokens[tokens.length - 1].type).toBe('close');
    
    // All # prefixed items should be identifiers
    const hashTokens = tokens.filter(t => t.raw.startsWith('#'));
    hashTokens.forEach(token => {
      expect(token.type).toBe('id');
    });
  });
});
