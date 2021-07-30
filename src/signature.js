const hoop = require ('../lib/hoop2')
const { opInfo, token, tokenType, start, atom, konst, prefix, infix, postfix, assoc, end } = hoop
const { LEAF, CONST, PREFIX, INFIX, POSTFIX } = hoop.Roles
const { raw } = String
const log = console.log.bind (console)


// HOOP Grammar for Regex
// ======================

// ### Preliminaries

const skips = {
  space:   raw `[\t \f \x20]+`,
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
    { conc:   assoc  `.{0}(?=[!a-zA-Z0-9."[(⊤⊥ε \t \f \x20 \n])` },
    { not:    prefix `[!]`  },

    { star:   postfix `[*]`
    , opt:    postfix `[?]`
    , plus:   postfix `[+]`
    , repeat: postfix `<\d+(?:-(?:\d+|[*]))?>` },
  ]
}

// Sting syntax - The same as JSON, but with additional support
// for 2-digit hexadecimal escape sequences: such as \x0A and the like.

const Chars = {
  name: 'Chars',
  end: end `["]`,
  sig: [
    { chars:  atom `[^\x00-\x19\\"]` // +
    , esc:    atom `[\\] ["/ \\ bfnrt]`
    , xesc:   atom `[\\] x[a-f A-F 0-9]{2}`
    , hexesc: atom `[\\] u[a-f A-F 0-9]{4}`
    , empty:  konst `.{0}(?=")` },
    { strcat: assoc `.{0}(?!")` }
  ]
}

// Range syntax - Allows whitespace!
// Ranges a-z must not use space around the hyphen
// Supports the same escape sequences (though WIP not yet for ranges)

const RangeSet = {
  name: 'RangeSet',
  skips: skips,
  end: end `]`,
  sig: [
    { range:  atom `[^ \x00-\x20 \\ \]]-[^ \x00-\x20 \\ \]]`
    , char:   atom `[^ \x00-\x20 \\ \]]`
    , esc:    atom `[\\]["/ \\ bfnrt]`
    , xesc:   atom `[\\] x[a-f A-F 0-9]{2}`
    , hexesc: atom `[\\] u[a-f A-F 0-9]{4}`
    , empty: konst `.{0}(?=[\x00-\x20 \]])` },
    { or:    assoc `[\t \f \x20 \n]+ | .{0}(?!\])` }
  ]
}


// Compile the grammar
// -------------------

const { lexers, sorts:S } =
  hoop.compile ({ Regex, Chars, RangeSet })

// Only a subset of the operators are for public use, 
//  collect them here. 

const T0 =
  S.Regex

const T = { 
  bottom:1, top:1, empty:1, any:1, 
  step:1, range:1, repeat:1, 
  not:1, and:1, or:1, conc:1 }

const typeNames = {}
for (const k in T)
  typeNames [ T[k] = T0[k] ] = k


// Configure the parser
// --------------------

function parse (input, apply_) {
  const apply = apply_ == null ? preEval :
    (...args) => {
      // log ('preEval', { args })
      args = preEval (...args)
      // log ('==>', args)
      const r = args[0] === T0.group ? args[1] : apply_ (...args)
      // log ('==>', r)
      return r
    }
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
    = tag === S.Regex.step     ? [ T.step, data ]
    : tag === S.Regex.repeat   ? parseRepeat (data, x1)

    : tag === S.Regex.star     ? [ T.repeat, x1, 0, Infinity ]
    : tag === S.Regex.plus     ? [ T.repeat, x1, 1, Infinity ]
    : tag === S.Regex.opt      ? [ T.repeat, x1, 0, 1 ]

    : tag === S.Regex.group    ? [ T0.group, x1 ]
    : tag === S.Regex.range    ? [ T0.group, x1 ]
    : tag === S.Regex.string   ? [ T0.group, x1 ]

    : tag === S.Chars.empty    ? [ T.empty ]
    : tag === S.Chars.chars    ? [ T.step, data ]
    : tag === S.Chars.esc      ? [ T.step, _escapes [data[1]] || data[1] ]
    : tag === S.Chars.xesc     ? [ T.step, String.fromCodePoint (parseInt (data.substr(2), 16)) ]
    : tag === S.Chars.hexesc   ? [ T.step, String.fromCodePoint (parseInt (data.substr(2), 16)) ]
    : tag === S.Chars.strcat   ? [ T.conc, ...args.slice (1) ]

    : tag === S.RangeSet.empty ? [ T.bottom ]
    : tag === S.RangeSet.range ? [ T.range, data[0], data[2] ]
    : tag === S.RangeSet.char  ? [ T.step,  data ]
    : tag === S.RangeSet.esc   ? [ T.step, _escapes [data[1]] || data[1] ]
    : tag === S.RangeSet.xesc  ? [ T.step, String.fromCodePoint (parseInt (data.substr(2), 16)) ]
    : tag === S.RangeSet.hexesc? [ T.step, String.fromCodePoint (parseInt (data.substr(2), 16)) ]
    : tag === S.RangeSet.or    ? [ T.or,    ...args.slice (1) ]

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
    : c === T.step ? tm
    : c === T.range ? tm
    : c === T.repeat ? [c, fn (args[0]), args[1], args[2]]
    : [c, ...args.map (fn)] }


// compareNode; lifts a comparison on elements stored in an AST node,
//  to a total order on the AST nodes themselves.

const compareNode = compareElement => (a, b) => {
  const c = a[0], d = b[0]
  const r = cmpJs (c, d)
    || (c === T.step  && 0 || cmpJs (a[1], b[1]))
    || (c === T.range && 0 || cmpJs (a[1], b[1]) || cmpJs (a[2], b[2]))
    || (c === T.repeat && 0 || compareElement (a[1], b[1]) || cmpJs (a[2], b[2]) || cmpJs (a[3], b[3]))
    || _compareArgs (compareElement) (a, b)
  return r }

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

const fromObject = object => (op, ...args) => {

  try {
    const name = typeNames[op]
    return op & CONST
      ? object[name]
      : object [name] (...args)
  }

  catch (e) {
    const msg = `Error in ${object.constructor.name}.apply: ` + e.message
    console.log (msg)
    console.log (`Calling`, op, `on`, args, 'in Algebra')
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


// Exports
// -------

module.exports = {
  operators:T,
  fmap, compareNode, parse,
  Algebra: { fromObject, fromFunction }
}