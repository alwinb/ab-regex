const log = console.log.bind (console)
const { tokenize, parse } = require ('../src/parser')
const { Shared, Normalised, _print } = require ('../src/terms')

//
//  Test Parser
//

var parseSamples = [
   'abcd(a)|ac*left' 
  , '(ab)*'
  , 'a & a & ab'
  , 'a b|a*** c&ef'
  , 'fooo*|(bar|baz)'
  , 'fooo*|bar|baz'
  , '!ab'
  , '!a b'
  , '[a-z]'
  , '[a-z][1-1]'
]

function testParse (sample) {
  log ('\n', sample, '\n===================\n')
  log ([...tokenize (sample)])
  log (JSON.stringify (parse (sample), null, 2))
}


//
//  Test Normalisation
//

var normalizeSamples = [
  'a|a|a', 
  'a|(b|c)', 
  '(a|b)|(c|d)', 
  'a*', 
  'a*a*',
  'a*a',
  'aa*',
  'a+a*',
  'a+a',
  'aa+',
  'a*b',
]

function testNormalize (sample) {
  const store = new Normalised ()
  const ref = parse (sample, store)
  log ('\n', sample, '==>', _print(store.out, ref), '\n=========================\n')
  log (_print(store.out, ref))
  log (ref, [...store._heap.entries()])
}

parseSamples.forEach (testParse)
normalizeSamples.forEach (testNormalize)

