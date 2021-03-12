const log = console.log.bind (console)
const { parse } = require ('../src/grammar')
const { Shared, Normalised } = require ('../src/normalize')
const { Compiler, OneLevel, _print } = require ('../src/dfa')
const Regex = require ('../src/')
const samples = require ('./samples')

//
//  Test Compiler
//

function testCompiler (sample) {
  log ('\n', sample, '\n===================\n')
  const store = new Compiler ()
  const ref = parse (sample, store.apply.bind (store))
  log (ref.id, [...store._inspect()])
}

samples.forEach (testCompiler)


//
//  Test actually running the regex
//

function testRun (sample, input) {
  log ('\nrun', sample, '(', input, ')\n===================\n')
  const store = new Compiler ()
  const ref = parse (sample, store.apply.bind (store))
  log (ref.id, [...store._inspect()])
  log (store.run (ref.id, input))
}


//*
//testRun ('a*b', 'aab')
//testRun ('a|b*', 'b')
//testRun ('a|b*', 'bbbb')
//testRun ('a|b*', 'ba')
//testRun ('a|b*', 'a')
//testRun ('abc* & abc', 'abcc')
//testRun ('!ab', 'ab')
//testRun ('[a-z]', 'hi')
//testRun ('[a-z]*', 'abc')
//testRun ('(a|b|c)*...', 'abc___')
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
