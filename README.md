Regular Expression Engine
=========================

**[ [Onine Demo][demo] ]**

A Regular Expression Engine and a Lexer Generator. 

This project implements an algebraic approach to compiling regular expressions to deterministic finite state machines. 
The compiler is based on the notion of 'derivative' of a regular expression. 
All of the usual boolean algebra operations are supported, including intersection and negation of regular expressions. 

The essential paper about on topic can be found here: 

* **[Regular-expression derivatives re-examined
][paper]**,  
  by Scott Owens, John Reppy and Aaron Turon.


### New! – Lexer Compiler

Based on the regular expression compiler, there is now also a compiler for rudimentary **Lexers**, based on some newly developed theory. This implements the theory of a derivative of a lexer specification to produce a DFA in which some of the states have an acceptance-label instead of a boolean acceptance flag. 

More information forthcoming!

[demo]: https://alwinb.github.io/ab-regex/test/compiler.html
[paper]: https://www.ccs.neu.edu/home/turon/re-deriv.pdf

Design
------

The core API gives access to implementations of regular expression algebras and coalgebras. This is the internal API that the parser-evaluator calls out to, and it can be used to programmatically create and compile regular expressions. 

The main concept is that of a regular expression signature and a regular expression algebra.

This project implements several algebras that implement the regular-expression–signature operations. 

- **Shared** – A fully–subterm-shared term algebra for regular expression terms. 
- **Normalised** – An algebra that implements a normalisation of regex terms. 
- **Accepts** – An algebra that can be used to determine if a regex accepts the empty string. 
- **OneLevel** – An algebra that uses Accepts and Normalised, so that it can interpret regular expressions as a 'one-level–unfolding' of a DFA. Such a one-level unfolding consists of the normalised term used as an id, an accepts-flag, and a collection of derivatives, that maps characters to the normalised derivatives of the regular expression.
- **Derivs** – this can be obtained from OneLevel, by taking the derivs property out of a OneLevel state. 

Other data structures:

- **RangeMap** – A canonical datastructure for representing discrete functions that map continuous ranges of the domain to a common value in the codomain. This is used for representing Derivs. 
- **RangeSet** – A RangeMap that maps values to booleans, thus representing sets, and allowing all the boolean operations on them. 

The compiler uses OneLevel to compute the one-level unfolding of a regular expression and (because it proceeds algebraically: from the leaves of a term upwards) of all its subterms. It then exhaustively proceeds to unfold any new terms that appear as derivatives. This produces the DFA. 


### Lexer Compiler

forthcoming...!
