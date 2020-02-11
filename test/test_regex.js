const log = console.log.bind (console)
const { tokenize, parse } = require ('../src/parser')
const { TermStore, Compiler } = require ('../src/dfa')
const Regex = require ('../src/')

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
  , '[a-z]'
  , '[a-z][1-1]'
]

function testParse (sample) {
  log ('\n', sample, '\n===================\n')
  log ([...tokenize (sample)])
  log (JSON.stringify (parse (sample), null, 2))
  const store = new TermStore ()
  const ref = parse (sample, store.apply)
  log (ref, store._heap)
}

//samples.forEach (testParse)


//
//  Test Compiler
//

const derivSamples = [
    'a' 
  , '[a-z]'
  , '!a'
  , 'a | b'
  , 'a & b'
  , 'a*'
  , 'ab'
  , 'a* b'
  , 'ab & ac'
  , 'abc & abd'
  , '[a-z]'
  , '[a-z][1-1]'
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


/*
testRun ('a*b', 'aab')
testRun ('a|b*', 'b')
testRun ('a|b*', 'bbbb')
testRun ('a|b*', 'ba')
testRun ('a|b*', 'a')
testRun ('abc* & abc', 'abcc')
testRun ('!ab', 'ab')
testRun ('[a-z]', 'hi')
testRun ('[a-z]*', 'abc')
testRun ('[a-z]*...', 'abc___')
//*/

/*
testRun ('hii?', 'h')
testRun ('hii?', 'hi')
testRun ('hii?', 'hii')
testRun ('hi+', 'hiii')
testRun ('hi+', 'h')
testRun ('hi+', 'hi')
testRun ('hi+', 'hii')
testRun ('hi+', 'hiii')
//*/

/*
testRun ('(hi)+', 'h')
testRun ('(hi)+', 'hi')
testRun ('(hi)+', 'hih')
testRun ('(hi)+', 'hihi')
testRun ('(hi)+', 'hihih')
testRun ('(hi)+', 'hihihi')
testRun ('(hi)+', 'hihihih')
//*/

//
//  Test Regex Object
//

//*
var r = new Regex ('ab*x')
log (r)

log (r.test ('abbbx'))
log (r.reduce ('ab'))
log (r.reduce ('bbb'))
log (r.reduce ('x'))
log (r.reduce ('a'))
//*/


/*
var r = new Regex ('ab*x')
var r = new Regex ('ab?x')
var r = new Regex ('ab+x')
log(r)
log (r.test ('ax'))
log (r.test ('abx'))
log (r.test ('abbx'))
log (r.test ('abbbx'))
//*/

/*
var r = new Regex ('(ab)*x')
var r = new Regex ('(ab)?x')
var r = new Regex ('(ab)+x')

log (r.test ('x'))
log (r.test ('abx'))
log (r.test ('ababx'))
log (r.test ('abababx'))
log (r.test ('ababax'))
//*/

/*
var r = new Regex ('a.c')
log (r.test ('ac'))
log (r.test ('axc'))
log (r.test ('ayc'))
log (r.test ('aac'))
log (r.test ('acc'))
//*/

/*
var r = new Regex ('(. &!(X|Y))*')
log (r.test ('aXYc'))
log (r.test ('axc'))
log (r.test ('ayc'))
log (r.test ('aac'))
log (r.test ('acc'))
//*/