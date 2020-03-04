const log = console.log.bind (console)
const { tokenize, parse } = require ('../src/parser')
const { Shared, Normalised } = require ('../src/terms')
const { Compiler, OneLevel, _print } = require ('../src/dfa')
const Regex = require ('../src/')

//
//  Test Compiler
//

const compileSamples = [
    'a'
  , 'a<0-1>'
  , 'a<0-0>'
  , 'a<0-*>'
  , 'a<1-*>'
  , 'a<2-3>'
  , 'a<2-3><1-2>'
  , 'A|B'
  , 'a|a|a'
  , 'a|(b|c)'
  // , '(a|b)|(c|d)',
  // , '(a|b)|x|y|(c|d)',
  // , '(A|B|C)*'
  // , '(ab)(cd)'
  // , '.'
  // , '[a-z]'
  // , '!a'
  // , 'a | b'
  // , 'a & b'
  // , 'a*'
  // , '(ab)*'
  // , 'a+'
  // , '(ab)+'
  // , 'a?'
  // , 'a?b'
  // , '(ab)?'
  // , 'ab'
  // , 'ab & ac'
  // , 'abc & abd'
  // , '[a-z]'
  // , '[a-z][1-1]'
  // , 'a* b'
]

function testCompiler (sample) {
  log ('\n', sample, '\n===================\n')
  //log ([...tokenize (sample)])
  //log (JSON.stringify (parse (sample), null, 2))
  const store = new Compiler ()
  const ref = parse (sample, store)
  //log (store.inspect (ref))
  log (ref, [...store.entries ()])
}

// var derivs = new OneLevel ()
// var r = derivs.apply (['BOT'])
// log(derivs._inspect (r))
// var r = derivs.apply (['TOP'])
// log(derivs._inspect (r))

//parseSamples.forEach (testParse)
compileSamples.forEach (testCompiler)


//
//  Test actually running the regex
//

function testRun (sample, input) {
  log ('\nrun', sample, '(', input, ')\n===================\n')
  // log ([...tokenize (sample)])
  // log (JSON.stringify (parse (sample), null, 2))
  const store = new Compiler ()
  const ref = parse (sample, store)
  //log ('Runsss', ...store.nodes, ref )
  log (ref, [...store.entries()])
  log (store.run (ref, input))
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
testRun ('(a|b|c)*...', 'abc___')
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

/*
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

//*
//var r = new Regex ('[0-9]+[.-.]?[0-9]+')
//var r = new Regex ('a*bb+?*c*c+')
var samples = [
  'a|b|a|b',
  'a & a',
  'a|b|c|a|z|r|b|b|ua|b',
  'a*a*',
  'a*a',
  'aa*' ]
  for (let sample of samples) {
    var r = new Regex (sample)
    log (sample, r.state, [...r.store.entries()].map (([k,v]) => k === r.state ? ['==>', k, v].join(' ') : ['   ', k, v].join(' ')))
}
//*/


