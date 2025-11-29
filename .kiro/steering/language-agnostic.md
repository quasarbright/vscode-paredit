You MUST NOT hard-code comment syntax like writing the fact that js line comments start with `//`. Any comment detection should be done by delegating to VSCode's lexer which uses a language extension's lexer. There should be no language-specific logic in this entire project, except for the racket-like fallback.

You MUST NOT hard-code delimiter syntax for as this varies between languages. For example, in many languages, you can use single quotes for strings. But in others, like lisps, single quote is used for quoting and is not matched by a close quote, so it should not be a delimiter.

You MUST NOT encode any language-specific syntax since you definitely won't make an exhaustive list of all languages.