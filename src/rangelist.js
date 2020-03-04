const log = console.log.bind (console)

// RangeLists
// ==========

// A purely functional datastructure for representing 
// sets of continuous ranges; and their generalisation;
// functions that map continuous ranges to the same values. 

const [BELOW, ABOVE] = [Symbol ('Below'), Symbol ('Above')]

const compareBounds = cmpK => ([c1,x1], [c2,x2]) =>
  cmpK (x1, x2) || (c1 === c2 ? 0 : c1 === BELOW ? -1 : 1)


function RangeList (compareKey, compareValue) {

  if (typeof compareKey !== 'function')
    throw new TypeError ('RangeSet class constructor requires compareKey function.')

  if (typeof compareValue !== 'function')
    throw new TypeError ('RangeSet class constructor requires compareValue function.')

  return class RangeList {

    constructor (store) {
      this.store = store
    }

    static byMapping (fn, list) {
      return new RangeList (merge (fn, list.store, new Rest (), compareValue, compareKey))
    }

    static byMerging (fn, list1, list2) {
      return new RangeList (merge (fn, list1.store, list2.store, compareValue, compareKey))
    }

    static fromConstant (value) {
      return new RangeList (new Rest (value))
    }

    lookup (key) {
      const compare = (key, [delim,k2]) => compareKey (key, k2) || (delim === ABOVE ? -1 : 1)
      let head = this.store
      while (head instanceof Upto && compare (key, head.end) > 0)
        head = head.tail
      return head.value
    }

    *iterate () {
      let head = this.store
      while (head.constructor !== Rest) {
        yield head.value
        const [d,k] = head.end
        yield d === BELOW ? '|'+k : k+'|'
        head = head.tail
      }
      yield head.value
    }

    toString () {
      return this.toArray () .join (' ')
    }

    toArray () {
      return Array.from (this.iterate ())
    }
    
    log () {
      console.log (String (this))
      return this
    }
  }
}

// Range Sets are range lists with boolean output labels
// This is nice because they now are a boolean algebra.

function RangeSet (compareElement) {
  if (typeof compareElement !== 'function')
    throw new TypeError ('RangeSet class constructor requires compareElement function.')
  
  const compareBoolean = (a, b) => !a ? !b ? 0 : -1 : b ? 0 : 1
  class RangeSet extends RangeList (compareElement, compareBoolean) {

    get full () {
      return new RangeSet (new Rest (true))
    }

    static get empty () {
      return new RangeSet (new Rest (false))
    }

    static fromElement (a) {
      return new RangeSet (new Upto ([BELOW, a], false, new Upto ([ABOVE, a], true, new Rest (false))))
    }

    static fromRange (a, b) {
      const c = compareElement (a, b)
      if (c > 0) return RangeSet.bottom
      return new RangeSet (new Upto ([BELOW, a], false, new Upto ([ABOVE, b], true, new Rest (false))))
    }

    static uptoBelow (k) {
      return new RangeSet (new Upto ([BELOW, k], true,  new Rest (false)))
    }
    
    static uptoAbove (k) {
      return new RangeSet (new Upto ([ABOVE, k], true,  new Rest (false)))
    }
    
    static fromBelow (k) {
      return new RangeSet (new Upto ([BELOW, k], false, new Rest (true)))
    }
    
    static fromAbove (k) {
      return new RangeSet (new Upto ([ABOVE, k], false, new Rest (true)))
    }
    
    static and (set1, set2) {
      return this.byMerging ((a,b) => a && b, set1, set2)
    }

    static or (set1, set2) {
      return this.byMerging ((a,b) => a || b, set1, set2)
    }
  }

  RangeSet.top = RangeSet.full
  RangeSet.prototype.test = RangeSet.prototype.lookup

  return RangeSet
}


// Internal structure
// ------------------

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

// merge; zips together two rangeLists,
// merging their output values together with a function fn
// NB note that cmpV is a comparison on the _output_ type of fn
// this is used to coalesce adjacent ranges that
// have begotten the same output value. 

function merge (fn, xs1, xs2, cmpV, compareKey) {
  const c1 = xs1.constructor
    , c2 = xs2.constructor
    , value = fn (xs1.value, xs2.value)
    , merge_ = (xs1, xs2) => merge (fn, xs1, xs2, cmpV, compareKey)
  let tail

  if (c1 === Rest && c2 === Rest)
    return new Rest (value)

  var decide = c1 === Rest && c2 !== Rest ? 1
      : c1 !== Rest && c2 === Rest ?  -1
      : compareBounds (compareKey) (xs1.end, xs2.end)

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

// Examples
// --------

/*
const cmpJs = (t1, t2) =>
  t1 < t2 ? -1 : t1 > t2 ? 1 : 0

const CharSet = new RangeSet (cmpJs)
var test1 = CharSet
  . fromRange ('a', 'c')

var test2 = CharSet
  . fromRange ('g', 'j')

var test3 = CharSet
  . fromRange ('d', 'e')

log (test1, test2)

CharSet.and (test1, test2) .log ()
CharSet.or (test1, test2) .log ()
CharSet.or (test1, test3) .log ()
//*/

//log(test1.lookup ('d'))
//log (test.toArray())
//log (test)

module.exports = { RangeList, RangeSet }