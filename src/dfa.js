const log = console.log.bind (console)
const json = x => JSON.stringify (x, null, 2)
const { Algebra } = require ('./signature')
const { Normalised, _print } = require ('./normalize')
const { RangeList, RangeSet } = require ('./rangelist')

// One Level Unfoldings
// These can be computed algebraically
// depending on two algebras: 
// Normalised terms, and 'Accepts'

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

// Derivs/ States is the algebra
// based on the previously mentioned two

const first = ({term}) => term
const second = ({accepts}) => accepts
const third = ({derivs}) => derivs

const cmpJs = (t1, t2) => t1 < t2 ? -1 : t1 > t2 ? 1 : 0
const compareChar = cmpJs
const CharSet = RangeSet (compareChar)


function OneLevel (Terms = new Normalised ()) {

  const Derivs = RangeList (compareChar, Terms.compare)
  const print = x => _print (Terms.out, x)

  class State {
    constructor (term, accepts, derivs) {
      this.id = term
      this.term = term
      this.accepts = accepts
      this.derivs = derivs   // a RangeList of successor states
    }

    *[Symbol.iterator] () {
      const { id, term, accepts, derivs } = this
      yield* [id, print (term), accepts, ... RangeList (compareChar, cmpJs). byMapping (print, derivs) .toArray () ]
    }

    toString () {
      const { term, accepts, derivs } = this
      return [
        term,
        print (term),
        accepts,
        `[ ${ RangeList (compareChar, cmpJs).byMapping (print, derivs) } ]`
        //derivs.toString ()
      ] .join (' ')
    }

  }

  //
  //  And not that this works
  //  want to normalise the delimiters
  //

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
      Derivs.byMapping (b => b ? Terms.empty : Terms.bottom, CharSet.fromElement (char))
    )
  }

  range (char1, char2) {
    return new State (
      Terms.range (char1, char2),
      Accepts.range (char1, char2),
      Derivs.byMapping (b => b ? Terms.empty : Terms.bottom, CharSet.fromRange (char1, char2))
    )
  }

  not ({ term, accepts, derivs }) {
    return new State (
      Terms.not (term),
      Accepts.not (accepts),
      Derivs.byMapping (Terms.not, derivs)
    )
  }

  repeat ({ term, accepts, derivs }, least, most) {
    //log ('repeat', term, derivs.toString(), least, most)
    //log ('repeatTerm',  Derivs.byMapping (dr => Terms.conc (dr, repeatTerm), derivs).toString())
    const newTerm = Terms.repeat (term, least, most) // NB callin gthis first; keep the heap ordered
    const repeatTerm = Terms.repeat (term, Math.max (least-1, 0), Math.max (most-1, 0))
    return new State (
      newTerm,
      Accepts.repeat (accepts, least, most),
      Derivs.byMapping (dr => Terms.conc (dr, repeatTerm), derivs)
      // ∂r<l,m> = ∂r<max(l-1, 0), m-1>
    )
  }

  ors (...as) {
    return as.reduce (this.or.bind (this))
  }

  or (left, right) {
    return new State (
      Terms.or (left.term, right.term),
      Accepts.or (left.accepts, right.accepts), 
      Derivs.byMerging (Terms.or, left.derivs, right.derivs)
    )
  }

  and (left, right) {
    return new State (
      Terms.and (left.term, right.term),
      Accepts.and (left.accepts, right.accepts), 
      Derivs.byMerging (Terms.and, left.derivs, right.derivs)
    )
  }

  concs (...as) {
    return as.reduce (this.conc.bind(this))
  }

  conc (head, tail) {
    //log ('calling conc', head, tail)
    const newTerm = Terms.conc (head.term, tail.term)
    const left = Derivs.byMapping (dr => Terms.conc (dr, tail.term), head.derivs) // left = (∂r)s
    return new State (
      newTerm,
      Accepts.conc (head.accepts, tail.accepts), 
      !head.accepts ? left : Derivs.byMerging (Terms.or, left, tail.derivs) // ∂(rs) = (∂r)s + nu(r)∂s
    )
  }

})}


// Compiler
// ========
// The compiler wraps around the Derivative, and Normalised (Term) algebras
// When a one-level unfolding is computed, the derivative terms that are generated
// in the process are stored in the Normalised store. 

function Compiler () {
  const Derivs = new OneLevel ()
  const heap = Derivs._heap
  const states = []
  this.apply = apply.bind (this)

  for (let x of heap)
    states.push (Derivs.apply (...x))

  this._inspect = function* () {
    for (let s of states)
      yield s+''
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
      console.log (`Error in ${this.constructor.name}.apply`)
      console.log (`Calling ${json(fx[0])} on `, fx.slice(1), 'in Algebra'. this.constructor.name)
      console.log (this [Symbol.iterator] ? [...this._inspect()] : this)
      throw e
    }
  }

  this.run = function (id, string = '') {
    //log ('run\n', id, states[id], '=>')
    for (let char of string) {
      if (id === Derivs.bottom.id) return states[id]
      if (id === Derivs.top.id) return states[id]
      id = states[id].derivs.lookup (char)
      //log (char, '===>', id, states[id].accepts)
    }
    return states [id]
  }

}

module.exports = { OneLevel, Compiler, Normalised }