const log = console.log.bind (console)
module.exports = Lexer
Lexer.Lexer = Lexer

// Tiny lexer runtime
// ==================

function Lexer (grammar, start) {
  const rules = compile (grammar)

  this.tokenize = function (input, position = 0, symbol = start) {
    const state = { position, symbol }
    const stream = tokens (input, state)
    stream.state = state
    return stream
  }

  function *tokens (input, state) {
    let { position, symbol } = state
    do if (!(symbol in rules))
      throw new Error (`Lexer: no such symbol: ${symbol}.`)

    else {
      const rule  = rules [symbol]
      const regex = rule.regex
      const match = (regex.lastIndex = position, regex.exec (input))

      if (!match){
        if (position !== input.length)
          throw new SyntaxError (`Lexer: invalid input at index ${position} in state ${symbol} before ${input.substr (position, 12)}`)
        return
      }

      let i = 1; while (match [i] == null) i++
      const edge = rule.edges [i-1]
      const token = edge.emit.call (state, match[i])
      symbol = state.symbol = edge.goto.call (state, match[i])
      position = state.position = regex.lastIndex
      yield token
    }

    while (position <= input.length)
  }
}


// The compiler
// ------------

function State (table, name) {
  this.name = name
  this.regex = new RegExp ('(' + table.map (fst) .join (')|(') + ')', 'gy')
  this.edges = table.map (fn)

  function fn (row) {
    return compileRow (name, Array.isArray (row) ? { emit:row[1], goto:row[2] } : row)
  }
}

function compile (grammar) {
  const compiled = {}
  for (let state_name in grammar)
    compiled [state_name] = new State (grammar [state_name], state_name)
  return compiled
}

function fst (row) {
  return Array.isArray (row) ? row [0]
    : ('if' in row) ? row ['if'] : '.{0}'
}

function compileRow (symbol, { emit, goto = symbol }) {
  const g = typeof goto === 'function' ? goto : (data) => goto
  const e = typeof emit === 'function' ? emit : (data) => [emit, data]
  return { emit:e, goto:g }
}

