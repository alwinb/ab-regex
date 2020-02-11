const log = console.log.bind (console)
const Strings = new Proxy ({}, { get:(_,k) => k })
const Map = require ('./aatree')
const { Algebra, Operators } = require ('./signature')
const { RangeList:RL, RangeSet:RS, Upto, Rest } = require ('./rangelist')

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
  GROUP, STAR, OPT, PLUS, NOT,
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
    : op === STAR  ?  `(${p(a)}*)`
    : op === OPT   ?  `(${p(a)}?)`
    : op === PLUS  ?  `(${p(a)}+)`
    : op === AND   ?  `(${ args .map (p) .join (' & ') })`
    : op === OR    ?  `(${ args .map (p) .join (' | ') })`
    : op === CONC  ?  `(${ args .map (p) .join ('')    })`
    : '' ) }


// Shared term store
// =================

function Shared () {

  const out = x => this._heap [x]
  const apply = (fx) => {
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

    for (let op of ['and', 'or', 'not', 'star', 'plus', 'conc']) // HACK...
      this[op] = this[op].bind (this)

    this.top = top
    this.bottom = bottom
    this.empty = empty
    this.any = any

    this.apply = Algebra.fromObject (this)
    this.out = Store.out.bind (Store)
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

  star (a1) {
    const [c] = Store.out (a1)
    return a1 === empty ? empty         // ε* = ε
      : a1 === top ? top                // ⊤* = ⊤
      : a1 === any ? top                // .* = ⊤
      : a1 === bottom ? empty           // ⊥* = ε
      : c === STAR ? a1                 // a** = a*
      : c === PLUS ? a1                 // a+* = a*
      : Store.star (a1)
  }
  
  plus (a1) {
    const [c] = Store.out (a1)
    return a1 === empty ? empty         // ε+ = εε*  = ε
      : a1 === top ? top                // ⊤+ = ⊤⊤*  = ⊤
      : a1 === bottom ? bottom          // ⊥+ = ⊥⊥*  = ⊥
      : c === STAR ? a1                 // a*+ = a*a** = a*
      : c === PLUS ? a1                 // a++ = a+a+* = a+
      : Store.plus (a1)
  }
  
  opt (a1) {
    const [c,a11] = Store.out (a1)
    return a1 === empty ? empty         // ε? = ε|ε = ε
      : a1 === top ? top                // ⊤? = ε|⊤ = ⊤
      : a1 === bottom ? empty           // ⊥? = ε|⊥ = ε
      : c === STAR ? a1                 // r*? = r*
      : c === PLUS ? Store. star (a11)  // r+? = r*
      : Store.opt (a1)
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
    const { opt } = Store
    if (a1 === top) return top          // ⊤ | r = ⊤
    if (a2 === top) return top          // r | ⊤ = ⊤
    if (a1 === bottom) return a2        // r | ⊥ = r
    if (a2 === bottom) return a1        // ⊥ | r = r
    if (a1 === empty) return opt (a2)   // ε | r = r?
    if (a2 === empty) return opt (a1)   // r | ε = r?

    // (r | s) | t  =  r | (s | t) = OR { r, s, t }
    // (r | s) | (t | u) = OR { r, s, t, u }

    const expand = a => {
      let [op, ...as] = Store.out (a)
      return op === OR ? as : [a] }

    const disjuncts = [...zip (expand (a1), expand (a2))]
    //log ({ disjuncts })
    return disjuncts.length === 1 ? disjuncts[0]
      : Store.or (...disjuncts)
  }

  conc (...args) {
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
    return concs.length === 1 ? concs[0] : Store.conc (...concs)
    //////////////

    if (a1 === bottom) return bottom
    if (a2 === bottom) return bottom
    if (a1 === empty) return a2
    if (a2 === empty) return a1

    // r* r* = r*
    // r* r+ = r+
    // r+ r* = r+
    // r+ r+ = rr+
    // r* r  = r+
    // r  r* = r+
    // r+ r  = rr+

    // (r s) t = r (s t)
    /* TODO
    const [c1, a11] = this.out (a1), [c2, a21] = this.out (a2)
    return = c1 === STAR && c2 === STAR && a11 === a21 ? a1
      : c1 === STAR && c2 === PLUS && a11 === a21 ? a2
      : c1 === PLUS && c2 === STAR && a11 === a21 ? a1
      : c1 === PLUS && c2 === PLUS && a11 === a21 ? Store.conc (a1, a2)
      : c1 === STAR && a11 === a2 ? Store.plus (a2)
      : c2 === STAR && a1 === a21 ? Store.plus (a1)
      : c1 === PLUS && a11 === a2 ? Store.conc (a2, a1)
      : Store.conc (a1, a2)*/
  }


})}

module.exports = { Shared, Normalised, _print }