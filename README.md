Regular Expression Engine
=====================

Work in progress! 

An algebraic approach to compiling regular expressions to deterministic finite state machines, loosely based on the notion of 'derivative' of a regular expression. Supports intersection and negation in addition to the ususal operators.

As stated, work in progress. The compiler is working and pretty much finished. The parser is still very basic and I have not yet decided on the final syntax. 

The intended use case is a generator for incremental lexers (and/ or parsers).