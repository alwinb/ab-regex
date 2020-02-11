const log = console.log.bind (console)
const { tokenize, parse } = require ('./parser')
const { TermStore, Compiler } = require ('./dfa')

class Regex {
  
  constructor (arg = { }) {
    if (typeof arg === 'string') return new Regex ({ fromString:arg })
    const { state = 0, store = new Compiler (), fromString = null } = arg
    this.store = store
    this.state = fromString != null ? parse (String (fromString), this.store.apply) [0] : state
    this.accepts = this.store.run (this.state, '') .accepts
    this.position = 0
  }

  test (input) {
    return this.store.run (this.state, input) .accepts
  }

  // changes the state of the regex; should rather be on a 'Run' object
  reduce (input) {
    const r = this.store.run (this.state, input)
    this.state = r.id
    this.accepts = r.accepts
    this.position += input.length
    const { state, accepts, position } = this
    return { state, accepts, position }
  }

}

module.exports = Regex