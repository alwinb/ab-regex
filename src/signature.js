const log = console.log.bind (console)
const Strings = new Proxy ({}, { get:(_,k) => k })

//  Signature

// A 'Node' is _one level_ of a Regex AST tree
// The Node 'class' is just a namespace at the moment
// Nodes themselves are simply arrays [operator, ...args]

const {
  TOP, BOT, EMPTY,
  STEP, ANY, RANGE,
  GROUP, STAR, OPT, PLUS, NOT,
  AND, OR, CONC } = Strings

const Operators = {
  TOP, BOT, EMPTY,
  STEP, ANY, RANGE,
  GROUP, STAR, OPT, PLUS, NOT,
  AND, OR, CONC }

const cmpJs = (t1, t2) =>
  t1 < t2 ? -1 : t1 > t2 ? 1 : 0

const _compareArgs = cmpX => (a, b) => {
  let r = cmpJs (a.length, b.length), i = 1
  for (let i = 1; !r && i < a.length; i++)
    r = r || cmpX (a[i], b[i])
  return r
}

// I like the idea of
//  just converting between apply and the object
//  So this is what this does. 

class Algebra {

  // Signature functor, morphism part

  static fmap (fn) { return tm => {
    const [c, ...args] = tm
    return c === STEP  ? tm
      : c === ANY   ? tm
      : c === RANGE ? tm
      : c === EMPTY  ? tm
      : c === TOP   ? tm
      : c === BOT   ? tm
      : [c, ...args.map (fn)] }
  }

  // compare; lifts a total order on node elements X
  //  to a total order of Nodes with elements FX

  static compareNode (compareElement) { return (a, b) => {
    const c = a[0], d = b[0]
    const r = Algebra.compareOperator (c, d)
      || (c === STEP  && 0 || cmpJs (a[1], b[1]))
      || (c === RANGE && 0 || cmpJs (a[1], b[1]) || cmpJs (a[2], b[2]))
      || _compareArgs (compareElement) (a, b)
    return r }
  }

  // compare on the operator only

  static compareOperator (op1, op2) {
    return cmpJs (op1, op2)
  }

  static fromObject (object) { return ([op, ...args]) => (
    // constants
    op === BOT   ? object.bottom :
    op === TOP   ? object.top :
    op === EMPTY ? object.empty :
    op === ANY   ? object.any :
    // vars
    op === STEP  ? object.step  (...args) :
    op === RANGE ? object.range (...args) :
    // unary
    op === GROUP ? object.group (...args) :
    op === STAR  ? object.star  (...args) :
    op === PLUS  ? object.plus  (...args) :
    op === OPT   ? object.opt   (...args) :
    op === NOT   ? object.not   (...args) :
    // binary; nary...
    op === OR    ? object.or    (...args) :
    op === AND   ? object.and   (...args) :
    op === CONC  ? object.conc  (...args) :
    undefined
  )}
  
  static fromFunction (apply) {
    return {
      bottom: apply ([BOT]),
      top:    apply ([TOP]),
      empty:  apply ([EMPTY]),
      any:    apply ([ANY]),
      step:   (...args) => apply ([STEP,  ...args]),
      range:  (...args) => apply ([RANGE, ...args]),
      group:  (...args) => apply ([GROUP, ...args]),
      star:   (...args) => apply ([STAR,  ...args]),
      plus:   (...args) => apply ([PLUS,  ...args]),
      opt:    (...args) => apply ([OPT,   ...args]),
      not:    (...args) => apply ([NOT,   ...args]),
      or:     (...args) => apply ([OR,    ...args]),
      and:    (...args) => apply ([AND,   ...args]),
      conc:   (...args) => apply ([CONC,  ...args]),
    }
  }
}

module.exports = { cmpJs, Operators, Algebra }