const hoop = require ('../lib/hoop2')
const { opInfo, token, tokenType, start, atom, konst, prefix, infix, postfix, assoc, end } = hoop
const { LEAF, CONST, PREFIX, INFIX, POSTFIX } = hoop.Roles
const { raw } = String
const log = console.log.bind (console)


// HOOP Grammar for Regex
// ======================

// ### Preliminaries

const skips = {
  space:   raw `[\t\f\x20]+`,
  newline: raw `[\n]` , 
}

// ### Hoop Signature
// Operators are grouped by precedence and ordered
// by streangth, increasing. 

const Regex = {
  name: 'Regex',
  skip: skips,
  end: end `[)]`,
  sig: [
    { any:    konst `[.]`
    , top:    konst `[⊤]`
    , bottom: konst `[⊥]`
    , empty:  konst `[ε]`
    , step:   atom `[a-zA-Z0-9]`
    , string: [LEAF, `["]`, 'Chars',   `["]` ] // wrapfix-atom
    , range:  [LEAF, `[[]`, 'RangeSet',  `]` ] // wrapfix-atom
    , group:  [LEAF, `[(]`, 'Regex',   `[)]` ] }, // wrapfix-atom

    { and:    assoc  `[&]`  },
    { or:     assoc  `[|]`  },
    { conc:   assoc  `.{0}(?=[!a-zA-Z0-9."[(⊤⊥ε\t\f\x20\n])` },
    { not:    prefix `[!]`  },

    { star:   postfix `[*]`
    , opt:    postfix `[?]`
    , plus:   postfix `[+]`
    , repeat: postfix `<\d+(?:-(?:\d+|[*]))?>` },
  ]
}

const Chars = {
  name: 'Chars',
  end: end `["]`,
  sig: [
    { chars:  atom `[^\x00-\x19\\"]` // +
    , esc:    atom `[\\]["/\\bfnrt]`
    , hexesc: atom `[\\]u[a-fA-F0-9]{4}`
    , empty:  konst `.{0}(?=")` },
    { strcat: assoc `.{0}(?!")` }
  ]
}

const RangeSet = {
  name: 'RangeSet',
  end: end `]`,
  sig: [
    { range:  atom `[^\x00-\x19\]]-[^\x00-\x19\]]`
    , char:   atom `[^\x00-\x19\]]`
    // , esc:    atom `[\\]["/\\bfnrt]`
    // , hexesc: atom `[\\]u[a-fA-F0-9]{4}`
    , empty: konst `.{0}(?=\])` },
    { or:    assoc `.{0}(?!\])` }
  ]
}

// Compile the grammar
// -------------------

const { lexers, sorts } =
  hoop.compile ({ Regex, Chars, RangeSet })

// Collecting the names for the node types

const typeNames = {}
const _ts = sorts
for (const ruleName in _ts)
  for (const typeName in _ts[ruleName]) {
    typeNames[_ts[ruleName][typeName]] = typeName
    // typeNames[_ts[ruleName][typeName]] = ruleName +'.' + typeName
    // log (ruleName, typeName, opInfo (_ts[ruleName][typeName]))
  }


// TODO right, so can we make a more generic fmap, compare, etc?
// Soo, at the moment, part of the operator info is stored on the .. lexer
// buit for building the fmap, we need that


const T = sorts.Regex

// log (sorts, lexers.Regex.Before.infos, lexers.Regex.After, )
// for (let k in T) log (k, ':', opInfo (T[k]))


// Terms
// =====

// A 'Node' is _one level_ of a Regex AST tree, they are
// stored simply as arrays [operator, ...args]

// Signature functor, morphism part

const fmap = fn => tm => {
  const [c, ...args] = tm
  return c & CONST ? tm
    : c === T.step ? tm
    : c === T.range ? tm
    : c === T.repeat ? [c, fn (args[0]), args[1], args[2]]
    : [c, ...args.map (fn)] }


// compareNode; lifts a total order on elements X,
//  to a total order on nodes FX

const compareNode = compareElement => (a, b) => {
  const c = a[0], d = b[0]
  const r = cmpJs (c, d)
    || (c === T.step  && 0 || cmpJs (a[1], b[1]))
    || (c === T.range && 0 || cmpJs (a[1], b[1]) || cmpJs (a[2], b[2]))
    || (c === T.repeat && 0 || compareElement (a[1], b[1]) || cmpJs (a[2], b[2]) || cmpJs (a[3], b[3]))
    || _compareArgs (compareElement) (a, b)
  return r }

const cmpJs = (t1, t2) =>
  t1 < t2 ? -1 : t1 > t2 ? 1 : 0

const _compareArgs = cmpX => (a, b) => {
  let r = cmpJs (a.length, b.length)
  for (let i = 1; !r && i < a.length; i++)
    r = r || cmpX (a[i], b[i])
  return r
}


// I like the idea of
//  just converting between apply and the object
//  So this is what this does. 

const Algebra = {

  fromObject (object) { 
    return (op, ...args) => { try {
      const name = typeNames[op]
      return op & CONST ? object[name] : object [name] (...args)
      }
      catch (e) {
        const msg = `Error in ${object.constructor.name}.apply: ` + e.message
        console.log (msg)
        console.log (`Calling`, op, `on`, args, 'in Algebra')
        console.log (object.constructor.name, object [Symbol.iterator] ? [...object] : object)
        throw new Error (msg)
      }
    }
  },

  fromFunction (apply) {
    return {
      bottom: apply (T.bottom),
      top:    apply (T.top),
      empty:  apply (T.empty),
      any:    apply (T.any),
      step:   (a)     => apply (T.step,   a ),
      range:  (a, b)  => apply (T.range,  a, b),
      group:  (r)     => apply (T.group,  r   ),
      repeat: (r,l,m) => apply (T.repeat, r, l, m),
      star:   (r)     => apply (T.repeat, r, 0, Infinity),
      plus:   (r)     => apply (T.plus,   r   ),
      opt:    (r)     => apply (T.opt,    r   ),
      not:    (r)     => apply (T.not,    r   ),
      and:    (r, s)  => apply (T.and,    r, s),
      or:     (...as) => apply (T.or,    ...as),
      conc:   (...as) => apply (T.conc,  ...as),
    }
  }
}


module.exports = { lexers, sorts, operators:sorts.Regex, Algebra, fmap, compareNode }