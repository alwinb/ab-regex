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

The _carrier_ of the algebra can be modeled in several ways: 

1. _implicitly_, meaning that elements of the carrier are represented and stored in memory in order to be passed to the algebra functions as above, but without storing the entire carrier in memory, or
2. _explicitly_, meaning that the carrier and all of its elements are represented and stored in memory.  

The carriers of most of the relevant algebras are not finite however, making an explicit model impossible. Instead I use a hybrid of implicit and explicit, where a finite subset of the carrier is explicitly modeled and allowed to grow on demand. 

* * * 

- Signature
- Shared
- Normalised
- RangeList
- State
- Accepts
- OneLevel
- Compiler


### The Term Algebra

Term algebras, equivalently, _initial_ algebras are _minimal_, which means that they have no proper subalgebras. This in turn implies that any two equivalent terms are present in the carrier as one and the same element. Taking this further, it also implies that equivalent subterms are present as one and the same element. Thus terms are 'stored' in the initial algebra as fully-subterm-shared. Thus, they are directed acyclic graphs. They are not trees.




