const { RangeMap, RangeSet, _private: { merge, lookup } } = require ('../src/rangemap')
const assert = require ('assert') .strict
const log = console.log.bind (console)


// Test
// ----

// Just a quick manual check

log ('\nTest RangeMap')
log ('=============\n')

const cmp = (t1, t2) =>
  t1 < t2 ? -1 : t1 > t2 ? 1 : 0

const top = [ true ]
const bot = [ false ]

var xs = [ true, 0, false, 10, true]
var ys = [ false, 6, true ]
var zs = [ false, 0, false, 1, false, 2, true, 4, false]

const pair = (a, b) => [a,b]
const snd = (a, b) => b
const fst = (a, b) => a
const and = (a, b) => a && b
const or = (a, b) => a || b
const eq = (a, b) => a === b

const merge_ = (...args) =>
  [... merge (cmp, cmp) (...args)]


assert.deepEqual (merge_ (eq,   xs,  xs),  top)
assert.deepEqual (merge_ (or,   xs,  top), top)
assert.deepEqual (merge_ (or,   top, xs),  top)
assert.deepEqual (merge_ (and,  top, xs),  xs)
assert.deepEqual (merge_ (and,  xs, top),  xs)
assert.deepEqual (merge_ (and,  top, top), top)

log (xs, ... merge_ (pair, xs, ys))

log (xs, 'lookup', -1, lookup (xs, -1, cmp) )
log (xs, 'lookup', 0, lookup (xs, 0,   cmp) )
log (xs, 'lookup', 1, lookup (xs, 1,   cmp) )
log (xs, 'lookup', 9, lookup (xs, 9,   cmp) )
log (xs, 'lookup', 10, lookup (xs, 10, cmp) )
log (xs, 'lookup', 11, lookup (xs, 11, cmp) )


// Examples
// --------

const CharSet = new RangeSet (cmp)

var set1 = CharSet
  . fromRange ('a', 'c')

var set2 = CharSet
  . fromRange ('g', 'j')

var set3 = CharSet
  . fromRange ('d', 'e')


log (set1.store)
log (set2.store)
log (CharSet.and (set1, set2).store)
log (CharSet.or  (set1, set2).store)
log (CharSet.or  (set1, set3).store)

// Test lookup
assert.equal (set1.lookup ('a'), true)
assert.equal (set1.lookup ('b'), true)
assert.equal (set1.lookup ('c'), true)
assert.equal (set1.lookup ('d'), false)
