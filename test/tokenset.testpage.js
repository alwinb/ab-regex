const log = console.log.bind (console)
const { RangeMap } = require ('../src/rangemap')
const { Compiler, compare, compareArray } = require ('../src/tokenset')
const raw = String.raw

// Test
// ====

const spec = {
  atom:    `null`,
  symbol:  `[a-zA-Z] [a-zA-Z0-9]*`,
  number:  `0 | [1-9] [0-9]*`,
  bigint:  `0n | [1-9] [0-9]* n`,
  octal:   `0 (o|O) [0-7]+`,
  bin:     `0 (b|B) [0-1]+`,
  hex:     `0 (x|X) ([0-9A-Fa-f])+`,
  space:   raw `(" " | "\t")+`,
  newline: raw `"\r\n" | "\r" | "\n"`,
  // other: '.+',
}

// const spec = {
//   startTag: `"<" [A-Za-z]`,
//   endTag:   `"</" [A-Za-z]`,
// }

const store = new Compiler ()
const root = store.compile (spec)


// Layout
// ------

// Let's try and build a table

const RM = RangeMap (compare, compareArray)
const append = (xs, x) => xs.concat ([x])

// ### Make Columns

// Takes a compiler.store, and creates a RangeMap rm: (Char -> Id*)
// i.e. returns a RangeMap that maps characters to arrays of state-ids.

function makeColumns (states) {
  const acc = RM .constant ([ ])
  const fn = (acc, s) => RM .merged (append, acc, s.derivs)
  const columns = states.reduce (fn, acc)
  return columns
}

// ### splitDeriv

// This uses a disrete 'compare' (the empty relation) on the codomain,
// as a trick to prevent merging any ranges at all, thus, it 'splits'
// the derivs of a state into an array of spans, across the 'splits' boundaries. 

const splitRM = RangeMap (compare, () => -1)
const splitDerivs = (splits) => ({ id, accepts, derivs }) => {
  const derivs_ = splitRM .merged (a => a, derivs, splits)
  return { id, accepts, derivs:[...derivs_ .spans ()] }
}

// ### Make Table

// Takes a compiler.store, and creates a list of states, { id, accepts, derivs }
// where derivs (NB) is no longer a RangeMap, but an Array of span objects { start, value, end }
// with start and end being inclusive, and value being a state-id. 

function makeTable (states) {
  const cols = makeColumns (states)
  const rows = states.map (splitDerivs (cols))
  const head = []
  for (const x of cols.spans ()) head.push (simplifySpan (x))
  return { head, rows, _cols:cols }
}

// where...

function simplifySpan ({ start, value, end }) {
  start = String.fromCodePoint (start[1]||'')
  end = String.fromCodePoint (end[1]-1||'')
  return { start, end }
}


// Page Builder
// ------------

const { domex } = require ('domex')

const meta = {
  styles: [
   `file://${__dirname}/../test/style/base.css?${Math.random ()}`
  ]
}

const { _cols, head:thead, rows:tbody } = makeTable (store.states)

// log ('<pre>', {_cols, thead, tbody})

domex `

  head @meta
    > link [rel=stylesheet href=%] *styles
    + style "td[data-id='0'] { color:#bbb; background:#eee; } th,td { text-align:center }"
  ;

  table @table
    > @thead ~thead
    + @tbody ~tbody;

  thead @thead > tr
    > th "id"
    + th "accepts"
    + th.nowrap* %start"–"%end;

  tbody @tbody > tr*
    > (td~id %)
    + (td~accepts > (span::null "–" | %))
    + (td [data-id=%value] *derivs > %value);

  // Page

  html
    > @meta ~meta
    + body
      > h1 "TokenSet"
      + p > (
        "This is a test page for the TokenSet compiler."
        + br
        + "It shows a specification for a TokenSet, and the computed transition table for it."
      )
      + @default.tab ~spec
      + @table.lines

` .renderTo ({ meta, spec, thead, tbody }, process.stdout)

process.exit (205)

// log ('<pre>', [...store._inspect ()], '</pre>')
// log ('<pre>', cols, '</pre>')

// FIXME domex: mismatched endgroup
// table @table
//   > tbody > tr*
//     > (th > @range) ~range
//     + (td > %)*value);

// Also for domex
// I'd like to be able to use 'append' with elems as well, e.g. 
// p "test" br "foo" == (p > "test" + br + "foo")


// Likewise, iterative application of attributes like
//  (td*derivs [class=%value] > %value);