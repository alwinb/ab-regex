const log = console.log.bind (console)
const { tokenize, parse } = require ('./parser')
const { TermStore, Compiler } = require ('./dfa')

//
//  Test Parser
//

const samples = [
   'abcd(a)|ac*left' 
  , '(ab)*'
  , 'a & a & ab'
  , 'a b|a*** c&ef'
  , 'fooo*|(bar|baz)'
  , 'fooo*|bar|baz'
  , '!ab'
  , '!a b'
]

function testParse (sample) {
  log ('\n', sample, '\n===================\n')
  log ([...tokenize (sample)])
  log (JSON.stringify (parse (sample), null, 2))
  const store = new TermStore ()
  const ref = parse (sample, store.apply)
  log (ref, store._heap)
}

samples.forEach (testParse)


//
//  Test Compiler
//

const derivSamples = [
    'a' 
  , '!a'
  , 'a | b'
  , 'a & b'
  , 'a*'
  , 'ab'
  , 'a* b'
  , 'ab & ac'
  , 'abc & abd'
]

function testCompiler (sample) {
  log ('\n', sample, '\n===================\n')
  log ([...tokenize (sample)])
  log (JSON.stringify (parse (sample), null, 2))
  const store = new Compiler ()
  const ref = parse (sample, store.apply)
  log (ref[0], [...store.entries ()])
}

// derivSamples.forEach (testCompiler)


//
//  Test actually running the regex
//

function testRun (sample, input) {
  log ('\nrun', sample, input, '\n===================\n')
  log ([...tokenize (sample)])
  log (JSON.stringify (parse (sample), null, 2))
  const store = new Compiler ()
  const ref = parse (sample, store.apply)
  log (ref[0], [...store.entries ()])
  log (store.run (ref[0], input))
}

testRun ('a*b', 'aab')
testRun ('a|b*', 'b')
testRun ('a|b*', 'bbbb')
testRun ('a|b*', 'ba')
testRun ('a|b*', 'a')
testRun ('abc* & abc', 'abcc')
testRun ('!ab', 'ab')

