const hoop = require ('../lib/hoop2')
const { signature:S, operators:T, lexers } = require ('./signature.js')
const log = console.log.bind (console)


// HOOP Parser
// ==========

function parse (input, apply_) {
  const apply = apply_ == null ? preEval :
    (...args) => {
      // log ('preEval', { args })
      args = preEval (...args)
      // log ('==>', args)
      const r = apply_ (...args)
      // log ('==>', r)
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


function preEval (...args) {
  // log ('preval', args)
  const [op, x1, x2] = args
  const [tag, data] = op
  args[0] = tag
  // log ('preEval', op, x1||'', x2||'')
  const r
    = tag === S.Regex.group    ? [ T.group,  x1 ]
    : tag === S.Regex.range    ? [ T.group,  x1 ]
    : tag === S.Regex.string   ? [ T.group,  x1 ] // Quickly added; REVIEW
    : tag === S.Regex.step     ? [ T.step,   data ]
    : tag === S.Regex.repeat   ? parseRepeat (data, x1)
    : tag === S.Regex.star     ? [ T.repeat, x1, 0, Infinity ]
    : tag === S.Regex.plus     ? [ T.repeat, x1, 1, Infinity ]
    : tag === S.Regex.opt      ? [ T.repeat, x1, 0, 1 ]

    : tag === S.Chars.empty    ? [ T.empty ]
    : tag === S.Chars.chars    ? [ T.step, data ]
    : tag === S.Chars.esc      ? [ T.step, _escapes [data[1]] || data[1] ]
    : tag === S.Chars.hexesc   ? [ T.step, String.fromCodePoint (parseInt (data.substr(2), 16)) ]
    : tag === S.Chars.strcat   ? [ T.conc, ...args.slice (1) ]

    : tag === S.RangeSet.empty ? [ T.empty ]
    : tag === S.RangeSet.range ? [ T.range, data[0], data[2] ]
    : tag === S.RangeSet.char  ? [ T.step,  data ]
    : tag === S.RangeSet.or    ? [ T.or,    ...args.slice (1) ]

    : (args[0] = tag, args)
    // log ('==>', r)
  return r
}

function parseRepeat (data, arg) {
  let [l, m] = data.substr (1, data.length-2) .split ('-')
  l = Math.max (+l, 0)
  m = m == null ? l : m === '*' ? Infinity : +m
  return [ T.repeat, arg, l, m ]
}


module.exports = { parse }