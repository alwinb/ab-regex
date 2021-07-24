const log = console.log.bind (console)
// const { inspect } = require ('util')
// const show = _ => console.log (inspect (_, { depth:10 }), '\n')
const hoop = require ('../lib/hoop2.js')
const { token, tokenType, start, atom, prefix, infix, postfix, assoc, end } = hoop
const { LEAF, PREFIX, INFIX, POSTFIX } = hoop.Roles
const { raw } = String


// HOOP Grammar for Regex
// ======================

// ### Preliminaries

const skips = {
  space:   raw `[\t\f\x20]+`,
  newline: raw `[\n]` , 
}

// ### Hoop Signature
// Operators are grouped by precedence nd ordered
// by streangth, increasing. 

const Regex = {
  name: 'Regex',
  skip: skips,
  end: end `[)]`,
  sig: [
    { any:    atom `[.]`
    , top:    atom `[⊤]`
    , bottom: atom `[⊥]`
    , empty:  atom `[ε]`
    , step:   atom `[a-zA-Z0-9]`
    , string: [LEAF, `["]`,     'Chars',  `["]`] // wrapfix-atom
    , range:  [LEAF, `[[]`,     'RangeSet',  `]` ] // wrapfix-atom
    // , range:  atom `\[[^\]]-[^\]]]`
    , group:  [LEAF, `[(]`,     'Regex',   `[)]`] }, // wrapfix-atom

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
    , empty:  atom `.{0}(?=")` },
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
    , empty:  atom `.{0}(?=\])` },
    { rnor: assoc `.{0}(?!\])` }
  ]
}


// Compile the grammar
// -------------------

const { lexers, types } =
  hoop.compile ({ Regex, Chars, RangeSet })

// Collecting the names for the node types

const typeNames = {}
const _ts = types
for (const ruleName in _ts)
  for (const typeName in _ts[ruleName])
    typeNames[_ts[ruleName][typeName]] = typeName
    // typeNames[_ts[ruleName][typeName]] = ruleName +'.' + typeName

//log (types, typeNames)

// Configuring the parser
// ----------------------

function parse (input, apply_) {
  const apply = apply_ == null ? preEval :
    (...args) => {
      // log ('preEval', { args })
      args = preEval (...args)
      // log ({ apply_, args })
      const r = apply_ (...args)
      // log (r)
      return r
    }
  const S0 = lexers.Regex.Before.next ('(')
  const E0 = lexers.Regex.After.next (')')
  const p = new hoop.Parser (lexers, S0, E0, apply)
  return p.parse (input)
}


// The parser algebra
// ------------------

const _escapes =
  { 'b':'\b', 'f':'\f', 'n':'\n', 'r':'\r', 't':'\t' }

const T = types

function preEval (...args) {
  // log ('preval', args)
  // if (typeof args[0] === 'number')
  //   return [args[0]]
  const [op, x1, x2] = args
  const [tag, data] = op
  args[0] = typeNames [tag]
  // log ('preEval', op, x1||'', x2||'')
  const r
    = tag === T.Regex.group  ? ['group', x1]
    : tag === T.Regex.step   ? ['step',  data]
    : tag === T.Regex.range  ? ['group', x1] //['range', data[1], data[3]]
    : tag === T.Regex.repeat ? parseRepeat (data, x1)
    : tag === T.Regex.star   ? ['repeat', x1, 0, Infinity]
    : tag === T.Regex.plus   ? ['repeat', x1, 1, Infinity]
    : tag === T.Regex.opt    ? ['repeat', x1, 0, 1]
    : tag === T.Regex.string ? ['group', x1] // Quickly added; REVIEW

    : tag === T.Chars.empty  ? ['empty']
    : tag === T.Chars.chars  ? ['step', data]
    : tag === T.Chars.esc    ? ['step', _escapes [data[1]] || data[1]]
    : tag === T.Chars.hexesc ? ['step', String.fromCodePoint (parseInt (data.substr(2), 16))]
    : tag === T.Chars.strcat ? ['conc', ...args.slice (1)]

    : tag === T.RangeSet.empty ? ['empty']
    : tag === T.RangeSet.range ? ['range', data[0], data[2]]
    : tag === T.RangeSet.char  ? ['step', data]
    : tag === T.RangeSet.rnor  ? ['or', ...args.slice (1)]

    : args
  // log ('==>', {r})
  return r
}

function parseRepeat (data, arg) {
  let [l, m] = data.substr (1, data.length-2) .split ('-')
  l = Math.max (+l, 0)
  m = m == null ? l : m === '*' ? Infinity : +m
  return ['repeat', arg, l, m]
}


// log (typeNames)

module.exports = { parse }

// Quick test
// log (parse ('abc!c*'))
// log (parse ('ab<1>'))
