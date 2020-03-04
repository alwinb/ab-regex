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

// 'zip' is used in the normalisation of nested disjunctions
// ... it zips together two ordered lists, maintaining order and removing duplicates

function zipList (compareElement) { return function* (as, bs) {
  //log (as, bs)
  as = as [Symbol.iterator] ()
  bs = bs [Symbol.iterator] ()
  let [a, b] = [as.next(), bs.next()]
  while (!(a.done && b.done)) {
    if (a.done) { yield b.value; yield* bs; return }
    if (b.done) { yield a.value; yield* as; return }
    const c = compareElement (a.value, b.value)
    if (c < 0) { yield a.value; a = as.next ()}
    else if (c > 0) { yield b.value; b = bs.next ()}
    else { yield a.value; [a, b] = [as.next (), bs.next ()] }
  }
}}

// log ([... _subLists (cmpJs)("abjhs", "abcdegjs")].join(""))
// log ([... zip (cmpJs)([5], [6])])

function Normalised (Store = new Shared ()) {
const { top, bottom, empty, any } = Store
const zip = zipList (cmpJs)

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

  // star, opt, plus, are going to be unified
  // a? = a<0,1> a* = a<0,inf>  a+ = a<1,inf>

  repeat (a1, least, most) {
    // _<0,0> => epsilon
    // a<1,1> => a
    // .<0,inf> => top
    // _<inf,inf> => bottom
    const [c,x,l,m] = Store.out (a1)
    const ordTimes = (a,b) => a && b && a * b
    return most === 0 ? empty
      : least === Infinity ? bottom 
      : least === 1 && most === 1 ? a1
      : a1 === any && least === 0 && most === Infinity ? top
      : a1 === empty ? empty
      : a1 === top ? top
      : a1 === bottom ? bottom
      : c === REPEAT ? Store.repeat (x, ordTimes (least * l), ordTimes (most * m))
      : Store.repeat (a1, least, most)
    // empty<l,m> = empty = _<0,0>
    // top<l,m> => if l === 0 empty else top
    // bot<l,m> => if l === 0 empty else bot
    // any<l,m> => if l === 0, m === inf then top
    //a<l,m><l2,m2> = a<l1*l2,m*m2>
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
  
  or (...args) { // n-ary OR
    return args.reduce (this._or2.bind (this))
  }

  _or2 (a1, a2) {
    const repeat = this.repeat.bind (this)
    if (a1 === top) return top          // ⊤ | r = ⊤
    if (a2 === top) return top          // r | ⊤ = ⊤
    if (a1 === bottom) return a2        // r | ⊥ = r
    if (a2 === bottom) return a1        // ⊥ | r = r
    if (a1 === empty) return repeat (a2, 0, 1) // ε | r = r?
    if (a2 === empty) return repeat (a1, 0, 1) // r | ε = r?

    // (r | s) | t  =  r | (s | t) = OR { r, s, t }
    // (r | s) | (t | u) = OR { r, s, t, u }

    const expand = a => {
      let [op, ...as] = Store.out (a)
      return op === OR ? as : [a] }

    const disjuncts = [...zip (expand (a1), expand (a2))]
    return disjuncts.length === 1 ? disjuncts[0]
      : Store.or (...disjuncts)
  }

  conc (...args) {
    //log ('normalize conc', args)
    // ε r = r ε = r
    // ⊥ r = r ⊥ = ⊥
    const concs = []
    for (let a of args) {
      if (a === bottom) return bottom
      if (a === empty) continue
      const [c, ...as] = Store.out (a)
      if (c === CONC) concs.push (...as)
      else concs.push (a)
    }
    return !concs.length ? empty
      : concs.length === 1 ? concs[0]
      : Store.conc (...concs)
    //////////////

    if (a1 === bottom) return bottom
    if (a2 === bottom) return bottom
    if (a1 === empty) return a2
    if (a2 === empty) return a1

    // TODO: these rules
    // r* r* = r*
    // r* r+ = r+
    // r+ r* = r+
    // r+ r+ = rr+
    // r* r  = r+
    // r  r* = r+
    // r+ r  = rr+
    // (r s) t = r (s t)
  }


})}

module.exports = { Shared, Normalised, _print }