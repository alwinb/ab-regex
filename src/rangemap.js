const log = console.log.bind (console)

// Range Maps
// ==========

// A datastructure for representing sets of continuous ranges and
// their generalisation: maps from continuous ranges to values. 

// Range Lists are stored as arrays of odd length
// [value, (delimiter, value)*]
// where the delimiter is either [ABOVE, key] or [BELOW, key]

const [BELOW, ABOVE] =
  [Symbol ('Below'), Symbol ('Above')]

const compareDelim = cmpK =>
  ([c1,x1], [c2,x2]) =>
    cmpK (x1, x2) || (c1 === c2 ? 0 : c1 === BELOW ? -1 : 1)

const compareAgainstDelim = cmpK =>
  (k1, [bound, k2]) =>
    cmpK (k1, k2) || (bound === ABOVE ? -1 : 1)

// ### Lookup

const lookup = (xs, key, cmpKD = cmp) => {
  let di = 1, l = xs.length;
  while (di < l && cmpKD (key, xs[di]) >= 0) di += 2
  return xs [di-1]
}

// ### Merge

const it = xs =>
  xs [Symbol.iterator] ()

const merge = (cmpD, cmpV) => function* merge (fn, xs, ys) {
  xs = it (xs), ys = it (ys)
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

// ### Convert to spans { start, value, end }

function* spans (store) {
  const r = [], l = store.length-1
  let start = [-Infinity]
  for (let i=0; i<l; i+=2) {
    const end = store[i+1]
    yield { start, value:store[i], end }
    start = end
  }
  if (l >= 0)
    yield { start, value:store[l], end:[Infinity] }
}


// RangeMap API
// ------------

RangeMap.above = a => [ABOVE, a]
RangeMap.below = a => [BELOW, a]

function RangeMap (compareKey, compareValue, { below = RangeMap.below, above = RangeMap.above } = { }) {
  const merged = merge (compareDelim (compareKey), compareValue)
  const compareKD = compareAgainstDelim (compareKey)
  
  if (typeof compareKey !== 'function')
    throw new TypeError ('RangeSet class constructor requires compareKey function.')

  if (typeof compareValue !== 'function')
    throw new TypeError ('RangeSet class constructor requires compareValue function.')

  return class RangeMap {

    constructor (store) {
      Object.defineProperties (this, {
        store: { value: Array.from (store), enumerable:false }
      })
    }

    static constant (value) {
      return new this ([value])
    }

    static mapped (fn, list) {
      // FIXME need to handle above/ below normalisations
      return new this (merged (fn, list.store, [null]))
    }

    static merged (fn, list1, list2) {
      return new this (merged (fn, list1.store, list2.store))
    }

    lookup (key) {
      return lookup (this.store, key, compareKD)
    }

    spans () {
      return spans (this.store)
    }

  }
}


// RangeSet API
// ------------
// Range Sets are range maps with boolean output labels
// This is nice because they now are a boolean algebra.

const compareBoolean = (a, b) =>
  !a ? !b ? 0 : -1 : b ? 0 : 1

RangeSet.above = a => [ABOVE, a]
RangeSet.below = a => [BELOW, a]

function RangeSet (compareElement, { below = RangeSet.below, above = RangeSet.above } = { }) {
  const compareKD = compareAgainstDelim (compareElement)

  if (typeof compareElement !== 'function')
    throw new TypeError ('RangeSet class constructor requires compareElement function.')

  return class RangeSet extends RangeMap (compareElement, compareBoolean) {

    static get top   () { return new this ([ true  ]) }
    static get full  () { return new this ([ true  ]) }
    static get empty () { return new this ([ false ]) }

    static fromElement (a) {
      return new this ([ false, below (a), true, above (a), false ])
    }

    static fromRange (a, b) {
      if (compareElement (a, b) > 0) return this.empty
      else return new this ([false, below (a), true, above (b), false])
    }

    static uptoBelow (k) { return new this ([ true, below (k), false ]) }
    static uptoAbove (k) { return new this ([ true, above (k), false ]) }
    static fromBelow (k) { return new this ([ false, below (k), true ]) }
    static fromAbove (k) { return new this ([ false, above (k), true ]) }

    static not (set1) {
      return this.mapped (a => !a, set1)
    }

    static and  (set1, set2) {
      return this.merged ((a,b) =>  a && b, set1, set2)
    }
    
    static or   (set1, set2) {
      return this.merged ((a,b) =>  a || b, set1, set2)
    }
    
    static diff (set1, set2) {
      return this.merged ((a,b) => a !== b, set1, set2)
    }
    
    negate () {
      return this.constructor.not (this)
    }

    test (key) {
      return lookup (this.store, key, compareKD)
    }

    *spans () {
      for (const { start, end, value } of spans (this.store))
        if (value) yield { start, end }
    }

  }
}


// Exports
// -------

module.exports = { RangeMap, RangeSet, _private: { merge, lookup } }