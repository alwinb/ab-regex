const log = console.log.bind (console)
const { tokenize, parse } = require ('./parser')
const { TermStore, Compiler } = require ('./dfa')

class Regex {
  
  constructor (string) {
    this._store = new Compiler ()
    this._start = parse (string, this._store.apply) [0]
  }
  
  test (input) {
    return this._store.run (this._start, input) .accepts
  }

}

module.exports = Regex

/*
var r = new Regex ('ab*x')
log(r)
log (r.test ('abbbsx'))
//*/