const Map = require ('./aatree.js')
const { fmap, Algebra } = require ('./signature')
const { parse } = require ('../src/grammar')
const { Normalised } = require ('./normalize')
const { RangeMap } = require ('./rangemap')
const { OneLevel } = require ('./dfa')
const log = console.log.bind (console)
const compare = (t1, t2) => t1 < t2 ? -1 : t1 > t2 ? 1 : 0


// TokenSet
// ========

// A TokensSpec is stored as a list of pairs [token-id, normalised-regex-ref]
// with at most one token-id per unique regex-ref

const compareArray = compareElement => (a, b) => {
  let r = compare (a.length, b.length), i = 1
  for (let i = 0; !r && i < a.length; i++)
    r = r || compareElement (a[i], b[i])
  return r
}

const compareSpecPair = ([name1, id1], [name2, id2]) =>
  compare (name1, name2) || compare (id1, id2)

const compareSpec =
  compareArray (compareSpecPair)

function mergeSpecs (pairs1, pairs2) {
  // log ('mergeSpecs', pairs1, pairs2)
  const pairs = [], marks = new Set ()

  for (const [k,v] of pairs1) if (v && !marks.has(v)) {
    marks.add (v)
    pairs.push ([k, v])
  }

  for (const [k,v] of pairs2) if (v && !marks.has (v)) {
    marks.add (v)
    pairs.push ([k, v])
  }

  if (!pairs.length) return [[null,0]]
  return pairs

  // for each label in pairs2 that is already in pair1, drop it?
  // Or? ... no....
}

// TokenState
// ----------
// A TokenState represents a 'one-level-unfolding' of a TokensSpec.
// It consists of a 'label' being null or a tokenName,
// and 'derivs', being a RangeMap from characters to a TokensSpec.

// A _coalgebraic_ compiler. It coalgebraically unfolds the root TokenState.
// It does however compile the RegEx OneLevel.States algebraically (internally).

const RM = RangeMap (compare, compare)
const RM1 = RangeMap (compare, compareSpec)

function Compiler (Terms = new Normalised ()) {

  const Derivs = new OneLevel (Terms)
  const heap = Derivs._heap
  let specMap = new Map (compareSpec)
  const _states = [] // regex / OneLevel.States
  const  states = [] // tokenSet / StatesAlge

  //

  class State {

    constructor (label, derivs) {
      this.accepts = label
      this.derivs = derivs
    }
  
    static fromSpec (spec) {
      let s1 = State.from (null, Derivs.bottom)
      for (const [k, v] of spec) {
        const s2 = State.from (k, compileDeriv (v))
        s2.id = spec
        s1 = s1.add (s2)
      }
      return s1
    }

    // from - creates a State from a OneLevel.State
    // i.e. from a one level unfolded regex

    static from (label, { term, accepts, derivs }) {
      label = term === 0 ? null : label
      derivs = RM1.mapped (_ => [[label, _]], derivs)
      return new State (accepts ? label : null, derivs)
    }
  
    // merge - combines two lexerStates.
    // This implements the concat / 'merge' operation of the TokenSet algebra

    static merge (s1, s2) {
      const label = s1.accepts == null ? s2.accepts : s1.accepts
      const derivs = RM1.merged (mergeSpecs, s1.derivs, s2.derivs)
      return new State (label, derivs)
    }

    add (s2) { return State.merge (this, s2) }

  }

  //

  function get (id)
    { return states[id] }

  function compile (dict)
    { return _compile (fromDict (dict)) }

  //

  function compileDeriv (ref) {
    // log ('compileDeriv', ref)
    for (let i = _states.length; i <= ref; i = _states.length) {
      // log ('missing state', i, heap[i])
      let dop = fmap (y => _states[y]) (heap[i])
      let d = Derivs.apply (...dop)
      delete (d.id)
      // log ('created', d)
      _states[d.term] = d
    }
    // log ('compiledDeriv', ref, _states[ref])
    return _states[ref]
  }

  function addSpec (x) {
    const cursor = specMap.select (x)
    if (cursor.found) return cursor.value.id
    const state = State.fromSpec (x)
    const ref = states.push (state) -1
    // state.spec = x
    state.id = ref
    specMap = cursor.set (state)
    return ref
  }

  function fromDict (dict) {
    const pairs = [], marks = new Set ()
    for (const k in dict) {
      const ref = parse (dict[k], Terms.apply)
      if (!marks.has (ref)) {
        marks.add (ref)
        pairs.push ([k, ref])
      }
    }
    return pairs
  }

  function _compile (spec) {
    // log ('compile', spec)
    const ref = addSpec (spec)
    const state = states[ref]
    state.derivs = RM.mapped (addSpec, state.derivs)
    // log ('states before', ref)
    for (let todo = ref + 1; todo < states.length; todo++) {
      const state = states [todo]
      state.derivs = RM.mapped (addSpec, state.derivs)
    }
    return ref
  }

  function run (input, start = 0, id = 1) {
    let state = states [id]
    let match = state.accepts != null ? [state.accepts, start, start] : null
    let pos = start
    for (let l = input.length; pos<l; pos++) {
      // log (match, state)
      id = state.derivs.lookup (input.charCodeAt (pos)) // TODO, codePoint instead of charCode
      state = states [id]
      if (state.accepts != null)
        match = [state.accepts, start, pos+1]
      // log (match, state)
    }
    const token = match ? [match[0], input.substring (match[1], match[2])] : null
    const r = { token, pos: match ? match[2] : pos, pos_:pos }
    // log (r)
    return r
  }

  function vacuum () {
    // TODO
    // OK so that'd do a trace from the root state
    // and only include the visited spec-ids
  }

  function* _inspect () {
    for (let s of states)
      yield [s.id, s.accepts, String (s.derivs) ]
  }

  // ### Init...
  const fail = _compile ([[null, 0]])
  Object.assign (this, { fail, states, compile, get, run, _inspect })
}


// Exports
// -------

module.exports = { Compiler, compare, compareArray }