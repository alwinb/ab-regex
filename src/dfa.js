const Map = require ('./aatree')
const Symbols = new Proxy ({}, { get:(_,k) => Symbol (k) })
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
// RangeLists

// The one-level unfolding of a term is implemented as
// a 'RangeList' from chars to terms. 

const { BELOW, ABOVE } = Symbols

class Upto {
  constructor (key, value, tail) {
    this.value = value
    this.end = key
    this.tail = tail
  }
}

class Rest {
  constructor (value) { 
    this.value = value
  }
}

const upto = (...as) =>
  new Upto (...as)

const uptoBelow = (key, value, tail) =>
  new Upto ([BELOW, key], value, tail)

const uptoAbove = (key, value, tail) =>
  new Upto ([ABOVE, key], value, tail)

const rest = (...as) =>
  new Rest (...as)


const compareBounds = cmpK => ([c1,x1], [c2,x2]) =>
  cmpK (x1, x2) || (c1 === c2 ? 0 : c1 === BELOW ? -1 : 1)

// Any operation 'fn' on the output lables,
// lifts to an operation on range lists as follows:

// unary operations

function map (fn, xs, cmpV, cmpK) {
  return merge (fn, xs, rest(), cmpV, cmpK) }

// binary operations

function merge (fn, xs1, xs2, cmpV, cmpK) {
  var c1 = xs1.constructor
    , c2 = xs2.constructor
    , value = fn (xs1.value, xs2.value)
    , merge_ = (xs1, xs2) => merge (fn, xs1, xs2, cmpV, cmpK)
    , tail

  if (c1 === Rest && c2 === Rest)
    return rest (value)

  var decide = c1 === Rest && c2 !== Rest ? 1
      : c1 !== Rest && c2 === Rest ?  -1
      : compareBounds (cmpK) (xs1.end, xs2.end)

  if (decide < 0) {
    tail = merge_ (xs1.tail, xs2)
    return (cmpV (tail.value, value) === 0) ? tail
      : upto (xs1.end, value, tail)
  }

  else if (decide === 0) {
    tail = merge_ (xs1.tail, xs2.tail)
    return (cmpV (tail.value, value) === 0) ? tail
      : upto (xs1.end, value, tail)
  }

  else if (decide > 0) {
    tail = merge_ (xs1, xs2.tail)
    return (cmpV (tail.value, value) === 0) ? tail
      : upto (xs2.end, value, tail)
  }

}

function lookup (k, xs, cmpK) {
  const compare = (k, [delim,k2]) => cmpK (k, k2) || (delim === ABOVE ? -1 : 1)
  let head = xs
  while (head instanceof Upto && compare (k, head.end) > 0)
    head = head.tail
  return head.value
}

// Range Sets are range lists with boolean output labels
// This is nice because they now are a boolean algebra.

const lt  = k => uptoBelow (k, true,  rest (false))
const lte = k => uptoAbove (k, true,  rest (false))
const eq  = k => uptoBelow (k, false, uptoAbove (k, true, rest (false)))
const gte = k => uptoBelow (k, false, rest (true))
const gt  = k => uptoAbove (k, false, rest (true))

function* iterate (xs) {
  while (xs.constructor !== Rest) {
    yield xs.value
    const [d,k] = xs.end
    yield d === BELOW ? '|'+k : k+'|'
    xs = xs.tail
  }
  yield xs.value
}

const toArray = rl => [...iterate (rl)]


//
//  One Level

// A one-level unfolding of a term will be
// a tuple [term, accepts, deriv] with each item
// implemented via a regex algebra, however,
// the last one depending on the previous two. 

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


// Store for normalized terms

function TermStore () {
  let memo = new Map (compareFNode (cmp_js))
  const heap = []

  const inn = fx => {
    const cursor = memo.lookup (fx)
    if (cursor.found) return cursor.value
    const x = heap.push (fx) - 1
    memo = cursor.set (x)
    //if (alg) _eval[x] = alg (F (this.eval) (fx))
    return x
  }

  const out = x => heap [x]
  const apply = fx => _normalize (out, inn, fx)

  //this.inn = inn
  this.out = out
  this.apply = apply

  this.bot = apply ([BOT])
  this.top = apply ([TOP])
  this.unit = apply ([UNIT])
  this.not = x => apply ([NOT, x])
  this.star = x => apply ([STAR, x])
  this.and = (x, y) => apply ([AND, x, y])
  this.or = (x, y) => apply ([OR, x, y])
  this.conc = (x, y) => apply ([CONC, x, y])

  this._heap = heap
}


function Compiler () {
  const Terms = new TermStore ()
  const Memo = [] // table for eval: X -> Y

  const _map = (f, xs) => map (f, xs, cmp_js, cmp_js)
  const _merge = (f, xs, ys) => merge (f, xs, ys, cmp_js, cmp_js)

  this.apply = apply
  this.bot = apply ([BOT])
  this.top = apply ([TOP])
  this.unit = apply ([UNIT])
  this.not = x => apply ([NOT, x])
  this.star = x => apply ([STAR, x])
  this.and = (x, y) => apply ([AND, x, y])
  this.or = (x, y) => apply ([OR, x, y])
  this.conc = (x, y) => apply ([CONC, x, y])
  this.run = run

  this.entries = function* () {
    //log ('entries', Memo)
    for (let item of Memo) {
      let [id, accepts, derivative] = item
      yield [id, Terms.out (id), accepts, toArray (derivative)]
    }
  }

  // Returns a tuple [ term-id, accepts, derivative ]
  // where the derivative in turn is a range list of term-ids

  function _apply (fx) {
    const ts = F (([x,a,d]) => x) (fx)
    const as = F (([x,a,d]) => a) (fx)
    const ds = F (([x,a,d]) => d) (fx)
    const x = Terms.apply (ts) // store it as a term
    const a = _nullable (as)
    const d = _derivative (x, ts, as, ds)
    return [x, a, d]
  }
  
  function apply (fx) {
    const [x, a, d] = _apply (fx)
    if (x in Memo) return Memo[x]
    Memo[x] = [x,a,d]
    const heap = Terms._heap

    // The _derivative function may have generated new terms, leaving 
    // the memo map incomplete. Since the ordering of the heap is compatible
    // with the subterm order, we can simply fill it out by passing over it LTR

    for (let i = Memo.length; i < heap.length; i++) {
      const fx = F (x => Memo[x]) (heap [i])
      Memo[i] = _apply(fx)
    }

    return Memo[x]
  }

  // private helper function for implementing apply 

  function _derivative (t, ft, fa, fd) {
    const [op, t1, t2] = ft
    const [_ , a1, a2] = fa
    const [__, d1, d2] = fd

    switch (op) {
      case GROUP: return d1
      case UNIT:  return rest (Terms.bot)
      case TOP:   return rest (Terms.top)
      case BOT:   return rest (Terms.bot)
      //case TEST:

      case STEP:
        return _map (b => b ? Terms.unit : Terms.bot, eq (d1)) 

      case NOT:
        return _map (Terms.not, d1)

      case STAR:
        return _map (dr => Terms.conc (dr, t), d1)

      case AND:
        return _merge (Terms.and, d1, d2)

      case OR:
        return _merge (Terms.or, d1, d2)

      case CONC:
        const left = _map (dr => Terms.conc (dr, t2), d1) // left = ∂t1•t2
        return !a1 ? left : _merge (Terms.or, left, d2) // if t1 accepts then left, else (left + ∂t2)
      break
      }

  }

  function run (id, string) {
    //log ('run\n  ===>', id, Memo[id][1])
    for (let char of string) {
      if (id === this.bot[0]) return { id, accepts:false }
      if (id === this.top[0]) return { id, accepts:true }
      id = lookup (char, Memo[id][2], cmp_js)
      //log (char, '===>', id, Memo[id][1])
    }
    return { id, accepts: Memo[id][1] }
  }

}

module.exports = { TermStore, Compiler }