
var samples = [

  // Basics

  '⊤',
  '⊥',
  'ε',
  '.',
  'a',
  '[a-z]', 
  
  // Disjunction

  'a|a|a',
  'a|(b|c)',
  '(a|b)|(c|d)',
  'a|b|c|a',
  'a|b|c|a|z|r|b|b|ua|b',


  // Conjuncts
  '(aaa)(aaa)',
  '(abc)(cba)',
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

  // Concatenation

  'ab',
  'a*b',
  'a*a',
  'a*a*',
  'a+a',
  'a+a*',
  'a+a+',
  'aa',
  'aa*',
  'aa+',
  'aa+aa',

  //   'a'
  // , '!a b'
  // , '!a'
  // , '!ab'
  // , '(A|B|C)*'
  // , '(ab)(cd)'
  // , '(ab)*'
  // , '(ab)+'
  // , '(ab)?'
  // , '(a|b)|(c|d)',
  // , '(a|b)|x|y|(c|d)',
  // , '.'
  // , 'A|B'
  // , '[a-z]'
  // , '[a-z][1-1]'
  // , '[a-z]a'
  // , 'a & a & ab'
  // , 'a & b'
  // , 'a b|a*** c&ef'
  // , 'a | b'
  // , 'a* b'
  // , 'a*'
  // , 'a+'
  // , 'a<0-*>'
  // , 'a<0-0>'
  // , 'a<0-1>'
  // , 'a<1-*>'
  // , 'a<2-3>'
  // , 'a<2-3><1-2>'
  // , 'a?'
  // , 'a?b'
  // , 'ab & ac'
  // , 'ab'
  // , 'abc & abd'
  // , 'abcd(a)|ac*left'
  // , 'a|(b|c)'
  // , 'a|a|a'
  // , 'fooo*|(bar|baz)'
  // , 'fooo*|bar|baz'

]

module.exports = samples


