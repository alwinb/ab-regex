const Map = require ('./aatree.js')
const { fmap, compareNode, operators:T, Algebra } = require ('./signature.js')
const cmpJs = (t1, t2) => t1 < t2 ? -1 : t1 > t2 ? 1 : 0
const log = console.log.bind (console)


// Printing
// ========

// Allright; cleaning this up?
// So

function _print (out, x) {
  return _printFx (out, out (x)) }

function _printFx (out, [op, ...args]) {
  const [a, b] = args
  const p = x => _print (out, x)
  return (
      op === T.char   ? a
    : op === T.any    ? '.'
    : op === T.range  ? `[${a}-${b}]`
    : op === T.empty  ? 'ε'
    : op === T.top    ? '⊤'
    : op === T.bottom ? '⊥'
    : op === T.not    ? `(!${p(a)})`
    : op === T.repeat ? `(${p(a)}${printRepeat(args[1], args[2])})`
    : op === T.and    ? `(${ args .map (p) .join (' & ') })`
    : op === T.or     ? `(${ args .map (p) .join (' | ') })`
    : op === T.conc   ? `(${ args .map (p) .join ('')    })`
    : '' ) }

function printRepeat (l, m) {
  return l === 0 && m === Infinity ? '*'
    : l === 1 && m === Infinity ? '+'
    : l === 0 && m === 1 ? '?'
    : m === Infinity ? `<${l}-*>`
    : `<${l}-${m}>`
}


// Shared term store
// =================

function Shared () {

  const out = x => this._heap [x]
  const apply = (...fx) => {
    // log ('Shared _apply', fx)
    const cursor = this._memo.select (fx)
    // log ('_inn', {fx, cursor, heap:this._heap})
    if (cursor.found) return cursor.value
    const x = this._heap.push (fx) - 1
    this._memo = cursor.set (x)
    return x
  }

  this._memo = new Map (compareNode (cmpJs))
  this._heap = []
  this.out = out
  this.apply = apply

  function* entries () {
    for (let [k,item] of this._heap.entries ())
      yield [k, _print (out, k), item]
  }

  this[Symbol.iterator] = entries.bind (this)

  Object.setPrototypeOf (this, Algebra.fromFunction (apply))
}


// Normalised term store
// =====================

// OrdList SemiLattice
// used for flattening nested T.ors

function OrdList (compareElement = cmpJs) {

  return { join: (as, bs) => [...zip (as, bs)] }

  function* zip (as, bs) {
    //log (as, bs)
    as = as [Symbol.iterator] ()
    bs = bs [Symbol.iterator] ()
    let a = as.next (), b = bs.next ()
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

// log (OrdList (cmpJs) .join ("acejhs", "abcdegjs") .join (''))

// 'Squash' Semigroup for flattening nested T.concs;
// Implemented as concatenation of nonempty lists, possibly squashing
// the last element of the first list with first element of the second list.

function SquashSemiGroup (squash) {
  
  return { join: (as, bs) => [...join (as, bs)] }
  
  function *join (as, bs) {
    let i = 0, l = as.length-1
    while (i < l) yield as [i++]
    yield* squash (as[i], bs[0])
    i = 1, l = bs.length
    while (i < l) yield bs [i++]
  }

}

// Finally, the Normalised term store. 
// This implements the regex signature,
// but internally it uses a different signature, with
// n-ary T.or and T.conc nodes. 

function Normalised (Store = new Shared ()) {

const { top, bottom, empty, any } = Store
const ordTimes = (a,b) => a && b && a * b // 'Ordinal multiplication'
const Ors = OrdList (cmpJs)

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

  char (...args) {
    return Store.char (...args)
  }

  step (...args) {
    return Store.step (...args)
  }

  nstep (...args) {
    return Store.nstep (...args)
  }

  range (...args) {
    return Store.range (...args)
  }

  not (a1) {
    const [c, a11] = Store.out (a1)
    return c === T.not ? a11 : Store.not (a1) // !!r == r
  }

  // Unified quantifiers; denoting omega with * here:
  // a? = a<0,1> a* = a<0,*>  a+ = a<1,*>

  repeat (a1, least, most) {
    // _<0,0> => ε
    // _<*,*> => ⊥
    // a<1,1> => a
    // .<0,*> => ⊤
    // ε<l,m> = ε = _<0,0>
    // ⊤<l,m> => if l === 0 ε else ⊤
    // ⊥<l,m> => if l === 0 ε else ⊥
    // a<l,m><k,n> = a<l*k,m*n>
    const [c,x,l,m] = Store.out (a1)
    return most === 0 ? empty
      : least === Infinity ? bottom 
      : least === 1 && most === 1 ? a1
      : a1 === any && least === 0 && most === Infinity ? top
      : a1 === empty  ? empty
      : a1 === top    ? top
      : a1 === bottom ? bottom
      : c === T.repeat  ? Store.repeat (x, ordTimes (least, l), ordTimes (most, m))
      : Store.repeat (a1, least, most)
  }

  and (...as) {
    return as.reduce (this.and2.bind (this))
  }

  and2 (a1, a2) {
    if (a1 === a2) return a1            // r & r = r
    if (a1 === bottom) return bottom    // ⊥ & r = ⊥
    if (a2 === bottom) return bottom    // r & ⊥ = ⊥
    if (a1 === top) return a2           // ⊤ & r = r
    if (a2 === top) return a1           // r & ⊤ = r
    [a1, a2] = [a1, a2] .sort ()        // r & s = s & r
    return Store.and (a1, a2)
  }
  
  or (...as) {
    return as.reduce (this.or2.bind (this))
  }

  or2 (a1, a2) {
    const repeat = this.repeat.bind (this)
    if (a1 === top) return top          // ⊤ | r = ⊤
    if (a2 === top) return top          // r | ⊤ = ⊤
    if (a1 === bottom) return a2        // r | ⊥ = r
    if (a2 === bottom) return a1        // ⊥ | r = r
    if (a1 === empty) return repeat (a2, 0, 1) // ε | r = r?
    if (a2 === empty) return repeat (a1, 0, 1) // r | ε = r?

    // (r | s) | t  =  r | (s | t) = T.or{ r, s, t }
    // (r | s) | (t | u) = T.or { r, s, t, u }

    //log ('or', a1, a2)
    const expand = a => {
      let [op, ...as] = Store.out (a)
      return op === T.or || op === T.ors ? as : [a] }

    //log ('expand', expand (a1), expand (a2))

    const disjuncts = Ors.join (expand (a1), expand (a2))

    //log ('or disjuncts', disjuncts)

    const r = disjuncts.length === 1 ? disjuncts[0]
      : disjuncts.length === 2 ? Store.apply (T.or, ...disjuncts)
      : Store.apply (T.or, ...disjuncts)
    
    //log ('stored', r, Store.out(r))
    return r
  }

  conc (...as) {
    return as.reduce (this.conc2.bind (this))
  }

  conc2 (a1, a2) {
    if (a1 === bottom) return bottom    // ⊥ r = ⊥
    if (a2 === bottom) return bottom    // r ⊥ = ⊥
    if (a1 === empty) return a2         // ε r = r
    if (a2 === empty) return a1         // r ε = r

    const expand = a => {
      let [op, ...as] = Store.out (a)
      return op === T.conc || op === T.concs ? as : [a] }

    const joined = SquashSemiGroup (this._squash.bind (this)) .join (expand (a1), expand (a2))
    //log ('conc result', concats, concats.length === 1, concats[1])
    const r = joined.length === 1 ? joined[0]
      : joined.length === 2 ? Store.apply (T.conc, ...joined)
      : Store.apply (T.conc, ...joined)
    //log ('stored', r)
    return r
  }

  _squash (a, b) { // Concatenation of two elements
      // log ('squash', a, b)
      let [aop, a1, aleast, amost] = Store.out (a)
      let [bop, b1, bleast, bmost] = Store.out (b)
      const r = aop === T.repeat && bop === T.repeat && a1 === b1
          ? [ Store.repeat (a1, aleast + bleast, amost + bmost) ]
        : a === b1 && bop === T.repeat
          ? [ Store.repeat (a, bleast+1, bmost+1) ]
        : aop === T.repeat && b === a1
          ? [ Store.repeat (b, aleast+1, amost+1) ]
        : a === b
          ? [ Store.repeat (a, 2, 2) ]
        : [ a, b ]
      // log ('squash result', r)
      return r
  }

})}


// Exports
// -------

module.exports = { Shared, Normalised, _print }