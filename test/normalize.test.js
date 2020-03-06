const log = console.log.bind (console)
const { tokenize, parse } = require ('../src/parser')
const { Shared, Normalised, _print } = require ('../src/terms')
const samples = require ('./samples')

//
//  Test Normalisation
//

function testNormalize (sample) {
  const store = new Normalised ()
  const ref = parse (sample, store)
  log ()
  log (sample, '==>', _print (store.out, ref))
  log ('Store', [...store], 'item', ref)
  log ('=========================')
}

samples.forEach (testNormalize)

