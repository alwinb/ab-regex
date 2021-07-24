const log = console.log.bind (console)
const json = x => JSON.stringify (x, null, 2)
const { Algebra } = require ('./signature')
const { Normalised, _print } = require ('./normalize')
const { RangeMap, RangeSet } = require ('./rangemap')

// CharSets
// --------

const cmpJs = (t1, t2) =>
  t1 < t2 ? -1 : t1 > t2 ? 1 : 0

const above = cp =>
  RangeSet.below (cp + 1)

const CharMap = RangeMap (cmpJs, cmpJs, { above })
const CharSet = RangeSet (cmpJs, { above })


// One Level Unfoldings
// --------------------
// These can be computed algebraically, depending on two algebras: 
// Normalised terms, and 'Accepts'
// The carrier of the 'Accepts' algebra is the set { true, false }

const Accepts = {
  bottom: false,
  top:    true,
  empty:  true,
  any:    false,
  step:   (...args) => false,
  range:  (...args) => false,
  group:  (...args) => args[0],
  repeat: (a0, l,m) => l === 0 ? true : a0,
  not:    (...args) => !args[0],
  or:     (...args) => args.includes (true),
  and:    (...args) => !args.includes (false),
  conc:   (...args) => !args.includes (false),
}

// 'OneLevel' is a regular expression algebra that has as a carrier
// the set of one-level unfoldings. Thus, it is the algebra that implements
// the regular expression coalgebra. Yes that sounds confusing :)
// A one-level unfolding, is a State object, consisting of a normalised term as id,
// a boolen indicating if this is an accepting state, and a RangeMap, from
// chars to normalised derivative terms. 

const first = ({term}) => term
const second = ({accepts}) => accepts
const third = ({derivs}) => derivs
const cp = (str) => str.codePointAt (0)

function OneLevel (Terms = new Normalised ()) {

  const Derivs = RangeMap (cmpJs, Terms.compare)
  const print = x => _print (Terms.out, x)

  class State {
    constructor (term, accepts, derivs) {
      this.id = term
      this.term = term
      this.accepts = accepts
      this.derivs = derivs   // a RangeMap of successor states
    }

    *[Symbol.iterator] () {
      const { id, term, accepts, derivs } = this
      yield* [id, print (term), accepts, ... Derivs.mapped (print, derivs) .store ]
    }

    toString () {
      const { term, accepts, derivs } = this
      return [
        term,
        print (term),
        accepts,
        `[ ${ Derivs.mapped (print, derivs) } ]`
        //derivs.toString ()
      ] .join (' ')
    }
  }


  return new (class OneLevel {

  constructor () {
    this.bottom = new State (Terms.bottom, Accepts.bottom, Derivs.fromConstant (Terms.bottom))
    this.top    = new State (Terms.top,    Accepts.top,    Derivs.fromConstant (Terms.top))
    this.empty  = new State (Terms.empty,  Accepts.empty,  Derivs.fromConstant (Terms.bottom))
    this.any    = new State (Terms.any,    Accepts.any,    Derivs.fromConstant (Terms.empty))
    this.apply  = Algebra.fromObject (this)
    
    this._heap = Terms._heap
  }

  *[Symbol.iterator] () {
    yield* Terms._heap
  }

  group (x) { return x }

  step (char) {
    return new State (
      Terms.step (char),
      Accepts.step (char),
      Derivs.mapped (b => b ? Terms.empty : Terms.bottom, CharSet.fromElement (cp(char)))
    )
  }

  range (char1, char2) {
    return new State (
      Terms.range (char1, char2),
      Accepts.range (char1, char2),
      Derivs.mapped (b => b ? Terms.empty : Terms.bottom, CharSet.fromRange (cp(char1), cp(char2)))
    )
  }

  not ({ term, accepts, derivs }) {
    return new State (
      Terms.not (term),
      Accepts.not (accepts),
      Derivs.mapped (Terms.not, derivs)
    )
  }

  repeat ({ term, accepts, derivs }, least, most) {
    //log ('repeat', term, derivs.toString(), least, most)
    //log ('repeatTerm',  Derivs.mapped (dr => Terms.conc (dr, repeatTerm), derivs).toString())
    const newTerm = Terms.repeat (term, least, most) // NB calling this first; keep the heap ordered
    const repeatTerm = Terms.repeat (term, Math.max (least-1, 0), Math.max (most-1, 0))
    return new State (
      newTerm,
      Accepts.repeat (accepts, least, most),
      Derivs.mapped (dr => Terms.conc (dr, repeatTerm), derivs)
      // ∂r<l,m> = ∂r<max(l-1, 0), m-1>
    )
  }

  or (...as) {
    return as.reduce (this.or2.bind (this))
  }

  or2 (left, right) {
    return new State (
      Terms.or (left.term, right.term),
      Accepts.or (left.accepts, right.accepts), 
      Derivs.merged (Terms.or, left.derivs, right.derivs)
    )
  }

  and (...as) {
    return as.reduce (this.and2.bind (this))
  }

  and2 (left, right) {
    return new State (
      Terms.and (left.term, right.term),
      Accepts.and (left.accepts, right.accepts), 
      Derivs.merged (Terms.and, left.derivs, right.derivs)
    )
  }

  conc (...as) {
    return as.reduce (this.conc2.bind(this))
  }

  conc2 (head, tail) {
    //log ('calling conc', head, tail)
    const newTerm = Terms.conc (head.term, tail.term)
    const left = Derivs.mapped (dr => Terms.conc (dr, tail.term), head.derivs) // left = (∂r)s
    return new State (
      newTerm,
      Accepts.conc (head.accepts, tail.accepts), 
      !head.accepts ? left : Derivs.merged (Terms.or, left, tail.derivs) // ∂(rs) = (∂r)s + nu(r)∂s
    )
  }

})}


// Compiler
// ========
// The compiler wraps around the OneLevel, and Normalised (Term) algebras
// When a one-level unfolding is computed, the derivative terms that are generated
// in the process are stored in the Normalised store. These are then iteratively unfolded
// as well, until no new terms appear. 

function Compiler () {
  const Derivs = new OneLevel ()
  const heap = Derivs._heap
  const states = []
  this.apply = apply.bind (this)

  for (let x of heap)
    states.push (Derivs.apply (...x))

  this._inspect = function* () {
    for (let s of states)
      yield String (s)
  }

  this[Symbol.iterator] = function* () {
    for (let s of states)
      yield s
  }

  function apply (...fx) {
    try {
      let i = states.length-1
      const d = Derivs.apply (...fx)
      states[d.id] = d
      //log ('compile started at', i, 'created', d.id)
      //log (states.map (x => x == null ? null : x.id))
      for (; i<heap.length; i++) if (!states[i]) {
          let dop = Algebra.fmap (y => states[y]) (heap[i])
          //log ('missing state', i, dop)
          let d = Derivs.apply (...dop)
          //log ('created', d)
          states[d.id] = d
      }
      return d
    }
    catch (e) {
      console.log (`Error in ${ this.constructor.name }.apply`)
      console.log (`Calling ${ json(fx[0]) } on ${ fx.slice (1) }in Algebra${ this.constructor.name }`)
      console.log (this [Symbol.iterator] ? [...this._inspect ()] : this)
      throw e
    }
  }

  this.run = function (id, string = '') {
    //log ('run\n', id, states[id], '=>')
    for (let char of string) {
      const cp = char.codePointAt (0)
      // log ({cp})
      if (id === Derivs.bottom.id) return states[id]
      if (id === Derivs.top.id) return states[id]
      id = states[id].derivs.lookup (cp)
      // log (String.fromCodePoint(cp), '===>', id, states[id].accepts)
    }
    return states [id]
  }

}

module.exports = { OneLevel, Compiler, Normalised }