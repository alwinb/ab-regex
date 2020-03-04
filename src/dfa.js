const log = console.log.bind (console)
const { Algebra } = require ('./signature')
const { Normalised, _print } = require ('./terms')
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
    const repeatTerm = Terms.repeat (term, Math.max(least-1, 0), most-1)
    //log ('repeatTerm',  Derivs.byMapping (dr => Terms.conc (dr, repeatTerm), derivs).toString())
    return new State (
      Terms.repeat (term, least, most),
      Accepts.repeat (accepts, least, most),
      Derivs.byMapping (dr => Terms.conc (dr, repeatTerm), derivs)
      // ∂r<l,m> = ∂r<max(l-1, 0), m-1>
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
    //log ('conc', args)
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
// When a one-level unfolding is computed, the derivative terms that are generated
// in the process are stored in the Normalised store. 

function Compiler (Terms = new Normalised) {

  const Deltas = new OneLevel (Terms)
  const heap = Terms._heap
  const states = []

  return new (class Compiler {
    
    constructor () {
      this._catchUp ()
      this.apply = this.apply.bind (this)
    }

    _catchUp () {
      for (let x = states.length; x < heap.length; x++) {
        const derivsOp = Algebra.fmap (y => states[y]) (heap[x])
        const unfold = Deltas.apply (...derivsOp)
        //log ('within Catch up to term', x, 'heap size', heap.length, [...heap.entries()], [...entries()])
        if (x !== unfold.term) {
          log ('got', unfold, "for term", x)
          throw new Error ('something went wrong, id mismatch')
        }
        states [x] = unfold
      }
    }

    apply (...fx) {
      const term = Terms.apply (...fx)
      //const termOp = Algebra.fmap (y => heap[y]) (fx)
      //log ('Compiler apply', fx)//, [...entries()])
      const [nodesl, termsl] = [states, heap].map(x => x.length)
      //log ('begin Catch up to term', term, 'heap size', heap.length, [...heap.entries()], [...entries()])
      this._catchUp ()
      //log ('end Catch up to term', term, 'heap size', heap.length, [...heap.entries()], [...entries()])
      return term
    }

    lookup (x) {
      return states [x]
    }

    run (id, string = '') {
      log ('run\n', id, states[id].term, '=>')
      for (let char of string) {
        if (id === Terms.bottom) return states[id]
        if (id === Terms.top) return states[id]
        id = states[id].derivs.lookup (char)
        log (char, '===>', id, states[id].accepts)
      }
      return states [id]
    }

    *[Symbol.iterator] () {
      for (let i = 0, l = states.length; i<l; i++)
        yield states[i]
    }

    *_inspect () {
      for (let i = 0, l = states.length; i<l; i++)
        yield [i, states[i].toString()]
    }

  })
}


module.exports = { OneLevel, Compiler, Normalised }