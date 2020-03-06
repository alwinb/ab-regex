const log = console.log.bind (console)
const json = x => JSON.stringify (x, null, 2)

//  Signature

// A 'Node' is _one level_ of a Regex AST tree
// The Node 'class' is just a namespace at the moment
// Nodes themselves are simply arrays [operator, ...args]

const Operators =  {
  TOP : 'top', 
  BOT : 'bottom', 
  EMPTY : 'empty', 
  STEP: 'step', 
  ANY : 'any', 
  RANGE : 'range', 
  GROUP: 'group', 
  REPEAT : 'repeat', 
  STAR : 'star', 
  OPT : 'opt', 
  PLUS : 'plus', 
  NOT : 'not', 
  AND: 'and', 
  OR : 'or', 
  CONC : 'conc', 
  // Hacked in here, used by normalise
  OR_N: 'or_n',
  CONC_N: 'conc_n',
}

const {
  TOP, BOT, EMPTY, 
  STEP, ANY, RANGE,
  GROUP, REPEAT, NOT,
  AND, OR, CONC, OR_N, CONC_N } = Operators

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
      : c === ANY    ? tm
      : c === RANGE  ? tm
      : c === EMPTY  ? tm
      : c === TOP    ? tm
      : c === BOT    ? tm
      : c === REPEAT ? [c, fn (args[0]), args[1], args[2]]
      : [c, ...args.map (fn)] }
  }

  // compare; lifts a total order on node elements X
  //  to a total order of Nodes with elements FX

  static compareNode (compareElement) { return (a, b) => {
    const c = a[0], d = b[0]
    const r = Algebra.compareOperator (c, d)
      || (c === STEP  && 0 || cmpJs (a[1], b[1]))
      || (c === RANGE && 0 || cmpJs (a[1], b[1]) || cmpJs (a[2], b[2]))
      || (c === REPEAT && 0 || compareElement (a[1], b[1]) || cmpJs (a[2], b[2]) || cmpJs (a[3], b[3]))
      || _compareArgs (compareElement) (a, b)
    return r }
  }

  // compare on the operator only

  static compareOperator (op1, op2) {
    return cmpJs (op1, op2)
  }

  static fromObject (object) { 
    return (op, ...args) => { try {
      return false ? false
        : op === BOT   ? object.bottom
        : op === TOP   ? object.top
        : op === EMPTY ? object.empty
        : op === ANY   ? object.any
        : object [op] (...args)
      }
      catch (e) {
        console.log (`Error in ${object.constructor.name}.apply`)
        console.log (`Calling ${json(op)} on `, args, 'in Algebra')
        console.log (object.constructor.name, object [Symbol.iterator] ? [...object] : object)
        throw e
      }
    }
  }

  static fromFunction (apply) {
    return {
      bottom: apply (BOT),
      top:    apply (TOP),
      empty:  apply (EMPTY),
      any:    apply (ANY),
      step:   (a)     => apply (STEP,  a ),
      range:  (a, b)  => apply (RANGE, a, b),
      group:  (r)     => apply (GROUP, r   ),
      repeat: (r,l,m) => apply (REPEAT, r, l, m),
      star:   (r)     => apply (STAR,  r   ),
      plus:   (r)     => apply (PLUS,  r   ),
      opt:    (r)     => apply (OPT,   r   ),
      not:    (r)     => apply (NOT,   r   ),
      and:    (r, s)  => apply (AND,   r, s),
      or:     (...as) => apply (OR,   ...as),
      conc:   (...as) => apply (CONC, ...as),
      or_n:   (...as) => apply (OR_N,   ...as),
      conc_n: (...as) => apply (CONC_N, ...as),
    }
  }
}

module.exports = { cmpJs, Operators, Algebra }