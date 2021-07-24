const { parse } = require ('../src/grammar')
const { TermStore, Compiler, CharSet } = require ('./dfa')
const { RangeMap, RangeSet } =require ('./rangemap')
const TS = require ('./tokenset')

// Regex Top Level API

class Regex {

  constructor (arg = { }) {
    if (typeof arg === 'string') return new Regex ({ fromString:arg })
    const { store = new Compiler (), fromString = '' } = arg
    const delta = parse (String (fromString), store.apply.bind (store))
    Object.defineProperties (this, {
      store: { value:store },
      state: { value:delta.id },
      accepts: { value:delta.accepts },
      source: { value:fromString, enumerable:true }
    })
  }

  test (input) {
    return this.store.run (this.state, input) .accepts
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
    const r = this._regex.store.run (this.state, input)
    this.state = r.id
    this.accepts = r.accepts
    return this
  }

}

// TokenSet Top Level API
// Quickly added - TODO clean up

class TokenSet {

  constructor (dict, store = new TS.Compiler ()) {
    this.state = store.compile (dict)
    this.acceps = this.state.accepts
    this.store = store
  }

  exec (input, _pos = 0) {
    // TODO clean up the run API
    return this.store.run (input, _pos, this.state) .token
  }

}

// Exports
// -------

module.exports = { Regex, TokenSet, RangeMap, RangeSet, CharSet, _private:TS }
