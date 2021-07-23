const { Compiler } = require ('../src/tokenset')
const assert = require ('assert') .strict
const log = console.log.bind (console)
const raw = String.raw


// Test TokenSet
// =============

const spec = {
  atom:    `null`,
  symbol:  `[a-zA-Z] [a-zA-Z0-9]*`,
  number:  `0 | [1-9] [0-9]*`,
  bigint:  `0n | [1-9] [0-9]* n`,
  octal:   `0 (o|O) [0-7]+`,
  bin:     `0 (b|B) [0-1]+`,
  hex:     `0 (x|X) ([0-9A-Fa-f])+`,
  space:   raw `(" " | "\t")+`,
  newline: raw `"\r\n" | "\r" | "\n"`,
  // other: '.+',
}


log ('\nTest TokenSet -  Compile and Run')
log ('================================\n')

const store = new Compiler ()
const root = store.compile (spec)

var samples = [
  { input: 'null '
  , token: [ 'atom', 'null' ] },

  { input: 'nulls '
  , token: [ 'symbol', 'nulls' ] },

  { input: '1n '
  , token: [ 'bigint', '1n' ] },

  { input: '019 '
  , token: [ 'number', '0' ] },

  { input: '019 ', pos:1
  , token: [ 'number', '19' ] },

  { input: '019 ', pos: 3
  , token: [ 'space', ' ' ] },

  { input: '0x129Fa- '
  , token: [ 'hex', '0x129Fa' ] },

  { input: '\n '
  , token: [ 'newline', '\n' ] },

  { input: '\n\r '
  , token: [ 'newline', '\n' ] },

  { input: '\r\n '
  , token: [ 'newline', '\r\n' ] },

  { input: '\r '
  , token: [ 'newline', '\r' ] },

  { input: '\t   \t'
  , token: [ 'space', '\t   \t' ] },

]

for (const s of samples) {
  const r = store.run (s.input, s.pos || 0)
  log ('=>', 'pos:', r.pos+', seen:', r.pos_, r.token)
  assert.deepEqual (s.token, r.token)
}
