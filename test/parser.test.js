const { parse, Algebra, charSetOpNames } = require ('../src/signature')
const { Shared, _print } = require ('../src/normalize')
const { CharSet } = require ('../src/charset')
const inspect = require ('util').inspect
const log = console.log.bind (console)

var samples = require ('./samples')
var samples = [
  '[^a-z]',
  '[a-zA-Z&]'
]

function testParse (sample) {
  log ('parse:', sample, '==>')
  log (inspect (parse (sample), { depth:Infinity }))
  log ('\n----------\n')
}

const charSetApply =
  Algebra.fromObject (CharSet, charSetOpNames)

function testStore (sample) {
  const store = new Shared ()
  const ref = parse (sample, store.apply, charSetApply)
  // log (sample, '==>', _print (store.out, ref))
  log ('Store', [...store], 'item', ref)
  log ('\n----------\n')
}


log ('\nTest Parse')
log ('==========\n')
samples.forEach (testParse)


log ('\nTest Store')
log ('==========\n')
samples.forEach (testStore)
