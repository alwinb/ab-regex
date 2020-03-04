const log = console.log.bind (console)
const { tokenize, parse } = require ('./parser')
const { TermStore, Compiler } = require ('./dfa')

class Regex {
  
  constructor (arg = { }) {
    if (typeof arg === 'string') return new Regex ({ fromString:arg })
    const { store = new Compiler (), fromString = '' } = arg
    const p = parse (String (fromString), store)
    const info = store.lookup (p)
    this.store = store
    this.state = info.id
    this.accepts = info.accepts
    // for imcremental runs; should be in a 'Run' object
    this.position = 0
    Object.defineProperty (this, 'store', { enumerable: false })
    log (this)
  }

  test (input) {
    this.store.run (this.state, input) .accepts
    return this
  }

  // changes the state of the regex; should rather be on a 'Run' object
  reduce (input) {
    const r = this.store.run (this.state, input)
    this.state = r.id
    this.accepts = r.accepts
    this.position += input.length
    log ('after reduce;', this)
    return this
  }

}

module.exports = Regex
// var r = new Regex ('foo | bar+')
// r.test ('barrrrr____')
//
// r.reduce ('ba')
// r.reduce ('r')
// r.reduce ('rrrrrass')


//new Regex ('[a-z]|b')
//new Regex ('a|[a-a]')
//new Regex('a<3-5>').test ('aaaaaa')