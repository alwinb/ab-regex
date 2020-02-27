const log = console.log.bind (console)
const { Operators, Algebra } = require ('./signature')
const { Normalised, _print } = require ('./terms')
const { RangeList, RangeSet } = require ('./rangelist')

//
const {
  TOP, BOT, EMPTY,
  STEP, ANY, RANGE,
  GROUP, STAR, OPT, PLUS, NOT,
  AND, OR, CONC } = Operators
  
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
  star:   (...args) => true,
  plus:   (...args) => args[0],
  opt:    (...args) => true,
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


function OneLevel (Terms = new Normalised) {

  const Derivs = RangeList (compareChar, Terms.compare)
  const print = x => _print (Terms.out, x)

  class State {
    constructor (term, accepts, derivs) {
      this.id = term
      this.term = term
      this.accepts = accepts
      this.derivs = derivs   // a RangeList of successor states
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

  opt ({ term, accepts, derivs }) {
    // ∂(r?) = ∂(ε|r) = (∂ε|∂r) = (⊥|∂r) = ∂r
    return new State (
      Terms.opt (term), 
      Accepts.opt (accepts), 
      derivs
    )
  }

  star ({ term, accepts, derivs }) {
    const starTerm = Terms.star (term)
    return new State (
      starTerm,
      Accepts.star (accepts),
      Derivs.byMapping (dr => Terms.conc (dr, starTerm), derivs)
    )
  }

  plus ({ term, accepts, derivs }) {
    // ∂(r+) = ∂(rr*) = if accepts(r) then (∂r)r* else (∂r)r* | ∂r*
    //  else branch: ((∂r)r* | ∂r*) = ((∂r)r* | (∂r)r*) which is (∂r)r* // TODO check that (nullable?)
    return new State (
      Terms.plus (term),
      Accepts.plus (accepts),
      Derivs.byMapping (dr => Terms.conc (dr, Terms.star (term)), derivs)
    )
  }

  or (...args) {
    const derivsOr = (ds1, ds2) => Derivs.byMerging (Terms.or,  ds1, ds2)
    return new State (
      Terms.or (...args.map (first)),
      Accepts.or (...args.map (second)),
      args.map (third) .reduce (derivsOr)
    )
  }

  and (left, right) {
    return new State (
      Terms.and (left.term, right.term),
      Accepts.and (left.accepts, right.accepts), 
      Derivs.byMerging (Terms.and, left.derivs, right.derivs)
    )
  }

  conc (...args) {
    return args.reduce (this._conc2)
  }

  // TODO check this
  _conc2 (head, tail) {
    const left = Derivs.byMapping (dr => Terms.conc (dr, tail.term), head.derivs) // left = (∂r)s
    return new State (
      Terms.conc (head.term, tail.term),
      Accepts.conc (head.accepts, tail.accepts), 
      !head.accepts ? left : Derivs.byMerging (Terms.or, left, tail.derivs) // ∂(rs) = (∂r)s + nu(r)∂s
    )
  }

})}


// Compiler
// ========
// The compiler wraps around the Derivative, and Normalised (Term) algebras
// When a one-level unfolding is computed, the derivative terms are generated
// and stored in the normalised term store ...

function Compiler () {

  const Terms = new Normalised ()
  const Deltas = new OneLevel (Terms)
  const heap = Terms._heap
  const table = []
  this._table = table
  _catchUp ()

  function _catchUp () {
    for (let x = table.length; x < heap.length; x++) {
      const derivsOp = Algebra.fmap (y => table[y]) (heap[x])
      const unfold = Deltas.apply (...derivsOp)
      //log ('within Catch up to term', x, 'heap size', heap.length, [...heap.entries()], [...entries()])
      if (x !== unfold.term) {
        log ('got', unfold, "for term", x)
        throw new Error ('something went wrong, id mismatch')
      }
      table [x] = unfold
    }
  }


  function apply (...fx) {
    const term = Terms.apply (...fx)
    //const termOp = Algebra.fmap (y => heap[y]) (fx)
    //log ('Compiler apply', fx)//, [...entries()])
    const [nodesl, termsl] = [table, heap].map(x => x.length)
    //log ('begin Catch up to term', term, 'heap size', heap.length, [...heap.entries()], [...entries()])
    _catchUp ()
    //log ('end Catch up to term', term, 'heap size', heap.length, [...heap.entries()], [...entries()])
    return term
  }

  function lookup (x) {
    return table [x]
  }

  function run (id, string = '') {
    log ('run\n', id, table[id].term, '=>')
    for (let char of string) {
      if (id === Terms.bottom) return table[id]
      if (id === Terms.top) return table[id]
      id = table[id].derivs.lookup (char)
      log (char, '===>', id, table[id].accepts)
    }
    return table[id]
  }

  function inspect (id) {
    return table [id] .toString ()
  }

  function* entries () {
    for (let [k,item] of table.entries()) yield [k, item.toString ()]
  }

  this.apply = apply
  this.run = run
  this.lookup = lookup
  this.entries = entries
  this.inspect = inspect
}

module.exports = { OneLevel, Compiler, Normalised, _print }