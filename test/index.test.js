const { Regex, TokenSet } = require ('../src')
const assert = require ('assert') .strict
const log = console.log.bind (console)

// Test Regex Object
// =================

log ('\nTest Regex Object')
log ('=================\n')

// General

var r = new Regex ('foo | bar+')
assert.equal (r.test (''), false)
assert.equal (r.test ('foo'), true)
assert.equal (r.test ('fo'), false)
assert.equal (r.test ('bar'), true)
assert.equal (r.test ('barr'), true)
assert.equal (r.test ('barrrr'), true)
assert.equal (r.test ('barrrrs'), false)

// Quantifier

var r = new Regex ('a<3-5>')
assert.equal (r.test (''), false)
assert.equal (r.test ('aa'), false)
assert.equal (r.test ('aaa'), true)
assert.equal (r.test ('aba'), false)
assert.equal (r.test ('aaaaa'), true)
assert.equal (r.test ('aaaaaa'), false)

var r = new Regex ('ab*x')
assert.equal (r.test ('ax'), true)
assert.equal (r.test ('abx'), true)
assert.equal (r.test ('abbx'), true)
assert.equal (r.test ('abbbx'), true)

var r = new Regex ('ab?x')
assert.equal (r.test ('ax'), true)
assert.equal (r.test ('abx'), true)
assert.equal (r.test ('abbx'), false)
assert.equal (r.test ('abbbx'), false)

var r = new Regex ('ab+x')
assert.equal (r.test ('ax'), false)
assert.equal (r.test ('abx'), true)
assert.equal (r.test ('abbx'), true)
assert.equal (r.test ('abbbx'), true)

var r = new Regex ('(ab)*x')
assert.equal (r.test ('x'), true)
assert.equal (r.test ('abx'), true)
assert.equal (r.test ('ababx'), true)
assert.equal (r.test ('abababx'), true)
assert.equal (r.test ('ababax'), false)

var r = new Regex ('(ab)?x')
assert.equal (r.test ('x'), true)
assert.equal (r.test ('abx'), true)
assert.equal (r.test ('ababx'), false)
assert.equal (r.test ('abababx'), false)
assert.equal (r.test ('ababax'), false)

var r = new Regex ('(ab)+x')
assert.equal (r.test ('x'), false)
assert.equal (r.test ('abx'), true)
assert.equal (r.test ('ababx'), true)
assert.equal (r.test ('abababx'), true)
assert.equal (r.test ('ababax'), false)

// Any char

var r = new Regex ('a.c')
assert.equal (r.test ('ac'), false)
assert.equal (r.test ('axc'), true)
assert.equal (r.test ('acc'), true)
assert.equal (r.test ('acd'), false)
assert.equal (r.test ('dcc'), false)

// Conjunction and negation

var r = new Regex ('(. &!(X|Y))*')
assert.equal (r.test ('aXYc'), false)
assert.equal (r.test ('axc'), true)
assert.equal (r.test ('Yyc'), false)
assert.equal (r.test ('aaX'), false)
assert.equal (r.test ('acc'), true)

log ('All OK')

// Test TokenSet Object
// ====================

log ('\nTest TokenSet Object')
log ('====================\n')

//

const spec = {
  atom:'true|false|null',
  symbol:'[a-z]+'
}

const t = new TokenSet (spec)

// log (...t.store._inspect())
log (t.exec ('foo bar'))
log (t.exec ('fofalse bar', 0))
log (t.exec ('fofalse bar', 2))


// Incremental/ reducer
// ====================

var r = new Regex ('ab*x')
log ('\n', r)
log ('Regex.test', r.test ('abbbx'))
red = r.createReducer ()
log ('\nReduce\n======')
for (let chunk of ['ab', 'bbb', 'x', 'a']) {
  log (chunk)
  red.write (chunk)
  log (red)
}

