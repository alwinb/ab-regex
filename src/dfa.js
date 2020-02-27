const log = console.log.bind (console)
const { Operators, Algebra } = require ('./signature')
const { cmpJs, Normalised, _print } = require ('./terms')
const { RangeList:RL, RangeSet:RS, Upto, Rest } = require ('./rangelist')

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

function Derivs (Terms = new Normalised) {

  class State {
    constructor (term, accepts, derivs) {
      this.id = term
      this.term = term
      this.accepts = accepts
      this.derivs = derivs   // a RangeList of successor states
    }

    toString () {
      const {term, accepts, derivs} = this
      return [
        term,
        _print (Terms.out, term),
        accepts,
        '[ '+RL.map (x => _print (Terms.out, x), derivs) .toArray ().join(' ')+' ]'
      ].join(' ')
    }
  }


return new (class Derivs {

  constructor () {
    this.bottom = new State (Terms.bottom, Accepts.bottom, new Rest (Terms.bottom))
    this.top    = new State (Terms.top,    Accepts.top,    new Rest (Terms.top))
    this.empty  = new State (Terms.empty,  Accepts.empty,  new Rest (Terms.bottom))
    this.any    = new State (Terms.any,    Accepts.any,    new Rest (Terms.empty))
    this.apply  = Algebra.fromObject (this)
  }

  group (x) { return x }

  step (char) {
    return new State (
      Terms.step (char),
      Accepts.step (char),
      RL.map (b => b ? Terms.empty : Terms.bottom, RS.eq (char), Terms.compare)
    )
  }

  range (char1, char2) {
    return new State (
      Terms.range (char1, char2),
      Accepts.range (char1, char2),
      RL.merge ((x,y) => x && y ? Terms.empty : Terms.bottom, RS.gte (char1), RS.lte (char2), Terms.compare)
    )
  }

  not ({ term, accepts, derivs }) {
    return new State (
      Terms.not (term),
      Accepts.not (accepts),
      RL.map (Terms.not, derivs, Terms.compare)
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
      RL.map (dr => Terms.conc (dr, starTerm), derivs, Terms.compare)
    )
  }

  plus ({ term, accepts, derivs }) {
    // ∂(r+) = ∂(rr*) = if accepts(r) then (∂r)r* else (∂r)r* | ∂r*
    //  else branch: ((∂r)r* | ∂r*) = ((∂r)r* | (∂r)r*) which is (∂r)r* // TODO check that (nullable?)
    return new State (
      Terms.plus (term),
      Accepts.plus (accepts),
      RL.map (dr => Terms.conc (dr, Terms.star (term)), derivs, Terms.compare)
    )
  }

  or (...args) {
    const derivsOr = (ds1, ds2) => RL.merge (Terms.or,  ds1, ds2, Terms.compare)
    return new State (
      Terms.or (...args.map (first)),
      Accepts.or (...args.map (second)),
      args.map(third).reduce (derivsOr)
    )
  }

  and (left, right) {
    return new State (
      Terms.and (left.term, right.term),
      Accepts.and (left.accepts, right.accepts), 
      RL.merge (Terms.and,  left.derivs, right.derivs, Terms.compare)
    )
  }

  conc (...args) {
    return args.reduce (this._conc2)
  }

  // TODO check this
  _conc2 (head, tail) {
    const left = RL.map (dr => Terms.conc (dr, tail.term), head.derivs, Terms.compare) // left = (∂r)s
    return new State (
      Terms.conc (head.term, tail.term),
      Accepts.conc (head.accepts, tail.accepts), 
      !head.accepts ? left : RL.merge (Terms.or, left, tail.derivs, Terms.compare) // ∂(rs) = (∂r)s + nu(r)∂s
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
  const Deltas = new Derivs (Terms)
  const heap = Terms._heap
  const table = []

  _catchUp ()

  function _catchUp () {
    for (let x = table.length; x < heap.length; x++) {
      const derivsOp = Algebra.fmap (y => table[y]) (heap[x])
      const unfold = Deltas.apply (...derivsOp)
      //log ('within Catch up to term', x, 'heap size', heap.length, [...heap.entries()], [...entries()])
      if (x !== unfold.term) {
        log ('got', unfold.toString (), "for term", x)
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
    return table[x]
  }

  function run (id, string = '') {
    log ('run\n', id, table[id].term, '=>')
    for (let char of string) {
      if (id === Terms.bottom) return table[id]
      if (id === Terms.top) return table[id]
      id = RL.lookup (char, table[id].derivs, cmpJs)
      log (char, '===>', id, table[id].accepts)
    }
    return table[id]
  }

  function inspect (id) {
    return table[id].toString()
  }

  function* entries () {
    for (let [k,item] of table.entries()) yield [k, item.toString()]
  }

  this.apply = apply
  this.run = run
  this.lookup = lookup
  this.entries = entries
  this.inspect = inspect
}

module.exports = { Derivs, Compiler, Normalised, _print }