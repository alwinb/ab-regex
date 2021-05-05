const { parse } = require ('../src/grammar')
const { TermStore, Compiler } = require ('./dfa')

class Regex {

  constructor (arg = { }) {
    if (typeof arg === 'string') return new Regex ({ fromString:arg })
    const { store = new Compiler (), fromString = '' } = arg
    const delta = parse (String (fromString), store.apply.bind (store))
    Object.defineProperties (this, {
      _store: { value:store },
      state: { value:delta.id },
      accepts: { value:delta.accepts },
      source: { value:fromString, enumerable:true }
    })
  }

  test (input) {
    return this._store.run (this.state, input) .accepts
  }

  createReducer () {
    return new Reducer (this)
  }
}

class Reducer {

  constructor (regex) {
    Object.defineProperties (this, {
      _regex: { value:regex }
    })
    this.state = regex.state
    this.accepts = regex.accepts
  }

  write (input) {
    const r = this._regex._store.run (this.state, input)
    this.state = r.id
    this.accepts = r.accepts
    return this
  }

}

module.exports = Regex
