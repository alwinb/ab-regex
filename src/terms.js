"use strict"
const log = console.log.bind (console)
const Strings = new Proxy ({}, { get:(_,k) => k })
const Map = require ('./aatree.js')
const { Algebra, Operators } = require ('./signature.js')

//
//  Basic utilities

const cmpJs = (t1, t2) =>
  t1 < t2 ? -1 : t1 > t2 ? 1 : 0


//  Signature

// A 'Node' is _one level_ of a Regex AST tree
// The Node 'class' is just a namespace at the moment
// Nodes themselves are simply arrays [operator, ...args]

const {
  TOP, BOT, EMPTY, 
  STEP, ANY, RANGE,
  GROUP, REPEAT, NOT,
  AND, OR, CONC } = Operators

//log (["_n00", "_aap", "_baa", "_6aaas"].sort(_compareArgs(cmpJs)))

// Allright; cleaning this up?
// So

function _print (out, x) {
  return _printFx (out, out (x)) }

function _printFx (out, [op, ...args]) {
  const [a, b] = args
  const p = x => _print (out, x)
  return (
      op === STEP  ? a
    : op === ANY   ? '.'
    : op === RANGE ? `[${a}-${b}]`
    : op === EMPTY  ? 'ε'
    : op === TOP   ? '⊤'
    : op === BOT   ? '⊥'
    : op === GROUP ?  `(${p(a)})`
    : op === NOT   ?  `(!${p(a)})`
    : op === REPEAT ? `(${p(a)}${printRepeat(args[1], args[2])})`
    : op === AND   ?  `(${ args .map (p) .join (' & ') })`
    : op === OR    ?  `(${ args .map (p) .join (' | ') })`
    : op === CONC  ?  `(${ args .map (p) .join ('')    })`
    : '' ) }

function printRepeat (l, m) {
  return l === 0 && m === Infinity ? '*'
    : l === 1 && m === Infinity ? '+'
    : l === 0 && m === 1 ? '?'
    : m === Infinity ? '<'+l+'-*>'
    : '<'+l+'-'+m+'>'
}


// Shared term store
// =================

function Shared () {

  const out = x => this._heap [x]
  const apply = (...fx) => {
    //log ('Shared _apply', fx)
    const cursor = this._memo.select (fx)
    //log ('_inn', {fx, cursor, heap})
    if (cursor.found) return cursor.value
    const x = this._heap.push (fx) - 1
    this._memo = cursor.set (x)
    return x
  }

  this._memo = new Map (Algebra.compareNode (cmpJs))
  this._heap = []
  this.out = out
  this.apply = apply

  function* entries () {
    for (let [k,item] of this._heap.entries ()) yield [k, _print (out, k), item]
  }
  this[Symbol.iterator] = entries.bind (this)

  Object.setPrototypeOf (this, Algebra.fromFunction (apply))
}


// Normalised term store
// =====================

// SemiLattice implementation for flattening nested ORs
// Implemented for nonempty ordered arrays. 

function SemiLattice (compareElement) {

  return { join: (as, bs) => [...zip (as, bs)] }

  function* zip (as, bs) {
    //log (as, bs)
    as = as [Symbol.iterator] ()
    bs = bs [Symbol.iterator] ()
    let [a, b] = [as.next(), bs.next()]
    while (!(a.done && b.done)) {
      if (a.done) { yield b.value; yield* bs; return }
      if (b.done) { yield a.value; yield* as; return }
      const c = compareElement (a.value, b.value)
      if (c < 0) { yield a.value; a = as.next () }
      else if (c > 0) { yield b.value; b = bs.next ()}
      else { yield a.value; [a, b] = [as.next (), bs.next ()] }
    }
  }
}

// log (SemiLattice (cmpJs) .join ("acejhs", "abcdegjs") .join (''))

// 'Squash' Semigroup for flattening nested CONCs;
// Implemented as concatenation of nonempty lists, possibly squashing
// the last element of the first, with first element of the last. 

function SquashSemiGroup (squash) {
  
  return { concat: (as, bs) => [...concat (as, bs)] }
  
  function *concat (as, bs) {
    let i = 0, l = as.length-1
    while (i < l) yield as [i++]
    yield* squash (as[i], bs[0])
    i = 1, l = bs.length
    while (i < l) yield bs [i++]
  }

}


// log ([... zip (cmpJs)([5], [6])])

function Normalised (Store = new Shared ()) {

const { top, bottom, empty, any } = Store
const ordTimes = (a,b) => a && b && a * b // 'Ordinal multiplication'
const OrSemiLattice = SemiLattice (cmpJs)

return new (class Normalised {

  constructor () {
    this._heap = Store._heap
    this.compare = cmpJs

    for (let op of ['and', 'or', 'not', 'conc', 'repeat']) // HACK...
      this[op] = this[op].bind (this)

    this.top = top
    this.bottom = bottom
    this.empty = empty
    this.any = any

    this.apply = Algebra.fromObject (this)
    this.out = Store.out.bind (Store)
    this[Symbol.iterator] = Store[Symbol.iterator]
  }

  step (...args) {
    return Store.step (...args)
  }

  range (...args) {
    return Store.range (...args)
  }

  group (x) {
    return x
  }

  not (a1) {
    const [c, a11] = Store.out (a1)
    return c === NOT ? a11 : Store.not (a1) // !!r == r
  }

  // Unified quantifiers; denoting omega with * here:
  // a? = a<0,1> a* = a<0,*>  a+ = a<1,*>

  repeat (a1, least, most) {
    // _<0,0> => epsilon
    // a<1,1> => a
    // .<0,*> => top
    // _<*,*> => bottom
    // empty<l,m> = empty = _<0,0>
    // top<l,m> => if l === 0 empty else top
    // bot<l,m> => if l === 0 empty else bot
    // any<0,*> => top
    // a<l,m><k,n> = a<l*k,m*n>
    const [c,x,l,m] = Store.out (a1)
    return most === 0 ? empty
      : least === Infinity ? bottom 
      : least === 1 && most === 1 ? a1
      : a1 === any && least === 0 && most === Infinity ? top
      : a1 === empty ? empty
      : a1 === top ? top
      : a1 === bottom ? bottom
      : c === REPEAT ? Store.repeat (x, ordTimes (least, l), ordTimes (most, m))
      : Store.repeat (a1, least, most)
  }

  and (a1, a2) {
    if (a1 === a2) return a1            // r & r = r
    if (a1 === bottom) return bottom    // ⊥ & r = ⊥
    if (a2 === bottom) return bottom    // r & ⊥ = ⊥
    if (a1 === top) return a2           // ⊤ & r = r
    if (a2 === top) return a1           // r & ⊤ = r
    [a1, a2] = [a1, a2] .sort ()        // r & s = s & r
    return Store.and (a1, a2)
  }
  
  or (a1, a2) {
    const repeat = this.repeat.bind (this)
    if (a1 === top) return top          // ⊤ | r = ⊤
    if (a2 === top) return top          // r | ⊤ = ⊤
    if (a1 === bottom) return a2        // r | ⊥ = r
    if (a2 === bottom) return a1        // ⊥ | r = r
    if (a1 === empty) return repeat (a2, 0, 1) // ε | r = r?
    if (a2 === empty) return repeat (a1, 0, 1) // r | ε = r?

    // (r | s) | t  =  r | (s | t) = OR{ r, s, t }
    // (r | s) | (t | u) = OR { r, s, t, u }

    const expand = a => {
      let [op, ...as] = Store.out (a)
      return op === OR ? as : [a] }

    const disjuncts = OrSemiLattice.join (expand (a1), expand (a2))
    return disjuncts.length === 1 ? disjuncts[0]
      : Store.or (...disjuncts) // FIXME should mark this as an n-ary 
  }

  conc (a1, a2) {
    // ⊥ r = r ⊥ = ⊥
    // ε r = r ε = r
    if (a1 === bottom) return bottom
    if (a2 === bottom) return bottom
    if (a1 === empty) return a2
    if (a2 === empty) return a1
    const concats = SquashSemiGroup (this._squash.bind (this)) .concat ([a1], [a2])
    //log ('conc result', concats, concats.length === 1, concats[1])
    const r = concats.length === 1 ? concats[0]
      : Store.inn([CONC, ...concats]) // FIXME should mark as nary
    //log ('stored', r)
    return r
  }

  _squash (a, b) { // Concatenation of two elements
      // log ('squash', a, b)
      let [aop, a1, aleast, amost] = Store.out (a)
      let [bop, b1, bleast, bmost] = Store.out (b)
      const r = aop === REPEAT && bop === REPEAT && a1 === b1
          ? [ Store.repeat (a1, aleast + bleast, amost + bmost) ]
        : a === b1 && bop === REPEAT
          ? [ Store.repeat (a, bleast+1, bmost+1) ]
        : aop === REPEAT && b === a1
          ? [ Store.repeat (b, aleast+1, amost+1) ]
        : a === b
          ? [ Store.repeat (a, 2, 2) ]
        : [ a, b ]
      // log ('squash result', r)
      return r
  }

})}

module.exports = { Shared, Normalised, _print }