const log = console.log.bind (console)
const { tokenize, parse } = require ('../src/parser')
const { Shared, Normalised, _print } = require ('../src/terms')

//
//  Test Parser
//

var parseSamples = [

  , 'a<0-1>'
  , 'a<0-0>'
  , 'a<0-*>'
  , 'a<1-*>'

  , '⊤',
  , '⊥',
  , '.',
  , 'ε',
  , 'a',
  , '[a-z]'
  , '(ab)*'
  , 'a & a & ab'
  , 'a b|a*** c&ef'
  , 'fooo*|(bar|baz)'
  , 'fooo*|bar|baz'
  , '!ab'
  , '!a b'
  , '[a-z]'
  , '[a-z]a'
  , '[a-z][1-1]'
  , 'abcd(a)|ac*left' 
]

function testParse (sample) {
  log ('\n', sample, '\n===================\n')
  log ([...tokenize (sample)])
  log (JSON.stringify (parse (sample), null, 2))

  const store = new Shared ()
  let ref = parse (sample, store)
  log (ref, [...store])
}


//
//  Test Normalisation
//

var normalizeSamples = [


  // Testing CONC normalisation
  'aa',
  'a+a',
  'aa*',
  'a+a+',
  'aa+aa',
  
  // Testing REPEAT normalisation
  // 'a<0-1>',
  // 'a<0-0>',
  // 'a<0-*>',
  // 'a<1-*>',
  // 'a<2-3>',
  // 'a<2-3><1-2>',

  // 'a',
  // '⊤',
  // '⊥',
  // '.',
  // 'a+',
  // 'ab',
  // 'a|a|a',
  // 'a|(b|c)',
  // '(a|b)|(c|d)',
  // 'a*',
  // 'a*a*',
  // 'a*a',
  // 'aa*',
  // 'a+a*',
  // 'a+a',
  // 'aa+',
  // 'a*b',
]

function testNormalize (sample) {
  const store = new Normalised ()
  const ref = parse (sample, store)
  log ('\n', sample, '==>', ref )
  log (_print (store.out, ref), '\n=========================\n')
  //log (_print (store.out, ref))
  log (ref, [...store])
}

//parseSamples.forEach (testParse)
normalizeSamples.forEach (testNormalize)

