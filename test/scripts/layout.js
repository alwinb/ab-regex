const { compare, compareArray } = _private

// Layout
// ------

// Let's try and build a table

const RM = RangeMap (compare, compareArray)
const append = (xs, x) => xs.concat ([x])

// ### Make Columns

// Takes a compiler.store, and creates a RangeMap rm: (Char -> Id*)
// i.e. returns a RangeMap that maps characters to arrays of state-ids.

function makeColumns (states) {
  const acc = RM .fromConstant ([ ])
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
  return { id, accepts, derivs:[...derivs_ .ranges ()] }
}

// ### Make Table

// Takes a compiler.store, and creates a list of states, { id, accepts, derivs }
// where derivs (NB) is no longer a RangeMap, but an Array of span objects { start, value, end }
// with start and end being inclusive, and value being a state-id. 

function makeTable (states) {
  const cols = makeColumns (states)
  const rows = states.map (splitDerivs (cols))
  const head = []
  for (const x of cols.ranges ()) head.push (simplifySpan (x))
  return { head, rows, _cols:cols }
}

// where...

function simplifySpan ({ start, value, end }) {
  start = start[0] === -Infinity ? '-∞' :  String.fromCodePoint (start[1]||'')
  end = end[0] === Infinity ? '∞' : String.fromCodePoint (end[1]-1||'')
  return { start, end }
}
