const log = console.log.bind (console)
const Symbols = new Proxy ({}, { get:(_,k) => Symbol (k) })
const States = Symbols
const createSymbols = (map = {}, inv) => new Proxy (map, { get:(_, k) => {
  const s = Symbol (k); return (map [k] = s, inv [s] = k, s) } })

// Token classes
// -------------

const TokenClasses = {}
const Modifiers = {}
const _names = {}

const { Space, Literal, Var, // may or may not be named
  Group, Begin, End, Const,  // named
  Prefix, Postfix, Infix, Infixl, Infixr // names and with precedence modifier
  } = createSymbols (TokenClasses, _names)

Token.Space = (data) => Token (Space, data)
Token.Var = (data) => Token (Var, data)
Token.Literal = (data) => Token (Literal, data)
//Token.Begin = (data, name) => 


// Tokens
// ------

// ... are objects { type, ?name, data, ?precedence, ...modifiers }
// and I am jumping through all sorts of hoops here to make them show up
// as arrays [ type, ?name, data ] in the console, 
// just because it makes the log so much easier to read. 

function _name (type) {
  if (typeof type === 'symbol') {
    if (type in _names) return _names[type]
    const str = String (type)
    return str.substring (7, str.length-1)
  }
  return type
}

function Token (type, data) {
  return Object.defineProperties ([_name(type), data], 
    { type: { value: type }
    , data: { value: data } })
}

Token.from = function (object) {
  const props = {} 
  for (let [k, value] of Object.entries (object))
    props [k] = { value }
  return Object.defineProperties ([_name (object.type), ...(object.name ? [object.name] : []), object.data], props)
}

function infoString ({ type:c, name:n, data}) {
  const [ type, name ] = [ _name (c), String (n) ]
  return `(${type} ${name})`
}


// Algebraic expression verifier 
// -----------------------------
// An additional component to verify the ordering of the annotated tokens. 

const { PRE, POST, ERR_PRE, ERR_POST } = States // Before value, after value, error in 

function _verify (state, { type:t }) {
  return state === PRE ?
      ( t === Literal ? POST
      : t === Const   ? POST
      : t === Var     ? POST
      : t === Begin   ? PRE
      : t === Prefix  ? PRE
      : t === Space   ? PRE : ERR_PRE ) 
    : state === POST  ?
      ( t === Infixl  ? PRE
      : t === Infix   ? PRE
      : t === Infixr  ? PRE
      : t === Postfix ? POST
      : t === End     ? POST
      : t === Space   ? POST : ERR_POST )
    : state }


// Algebraic expression push parser 
// --------------------------------
// Algebraic expression parser based on the shunting yard algorithm. 
// Implemented as a 'writable transform', i.e. { delegate, write, end } object. 

const {
  PUSH,
  POP,
  CLOSE_GROUP,
  EOF,
  ERR_UNOPENED,
  ERR } = Symbols


class Parser {

  constructor (delegate) {
    this.vstate = PRE // verifier built in
    
    this.stack = [{ type:EOF, data:'' }]
    this.position = 0
    this._delegate = delegate
  }

  delegate (other) {
    this._delegate = other
    return other
  }

  static decide (top, inp) {
    return false ? false

      : top.type === EOF     ? (inp.type === End ? ERR_UNOPENED : PUSH) // (empty stack) // 
      : inp.type === Begin   ? PUSH
      : top.type === Begin   ? (inp.type === End ? CLOSE_GROUP : PUSH)
      : inp.type === End     ? POP  // pop the stack until we get to a matching pair

      : top.type === Literal ? POP
      : top.type === Const   ? POP
      : top.type === Var     ? POP

      : top.type === Postfix ? POP

      : inp.type === Literal ? PUSH
      : inp.type === Const   ? PUSH
      : inp.type === Const   ? PUSH
      : inp.type === Var     ? PUSH

      : inp.type === Prefix  ? PUSH // let anything through until a weaker operator appears
      : top.precedence  <  inp.precedence ? POP
      : top.precedence  >  inp.precedence ? PUSH
      : top.type === Infixl && inp.type === Infixl ? POP
      : top.type === Infixr && inp.type === Infixr ? PUSH
      : ERR // ambiguous inp
  }

  _verify (token) {
    const state = this.vstate = _verify (this.vstate, token)
    if (state === ERR_PRE || state === ERR_POST) {
      const info = infoString (token)
      const data = JSON.stringify (token.data)
      const place = { [ERR_PRE] : 'operand', [ERR_POST] : 'operator' } [state]
      throw new SyntaxError (`Parser: Invalid use of token ${data} ${info} in place of ${place}.`)
    }
  }

  write (token) {
    if (token.type === Space) return
    this._verify (token)
    const stack = this.stack
    do {
      const d = Parser.decide (stack[stack.length - 1], token)
      switch (d) {
        case POP:
          this._delegate.write (stack.pop ())
        break

        case PUSH:
          stack.push (token)
          return

        case CLOSE_GROUP:
          // TODO: specify / decide how to derive the operator from the startgroup/endgroup
          // Or, remove this and handle it in the parser differently
          const start = stack.pop ()
          const end = token
          // Assuming start.name == end.name
          // Discarding modifiers at the moment..
          return this._delegate.write (Token.from({ data:start.data + end.data, type:Group, name:start.name}))
        default:
          const info = infoString (token), data = JSON.stringify (token.data)
          throw new SyntaxError (`Parser: Ambiguous or invalid use of token ${data} ${info}.`)
          // TODO use return values to propagate errors back up through the chain
          //  Hmmm or count the position within each component
      }
    } while (true)
  }

  end () {
    // TODO error if in inclused group
    while (this.stack.length > 1)
      this._delegate.write (this.stack.pop ())
    this._delegate.end ()
  }

}


// Evaluator
// ---------
// Algebraic expression evaluator. 
// By default builds a tree of nodes, nodes being
// tuples [operator, operand_1.. operand_n]
// if alg is supplied, creates nodes via 
// alg (operator, operand_1 ... operand_n)

class Evaluator {

  constructor (evalToken = x => x, algApply = (...fx) => fx) {
    this.stack = []
    this.algApply = algApply
    this.evalToken = evalToken
  }

  write (token) {

    switch (token.type) {
      case Prefix: case Postfix: case Group: // TODO Do I want this here?
        return this.apply (this.evalToken (token, this.algApply), 1)
      case Infixl: case Infixr: case Infix:
        return this.apply (this.evalToken (token, this.algApply), 2)
    }

    switch (token.type) {
      case Literal: case Const: case Var: {
        const tokenValue = this.evalToken (token, this.algApply)
        this.stack.push (tokenValue) // TODO what to push there?
      }
    }
  }

  apply (op, arity) {
    const stack = this.stack
    const args = []
    while (arity-- > 0) args.unshift (stack.pop ())
    stack.push (this.algApply (op, ...args))
  }

  end () {
    if (this.stack.length > 1)
      throw new Error ('Evaluator; premature end of operations')
    this.value = this.stack [0]
    this.stack = []
  }

}

module.exports = { Token, TokenClasses, TokenNames:_names, Modifiers, Parser, Evaluator}