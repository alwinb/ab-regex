const hoop = require ('../lib/hoop2')
const { opInfo, token, tokenType, start, atom, konst, prefix, infix, postfix, assoc, end } = hoop
const { LEAF, CONST, PREFIX, INFIX, POSTFIX } = hoop.Roles
const { CharSet } = require ('../src/charset')

const { raw } = String
const log = console.log.bind (console)

const wrapfix = (...args) => {
  if (args.length !== 2) 
    throw new Error ('wrapfix operator definition must use one placeholder')
  const [left, right] = args[0] .raw .map (_ => _.replace (/\s/g, ''))
  return [LEAF, left, args[1], right]
}  

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
    { any:    konst   `[.]`
    , top:    konst   `[⊤]`
    , bottom: konst   `[⊥]`
    , empty:  konst   `[ε]`
    , char:   atom    `[a-zA-Z0-9]`
    , string: wrapfix `["]  ${ 'Chars'    }  "`
    , nstep:  wrapfix `\[\^ ${ 'RangeSet' }  ]`
    , step:   wrapfix `[[]  ${ 'RangeSet' }  ]`
    , group:  wrapfix `[(]  ${ 'Regex'    }  )` },

    { and:    assoc   `[&]`  },
    { or:     assoc   `[|]`  },
    { conc:   assoc   `.{0}(?=[!a-zA-Z0-9."[(⊤⊥ε\t\f\x20\n])` },
    { not:    prefix  `[!]`  },

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
    { char:   atom `[^\x00-\x19\\"]` // +
    , esc:    atom `[\\]["/\\bfnrt]`
    , hexesc: atom `[\\]u[a-fA-F0-9]{4}`
    , empty:  konst `.{0}(?=")` },
    { strcat: assoc `.{0}(?!")` }
  ]
}

const RangeSet = {
  name: 'RangeSet',
  skip: skips,
  end: end `]`,
  sig: [
    { range:  atom `[^\x00-\x19\]]-[^\x00-\x19\]]`
    , char:   atom `[^\x00-\x19\]]`
    // , esc:    atom `[\\]["/\\bfnrt]`
    // , hexesc: atom `[\\]u[a-fA-F0-9]{4}`
    , empty: konst `.{0}(?=[\]\t\f\x20\n])` },
    { or:    assoc `.{0}(?![\]\t\f\x20\n])` }
  ]
}


// Compile the grammar
// -------------------

const { lexers, sorts:S } =
  hoop.compile ({ Regex, Chars, RangeSet })

// log (S)

// Only a subset of the operators are for public use, 
//  collect them here. 

const T0 =
  S.Regex

const RS = 
  S.RangeSet

const charSetOps =
  RS.range|RS.char|RS.empty|RS.or
  // NB no, using & to check fot a charSetOp does not work, 
  // because the flags are part of the op

const T = { 
  bottom:1, top:1, empty:1, any:1, 
  char:1, step:1, nstep:1, repeat:1, 
  not:1, and:1, or:1, conc:1 }

const opNames = {}
for (const k in T)
  opNames [ T[k] = T0[k] ] = k

const charSetOpNames = {}
for (const k in RS)
  charSetOpNames [ RS[k] ] = k


// Configure the parser
// --------------------


const wrapApply = (rxApply, rsApply = charSetApply) => (...args) => {
  // log ('preEval', { args })
  args = preEval (...args)
  // log ('==>', args)
  const r = args[0] === T0.group ? args[1]
    : args[0] in charSetOpNames ? rsApply (...args) // REVIEW temporary solution
    : rxApply (...args)
  // log ('==>', r)
  return r
}

function parse (input, regexApply, rangeSetApply) {
  const apply = regexApply == null ? preEval : wrapApply (regexApply, rangeSetApply)
  const startToken = lexers.Regex.Before.next ('(')
  const endToken = lexers.Regex.After.next (')')
  const p = new hoop.Parser (lexers, startToken, endToken, apply)
  return p.parse (input)
}


// The parser algebra
// ------------------

const _escapes =
  { 'b':'\b', 'f':'\f', 'n':'\n', 'r':'\r', 't':'\t' }

function preEval (...args) {
  const [op, x1, x2] = args
  const [tag, data] = op
  const r
    = tag === S.Regex.char     ? [ T.char, data ]
    : tag === S.Regex.step     ? [ T.step, x1   ]
    : tag === S.Regex.nstep    ? [ T.nstep, x1  ]
    : tag === S.Regex.repeat   ? parseRepeat (data, x1)

    : tag === S.Regex.star     ? [ T.repeat, x1, 0, Infinity ]
    : tag === S.Regex.plus     ? [ T.repeat, x1, 1, Infinity ]
    : tag === S.Regex.opt      ? [ T.repeat, x1, 0, 1 ]

    : tag === S.Regex.group    ? [ T0.group, x1 ]
    : tag === S.Regex.string   ? [ T0.group, x1 ]

    : tag === S.Chars.empty    ? [ T.empty ]
    : tag === S.Chars.char     ? [ T.char, data ] // REVIEW optimise to allow stings instead of single chars?
    : tag === S.Chars.esc      ? [ T.char, _escapes [data[1]] || data[1] ]
    : tag === S.Chars.hexesc   ? [ T.char, String.fromCodePoint (parseInt (data.substr(2), 16)) ]
    : tag === S.Chars.strcat   ? [ T.conc, ...args.slice (1) ]

    : tag === S.RangeSet.empty ? [ RS.empty ]
    : tag === S.RangeSet.range ? [ RS.range, data[0], data[2] ]
    : tag === S.RangeSet.char  ? [ RS.char,  data ]
    : tag === S.RangeSet.or    ? [ RS.or,    ...args.slice (1) ]

    : (args[0] = tag, args)
  return r
}

function parseRepeat (data, arg) {
  let [l, m] = data.substr (1, data.length-2) .split ('-')
  l = Math.max (+l, 0)
  m = m == null ? l : m === '*' ? Infinity : +m
  return [ T.repeat, arg, l, m ]
}


// Terms / AST Nodes
// =================

const cmpJs = (t1, t2) =>
  t1 < t2 ? -1 : t1 > t2 ? 1 : 0

// Signature functor, morphism part

const fmap = fn => tm => {
  const [c, ...args] = tm
  return c & CONST ? tm
    : c === T.char ? tm
    : c === T.step ? tm // NB TODO 'range' is still present in dfa ao.
    : c === T.repeat ? [c, fn (args[0]), args[1], args[2]]
    : [c, ...args.map (fn)] }


// compareNode; lifts a comparison on elements stored in an AST node,
//  to a total order on the AST nodes themselves.

const compareNode = compareElement => (a, b) => {
  const c = a[0], d = b[0]
  // log ('compareNode', a, b, T)
  // log (cmpJs (a, b), c === T.char, c === T.step)
  const r = cmpJs (c, d)
  if (!r) switch (c) {
    case T.char:    return cmpJs (a[1], b[1])
    case T.range:   return cmpJs (a[1], b[1]) || cmpJs (a[2], b[2])
    case T.step:    return CharSet.compare (a[1], b[1])
    case T.repeat:  return compareElement (a[1], b[1]) || cmpJs (a[2], b[2]) || cmpJs (a[3], b[3])
    default: return _compareArgs (compareElement) (a, b)
  }
  return r 
}

const _compareArgs = compareElement => (a, b) => {
  let r = cmpJs (a.length, b.length)
  for (let i = 1; !r && i < a.length; i++)
    r = r || compareElement (a[i], b[i])
  return r
}


// Algebra APIs
// ------------

// There are _two_ interfaces. One is as a single apply function
// that takes as its first argument the operator, and arguments as rest. 
// An alternative interface is that of an object / dict with constants 
// and functions as named by the operators. 
// The following allows converting between them. 

const fromObject = (object, names = opNames) => (op, ...args) => {

  try {
    const name = names[op]
    return op & CONST
      ? object [name]
      : object [name] (...args)
  }

  catch (e) {
    const msg = `Error in ${object.constructor.name}.apply: ` + e.message
    console.log (msg)
    console.log (`Calling`, opNames[op]||op, `on`, args, 'in Algebra')
    console.log (object.constructor.name, object [Symbol.iterator] ? [...object] : object)
    throw new Error (msg)
  }
}

const fromFunction = apply => {
  const alg = { }
  for (const k in T) {
    const op = T [k]
    alg [k] = op & CONST ? apply (op)
      : (...args) => apply (op, ...args) }
  return alg
}

const Algebra = { fromObject, fromFunction } 

const charSetApply = 
  fromObject (CharSet, charSetOpNames)


// Exports
// -------

module.exports = {
  operators:T,
  operatorNames: opNames,
  charSetOpNames,
  fmap, compareNode, parse,
  Algebra
}