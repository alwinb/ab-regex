const log = console.log.bind (console)

// Range Lists
// ===========

// A datastructure for representing sets of continuous ranges and
// their generalisation: maps from continuous ranges to values. 

// Range Lists are stored as arrays of odd length
// [value, (delimiter, value)*]

const [BELOW, ABOVE] =
  [Symbol ('Below'), Symbol ('Above')]

const compareDelim = cmpK =>
  ([c1,x1], [c2,x2]) =>
    cmpK (x1, x2) || (c1 === c2 ? 0 : c1 === BELOW ? -1 : 1)

const compareAgainstDelim = cmpK =>
  (k1, [delim,k2]) =>
    cmpK (k1, k2) || (delim === ABOVE ? -1 : 1)


// ### Lookup

function lookup (xs, key, cmpKD = cmp) {
  let di = 1, l = xs.length;
  for (; di < xs.length && cmpKD (key, xs[di]) >= 0; di+=2);
  return xs[di-1]
}

// ### Merge

function* merge (fn, xs, ys, cmpD = cmp, cmpV = cmp) {
  xs = xs [Symbol.iterator] ()
  ys = ys [Symbol.iterator] ()
  let { value:x } = xs.next ()
  let { value:y } = ys.next ()
  let { value:sepx, done:lastx } = xs.next ()
  let { value:sepy, done:lasty } = ys.next ()
  let xy = fn (x, y)
  // log ('combined first', {x, y, v:xy})

  while (!(lastx && lasty)) { let dord
    const [sep, decide]
      = !lastx && lasty ? [sepx, -1]
      : lastx && !lasty ? [sepy, 1]
      : (dord = cmpD (sepx, sepy)) > 0 ? [sepy, 1]
      : [sepx, dord]

    if (decide <= 0) (
      { value:x } = xs.next (),
      { value:sepx, done:lastx } = xs.next () )

    if (decide >= 0) (
      { value:y } = ys.next (),
      { value:sepy, done:lasty } = ys.next () )
    
    const v = fn (x, y)
    // log ('combined', {last:xy, x, y, v})
    if (cmpV (v, xy) !== 0) {
      yield* [xy, sep];
      xy = v
    }
  }
  
  yield xy
}


// Test
// ----

/*
const cmp = (t1, t2) => t1 < t2 ? -1 : t1 > t2 ? 1 : 0
var xs = [ true, 0, false, 10, true]
var ys = [ false, 6, true ]
var zs = [ false, 0, false, 1, false, 2, true, 4, false]
var top = [ true ]

const pair = (a, b) => [a,b]
const snd = (a, b) => b
const fst = (a, b) => a
const and = (a, b) => a && b
const or = (a, b) => a || b
const eq = (a, b) => a === b

/*
log (xs, ... merge (eq,  xs, xs))
log (xs, ... merge (or, top, xs))
log (xs, ... merge (pair, xs, ys))
log (xs, 'lookup', -1, lookup (xs, -1, cmp) )
log (xs, 'lookup', 0, lookup (xs, 0,   cmp) )
log (xs, 'lookup', 1, lookup (xs, 1,   cmp) )
log (xs, 'lookup', 9, lookup (xs, 9,   cmp) )
log (xs, 'lookup', 10, lookup (xs, 10, cmp) )
log (xs, 'lookup', 11, lookup (xs, 11, cmp) )
//*/


// RangeMap API
// ------------

RangeMap.above = a => [ABOVE, a]
RangeMap.below = a => [BELOW, a]

function RangeMap (compareKey, compareValue, { below = RangeMap.below, above = RangeMap.above } = { }) {
  const compareD  = compareDelim (compareKey)
  const compareKD = compareAgainstDelim (compareKey)

  if (typeof compareKey !== 'function')
    throw new TypeError ('RangeSet class constructor requires compareKey function.')

  if (typeof compareValue !== 'function')
    throw new TypeError ('RangeSet class constructor requires compareValue function.')

  return class RangeMap {

    constructor (store) {
      this.store = Array.from (store)
    }

    static byMapping (fn, list) {
      // FIXME need to handle above/ below normalisations
      return new this (merge (fn, list.store, [null], compareD, compareValue))
    }

    static byMerging (fn, list1, list2) {
      return new this (merge (fn, list1.store, list2.store, compareD, compareValue, { below, above }))
    }

    static fromConstant (value) {
      return new this ([value])
    }

    lookup (key) {
      return lookup (this.store, key, compareKD)
    }

    toString () {
      return this._toString () .join ('')
    }

    toArray (fn = x => x) {
      return this.store // Array.from (this.iterate (fn))
    }

    _toString () {
      const r = [this.store[0]]
      for (let i=1; i<this.store.length; i+=2) {
        if (this.store[i][0] === BELOW) r.push (' |', this.store[i][1], ' ')
        else r.push (' ', this.store[i][1], '| ')
        r.push (this.store[i+1])
      }
      return r // this.store // Array.from (this.iterate (([d,k]) => d === BELOW ? '|'+k : k+'|'))
    }

    _log () {
      console.log (String (this))
      return this
    }
  }
}


// RangeSet API
// ------------
// Range Sets are range lists with boolean output labels
// This is nice because they now are a boolean algebra.

RangeSet.above = a => [ABOVE, a]
RangeSet.below = a => [BELOW, a]

function RangeSet (compareElement, { below = RangeSet.below, above = RangeSet.above } = { }) {
  if (typeof compareElement !== 'function')
    throw new TypeError ('RangeSet class constructor requires compareElement function.')
  const compareBoolean = (a, b) => !a ? !b ? 0 : -1 : b ? 0 : 1
  class RangeSet extends RangeMap (compareElement, compareBoolean) {

    get full () {
      return new RangeSet ([true])
    }

    static get empty () {
      return new RangeSet ([false])
    }

    static fromElement (a) {
      return new RangeSet ([false, below (a), true, above (a), false])
    }

    static fromRange (a, b) {
      const c = compareElement (a, b)
      if (c > 0) return RangeSet.bottom
      return new RangeSet ([false, below (a), true, above (b), false])
    }

    static uptoBelow (k) {
      return new RangeSet ([true, below (k), false])
    }
    
    static uptoabove (k) {
      return new RangeSet ([true, above (k), false])
    }
    
    static fromBelow (k) {
      return new RangeSet ([false, below (k), true])
    }
    
    static fromabove (k) {
      return new RangeSet ([false, above (k), true])
    }
    
    static and (set1, set2) {
      return this.byMerging ((a,b) => a && b, set1, set2)
    }

    static or (set1, set2) {
      return this.byMerging ((a,b) => a || b, set1, set2)
    }

    static diff (set1, set2) {
      return this.byMerging ((a,b) => a !== b, set1, set2)
    }

    static not (set1) {
      return this.byMapping (a => !a, set1)
    }
    
    negate () {
      return RangeSet.not (this)
    }
  }

  RangeSet.prototype.top = RangeSet.prototype.full
  RangeSet.prototype.test = RangeSet.prototype.lookup
  return RangeSet
}

module.exports = { RangeMap, RangeSet }