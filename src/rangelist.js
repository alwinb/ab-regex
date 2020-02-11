const Symbols = new Proxy ({}, { get:(_,k) => Symbol (k) })

const cmpJs = (t1, t2) =>
  t1 < t2 ? -1 : t1 > t2 ? 1 : 0

//
// RangeLists

// The one-level unfolding of a term is implemented as
// a 'RangeList' from chars to terms. 

const { BELOW, ABOVE } = Symbols

class RLNode {

  toArray () {
    return toArray (this)
  }

}

class Upto extends RLNode {
  constructor (key, value, tail) {
    super()
    this.value = value
    this.end = key
    this.tail = tail
  }
}

class Rest extends RLNode {
  constructor (value) { 
    super()
    this.value = value
  }
}


const compareBounds = cmpK => ([c1,x1], [c2,x2]) =>
  cmpK (x1, x2) || (c1 === c2 ? 0 : c1 === BELOW ? -1 : 1)

// Any operation 'fn' on the output lables,
// lifts to an operation on range lists as follows:

// unary operations

function map (fn, xs, cmpV = cmpJs, cmpK = cmpJs) {
  return merge (fn, xs, new Rest (), cmpV, cmpK) }

// binary operations

function merge (fn, xs1, xs2, cmpV = cmpJs, cmpK = cmpJs) {
  const c1 = xs1.constructor
    , c2 = xs2.constructor
    , value = fn (xs1.value, xs2.value)
    , merge_ = (xs1, xs2) => merge (fn, xs1, xs2, cmpV, cmpK)
  let tail

  if (c1 === Rest && c2 === Rest)
    return new Rest (value)

  var decide = c1 === Rest && c2 !== Rest ? 1
      : c1 !== Rest && c2 === Rest ?  -1
      : compareBounds (cmpK) (xs1.end, xs2.end)

  if (decide < 0) {
    tail = merge_ (xs1.tail, xs2)
    return (cmpV (tail.value, value) === 0) ? tail
      : new Upto (xs1.end, value, tail)
  }

  else if (decide === 0) {
    tail = merge_ (xs1.tail, xs2.tail)
    return (cmpV (tail.value, value) === 0) ? tail
      : new Upto (xs1.end, value, tail)
  }

  else if (decide > 0) {
    tail = merge_ (xs1, xs2.tail)
    return (cmpV (tail.value, value) === 0) ? tail
      : new Upto (xs2.end, value, tail)
  }

}

function lookup (k, xs, cmpK = cmpJs) {
  const compare = (k, [delim,k2]) => cmpK (k, k2) || (delim === ABOVE ? -1 : 1)
  let head = xs
  while (head instanceof Upto && compare (k, head.end) > 0)
    head = head.tail
  return head.value
}

function *iterate (xs) {
  while (xs.constructor !== Rest) {
    yield xs.value
    const [d,k] = xs.end
    yield d === BELOW ? '|'+k : k+'|'
    xs = xs.tail
  }
  yield xs.value
}

function toArray (rl) {
  return [...iterate (rl)]
}


// Range Sets are range lists with boolean output labels
// This is nice because they now are a boolean algebra.

const lt  = k => new Upto ([BELOW, k], true,  new Rest (false))
const lte = k => new Upto ([ABOVE, k], true,  new Rest (false))
const eq  = k => new Upto ([BELOW, k], false, new Upto ([ABOVE, k], true, new Rest (false)))
const gte = k => new Upto ([BELOW, k], false, new Rest (true))
const gt  = k => new Upto ([ABOVE, k], false, new Rest (true))

const RangeList = { map, merge, lookup, iterate, toArray }
const RangeSet = { lt, lte, eq, gte, gt }
module.exports = { RangeList, RangeSet, Upto, Rest }