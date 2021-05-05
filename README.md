Regular Expression Engine
=====================

An algebraic approach to compiling regular expressions to deterministic finite state machines, based on the notion of 'derivative' of a regular expression. Supports intersection and negation in addition to the ususal operators.

The compiler is working and pretty much finished. The parser is still very basic and I have not yet decided on the final syntax. 

The intended use case is a generator for incremental lexers (and/ or parsers).


Motivation
----------

This project was separated out of a larger project. The main goal was to learn more about universal algebra and coalgebra by making the concepts very concrete again in an implementation. Thus it is an in-depth study of the mechanisms at work and how they appear on the different levels of abstraction, in both theory and practice. The API tries to model the theory of regular expression derivatives within the conceptual framework of universal algebra and coalgebra in mind, as genuinely as possible. 


API Design
----------

The core API gives access to implementations of regular expression algebras and coalgebras. This is the internal API that the parser-evaluator calls out to, and it can be used to programmatically create and compile regular expressions. 

The main concept is that of a regular expression algebra. This is modeled in javascript in one of two ways that can easily be converted between. 

1. As a function, typically called `apply` that takes an operator name as its first argument and operands as subsequent arguments. 
2. As an object/ dictionary, that has for each nullary operator, a constant property by the operator name, and for each non-nullary operator, a method by the operator name that takes its operands as arguments. 


* * * 

Concepts and Data structures:

- Signature
- RangeList
- State

Regular expression Algebras:

- Shared
- Normalised
- Accepts
- OneLevel
- Compiler

