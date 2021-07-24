const { RangeMap, RangeSet } = require ('../src/rangemap')
const assert = require ('assert') .strict
const log = console.log.bind (console)

// Examples
// --------

const compareChar = (t1, t2) =>
  t1 < t2 ? -1 : t1 > t2 ? 1 : 0

const CharSet = new RangeSet (compareChar)

var set1 = CharSet
  . fromRange ('a', 'c')

var set2 = CharSet
  . fromRange ('g', 'j')

var set3 = CharSet
  . fromRange ('d', 'e')


// Just a quick manual check

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
