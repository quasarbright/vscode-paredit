Don't try to run commands like

```bash
cat > /tmp/test-cursor-notation.js << 'EOF'// Quick verification that cursor notation functions workconst { parse
CursorString, formatCursorString } = require('./tests/test-utils');// Test parseCursorStringconst parsed = parseCur
sorString("(foo bar|) baz");console.log('✓ parseCursorString works:', parsed.text === "(foo bar) baz" && parsed.cur
sor === 8);// Test formatCursorStringconst formatted = formatCursorString("(foo bar) baz", 8);console.log('✓ format
CursorString works:', formatted === "(foo bar|) baz");// Test multi-cursorconst multiParsed = parseCursorString("(|
foo) (|bar)");console.log('✓ Multi-cursor parse works:', multiParsed.cursors.length === 2 && multiParsed.cursors[0]
 === 1 && multiParsed.cursors[1] === 7);const multiFormatted = formatCursorString("(foo) (bar)", [1, 7]);console.lo
g('✓ Multi-cursor format works:', multiFormatted === "(|foo) (|bar)");console.log('\nAll cursor notation utilities 
working correctly!');EOFnode /tmp/test-cursor-notation.js
```
They don't work. create a local test file instead and then delete it when you are done.