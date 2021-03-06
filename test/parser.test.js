const log = console.log.bind (console)
const { parse } = require ('../src/grammar')
const { Shared, _print } = require ('../src/normalize')
const samples = require ('./samples')

function testParse (sample) {
  log ('\n', sample)
  log (JSON.stringify (parse (sample), null, 2))
}

function testStore (sample) {
  const store = new Shared ()
  const ref = parse (sample, store.apply)
  log ()
  log (sample, '==>', _print (store.out, ref))
  log ('Store', [...store], 'item', ref)
  log ('----------------------')
}



log ('Test Parse')
log ('==========')
samples.forEach (testParse)


log ('\nTest Store')
log ('==========')
samples.forEach (testStore)
