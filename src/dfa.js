const Map = require ('./aatree')
const { RangeList:RL, RangeSet:RS, Upto, Rest } = require ('./rangelist')
const log = console.log.bind (console)

//
//  Signature

const TEST = 'TEST'
  , STEP = 'STEP'
  , TOP  = 'TOP'
  , BOT  = 'BOT'
  , UNIT = 'UNIT'
  , NOT  = 'NOT'
  , STAR = 'STAR'
  , AND  = 'AND'
  , OR   = 'OR'
  , CONC = 'CONC'
  , GROUP = 'GROUP'

const signature =
  { [TEST]: 0
  , [STEP]: 0
  , [UNIT]: 0
  , [TOP]: 0
  , [BOT]: 0
  , [GROUP]: 1
  , [NOT]: 1
  , [STAR]: 1
  , [AND]: 2
  , [OR]: 2
  , [CONC]: 2 }

// Morphism part

const F = fn => tm => {
  const [c, x, y] = tm
  return (
      c === TEST  ? tm
    : c === STEP  ? tm
    : c === UNIT  ? tm
    : c === TOP   ? tm
    : c === BOT   ? tm
    : c === GROUP ? [c, fn(x)]
    : c === NOT   ? [c, fn(x)]
    : c === STAR  ? [c, fn(x)]
    : c === AND   ? [c, fn(x), fn(y)]
    : c === OR    ? [c, fn(x), fn(y)]
    : c === CONC  ? [c, fn(x), fn(y)]
    : undefined ) }


// JavaScript's built-in total order

const cmp_js = (t1, t2) =>
  t1 < t2 ? -1 : t1 > t2 ? 1 : 0

// Provided a total order on X,
//  produces a total order on FX

const compareFNode = cmp_x => (a, b) => {
  const c = a[0], d = b[0]
  const r = cmp_js (c, d)
    || (c === TEST || 0) && cmp_js (a[1], b[1])
    || (c === STEP || 0) && cmp_js (a[1], b[1])
    || (signature [c] > 0 || 0) && cmp_x (a[1], b[1])
    || (signature [c] > 1 || 0) && cmp_x (a[2], b[2])
  return r }


//
//  Normalised term algebra

// This is not a full normalisation of terms, but a preliminary simplification. 
// I am doing this on the term algebra (initial algebra) directly,
// on the elements of which I furthermore, use primitive js comparisons. 

function _normalize (out, inn, fx) {
  //log ('norm', fx)
  const [op, a1, a2] = fx
  switch (op) {

    case GROUP:
      return fx[1]

    case STEP: 
      return inn (fx)

    case TEST: case TOP: case BOT: case UNIT:
      return inn (fx)

    case NOT: {
      const sub = out (a1)
      return sub[0] === NOT ? sub[1] : inn (fx)
    }

    case STAR: {
      const sub = out (a1)
      const [c1] = sub
      return (
          c1 === STAR ? a1
        : c1 === UNIT ? a1
        : c1 === TOP  ? a1
        : c1 === BOT  ? inn ([UNIT])
        : inn (fx) )
    }

    case AND: {
      const t1 = out (a1), t2 = out (a2)
      const [c1] = t1, [c2] = t2
      return (
          c1 === TOP ? a2
        : c2 === TOP ? a1
        : c1 === BOT ? a1
        : c2 === BOT ? a2
        : a1  <  a2 ? inn ([op, a1, a2])
        : a1 === a2 ? a1
        : a1  >  a2 ? inn ([op, a2, a1])
        : inn (fx) )
    }

    case OR: {
      const t1 = out (a1), t2 = out (a2)
      const [c1] = t1, [c2] = t2
      return (
          c1 === BOT ? a2
        : c2 === BOT ? a1
        : c1 === TOP ? a1
        : c2 === TOP ? a2
        : a1  <  a2 ? inn ([op, a1, a2])
        : a1 === a2 ? a1
        : a1  >  a2 ? inn ([op, a2, a1])
        : inn (fx) )
    }
  
    case CONC: {
      const t1 = out (a1), t2 = out (a2)
      const [c1] = t1, [c2] = t2
      return (
          c1 === UNIT ? a2
        : c2 === UNIT ? a1
        : c1 === BOT  ? a1
        : c2 === BOT  ? a2
        : inn (fx) )
    }

    default:
      throw new Error ('invalid AST node ' + JSON.stringify (fx, null, 2))
  }
}


//
// Store for normalized terms

function _init (apply) {
  this.bottom = apply ([BOT])
  this.top = apply ([TOP])
  this.unit = apply ([UNIT])
  this.step = c => apply ([STEP, c])
  this.not = x => apply ([NOT, x])
  this.star = x => apply ([STAR, x])
  this.and = (x, y) => apply ([AND, x, y])
  this.or = (x, y) => apply ([OR, x, y])
  this.conc = (x, y) => apply ([CONC, x, y])
}

function TermStore () {

  let memo = new Map (compareFNode (cmp_js))
  const heap = []

  function inn (fx) {
    return _normalize (out, _inn, fx)
  }

  function out (x) {
    return heap [x]
  }

  function _inn (fx) {
    const cursor = memo.select (fx)
    if (cursor.found) return cursor.value
    const x = heap.push (fx) - 1
    memo = cursor.set (x)
    return x
  }

  //this.inn = inn
  this.out = out
  this.inn = inn
  this.terms = heap
  _init.call (this, inn)
}


function _nullable (fx) {
  const [op, t1, t2] = fx
  switch (op) { 
    case GROUP: return t1
    case UNIT: return true
    case TOP: return true
    case BOT: return false
    case STEP: return false
    //case TEST:
    case NOT: return !t1
    case STAR: return true
    case AND: return t1 && t2
    case OR: return t1 || t2
    case CONC: return t1 && t2
  }
}

//
//  One Level

const first = ([a]) => a
const second = ([,b]) => b

function Compiler () {
  const Terms = new TermStore ()
  const { terms, inn, out } = Terms
  const nodes = [] // table for eval: X -> Y

  const _map = (f, xs) => map (f, xs, cmp_js, cmp_js)
  const _merge = (f, xs, ys) => merge (f, xs, ys, cmp_js, cmp_js)

  _init.call (this, apply)

  this.apply = apply
  this.run = run

  this.entries = function* () {
    //log ('entries', nodes)
    for (let item of nodes) {
      let [id, accepts, derivative] = item
      yield [id, Terms.out (id), accepts, RL.toArray (derivative)]
    }
  }

  // Returns a tuple [ term-id, accepts, derivative ]
  // where the derivative in turn is a RangeList of term-ids

  function apply (nodeOp) {
    const node = _apply (nodeOp)

    // _apply may extend the `terms` array
    // so we need to fill out the `nodes` array accordingly. 
    // The ordering of the terms is compatible with the subterm order, 
    // and so we do a 'fast fold' by passing over it left-to-right to catch up. 

    for (let i = nodes.length; i < terms.length; i++) {
      const nodeOp = F (x => nodes[x]) (terms [i])
      nodes[i] = _apply (nodeOp)
    }
    return node
  }

  function _apply (nodeOp) {
    const fx = F (first) (nodeOp)
    const fa = F (second) (nodeOp)
    const x = inn (fx)
    return [x, _nullable(fa), _derivative (nodeOp, x, fx, fa)]
  }

  function _derivative (nodeOp, x, fx, fa) {
    const [op, r, s] = fx

    switch (op) { // constants
      case BOT:  return new Rest (Terms.bottom)
      case TOP:  return new Rest (Terms.top)
      case UNIT: return new Rest (Terms.bottom)
      //case TEST:
      case STEP:
        return RL.map (b => b ? Terms.unit : Terms.bottom, RS.eq (fx[1]), Terms.compare)
    }

    const [x1, ar, dr] = nodeOp[1] // unary operations
    switch (op) {
      case GROUP:
        return dr

      case NOT:
        return RL.map (Terms.not, dr)

      case STAR:
        return RL.map (dr => Terms.conc (dr, x), dr)
    }

    const [x2, as, ds] = nodeOp[2] // unary operations
    switch (op) {
      case AND:
        return RL.merge (Terms.and, dr, ds, Terms.compare)

      case OR:
        return RL.merge (Terms.or, dr, ds, Terms.compare)

      case CONC:
        const left = RL.map (dr => Terms.conc (dr, s), dr, Terms.compare) // left = ∂r•s
        return !ar ? left : RL.merge (Terms.or, left, ds, Terms.compare) // if r accepts then left, else (left + ∂s)
      break
    }
  }

  function run (id, string) {
    //log ('run\n  ===>', id, nodes[id][1])
    for (let char of string) {
      if (id === this.bottom[0]) return { id, accepts:false }
      if (id === this.top[0]) return { id, accepts:true }
      id = RL.lookup (char, nodes[id][2], cmp_js)
      //log (char, '===>', id, nodes[id][1])
    }
    return { id, accepts: nodes[id][1] }
  }

}

module.exports = { TermStore, Compiler }