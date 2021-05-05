const log = console.log.bind (console)
const { parse } = require ('../src/grammar')
const { Shared, Normalised, _print } = require ('../src/normalize')
const samples = require ('./samples')

//
//  Test Normalisation
//

function testNormalize (sample) {
  const store = new Normalised ()
  const ref = parse (sample, store.apply)
  log ()
  log (sample, '==>', _print (store.out, ref))
  log ('Store', [...store], 'item', ref)
  log ('=========================')
}

samples.forEach (testNormalize)

