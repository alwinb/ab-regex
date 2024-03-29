const { raw } = String

var samples = [

  // Basics

  '⊤',
  '⊥',
  'ε',
  '.',
  'a',

  // Character Sets

  '[]',
  '[a]', 
  '[ac]', 
  '[a-z]', 
  '[z-a]', 
  '[a-zA-Z]',
  '[a-z][1-1]',
  '[a-z]a',

  // Careful!

  // '[ x]',
  // '[x ]',
  // '[ x ]',
  // '[-]',
  // '[--]',
  // '[a-]',
  // '[-a]',
  // '[---]',
  // raw `[\\]`,
  // raw `[\n]`,
  // raw `[ \x20 ]`,

  // Negated Character Sets

  '[^a-z]', 
  '[^a]', 
  '[^ac]', 
  '[^a-zA-Z]',

  
  // Disjunction

  'a|a|a',
  'a|(b|c)',
  '(a|b)|(c|d)',
  'a|b|c|a',
  'a|b|c|a|z|r|b|b|ua|b',


  // Conjunction

  'a & a',
  'a & b',
  'a & b & a',
  'ab & ac',
  'abc & abd',
  'a & a & ab',
  
  
  // Concatenation

  'ab',
  '(aaa)(aaa)',
  '(abc)(cba)',
  '(ab)(cd)',
  '(a|b|c)*...',

  // Quantifiers

  'a?',
  'a*',
  'a+',
  'a<0-1>',
  'a<0-0>',
  'a<0-*>',
  'a<1-*>',
  'a<2-3>',
  'a<2-3><1-2>',

  // Quantifiers/ Concatenation

  'ab',
  'a*b',
  'a?b',
  'a+b',
  'a*a',
  'a*a*',
  'a+a',
  'a+a*',
  'a+a+',
  'aa',
  'aa*',
  'aa+',
  'aa+aa',

  // , '!a b'
  // , '!a'
  // , '!ab'
  // , '(A|B|C)*'
  // , '(ab)*'
  // , '(ab)+'
  // , '(ab)?'
  // , '(a|b)|(c|d)',
  // , '(a|b)|x|y|(c|d)',
  // , 'a b|a*** c&ef'
]

module.exports = samples


