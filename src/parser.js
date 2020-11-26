const log = console.log.bind (console)
const Lexer = require ('../lib/tiny-lexer')
const { Token, TokenClasses, Modifiers, Parser, Evaluator } = require ('../lib/parse2')
const T = TokenClasses, M = Modifiers
const { Operators } = require ('./signature')

// Parser for regular expressions
// ==============================

// ## Token constructors

const optable =
  { '*' : [ 'star',   T.Postfix, 0 ]
  , '?' : [ 'opt',    T.Postfix, 0 ]
  , '+' : [ 'plus',   T.Postfix, 0 ]
  ,  '' : [ 'conc',   T.Infixl,  1 ]
  , '!' : [ 'not',    T.Prefix,  2 ]
  , '&' : [ 'and',    T.Infixl,  4 ]
  , '|' : [ 'or',     T.Infixl,  5 ]
  , '(' : [ 'group',  T.Begin,     ]
  , ')' : [ 'group',  T.End,       ]
  , 'ε' : [ 'empty',  T.Const,     ]
  , '⊤' : [ 'top',    T.Const,     ]
  , '⊥' : [ 'bottom', T.Const,     ]
  , '.' : [ 'any',    T.Const,     ]
}

function operator (data) {
  let [ name, type, precedence ] = optable [data]
  return Token.from ({ type, name, precedence, data })
}

function consts (data) {
  let [ name, type ] = optable [data]
  return Token.from ({ type, name, data })
}

const step  = data => Token.from ({ data, type:T.Literal, name:'step'  })
const range = data => Token.from ({ data, type:T.Literal, name:'range' })

const repeatRange = data => 
  Token.from ({ type:T.Postfix, name:'repeat', precedence:0, data })



// ## Lexer
const raw = String.raw
const
    R_STEP    = '[a-zA-Z0-9]' //'[a-zA-Z_][a-zA-Z_0-9]*'
  , R_SPACE   = '[ \t\f]+'
  , R_PREFIX  = '[!]'
  , R_INFIX   = '[&|]|(?:.{0}(?!$))'
  , R_POSTFIX = '[*?+]'
  , R_RANGE   = raw `\[[^\]]-[^\]]]`
  , R_REPEAT  = raw `<\d+-(?:\d+|\*)>`

const grammar = {
  main:
    [ [ R_STEP,     step,        'post' ]
    , [ '[.⊤⊥ε]',   consts,      'post' ]
    , [ R_SPACE,    Token.Space,        ]
    , [ '\n'     ,  Token.Space,        ]
    , [ R_PREFIX,   operator,           ]
    , [ '[(]',      operator            ]
    , [ R_RANGE,    range,       'post' ] ], // quick test
  post:
    [ [ R_SPACE,    Token.Space         ]
    , [ '\n',       Token.Space         ]
    , [ '[)]',      operator,           ]
    , [ R_POSTFIX,  operator,           ]
    , [ R_REPEAT,   repeatRange,        ]
    , [ R_INFIX,    operator,    'main' ] ] }


const tokenize = new Lexer (grammar, 'main') .tokenize

// ## Parser
// [Evaluator( (Parser( (parse) )tokenize]


// OK this 'evaluate constant // evaluate literal
// is a mess ..

function parseRepeat ({ data }) {
  let [l, m] = data.substr (1, data.length-2).split('-')
  m = m === '*' ? Infinity : +m
  l = Math.max (+l, 0), enumerable = true
  return ['repeat', l, m]
}

function evalLiteral (token, algApply) {
  let data = token.data
  return token.name === 'range' ? algApply ('range', data[1], data[3])
    : token.name === 'step' ? algApply ('step', token.data)
    : undefined
}

function evalToken (token, algApply) {
  const r
    = token.type === T.Literal ? evalLiteral (token, algApply)
    : token.type === T.Const   ? algApply (token.name)
    : token.name === 'repeat'  ? parseRepeat (token) // ok this is different, a higher-order op.
    : token.name === 'plus'    ? ['repeat', 1, Infinity]
    : token.name === 'star'    ? ['repeat', 0, Infinity]
    : token.name === 'opt'     ? ['repeat', 0, 1]
    : token.name // Operators now... evalute to their name only; which s picked up by the apply function 
  return r
}


function parse (input, alg = { apply: (...fx) => fx }) {

  apply_ = (...fx) => {
    //log ('apply_ wrapper', fx)
    if (Array.isArray(fx[0]) && fx[0][0] === 'repeat')
    fx = ['repeat', fx[1], fx[0][1], fx[0][2]]
    return alg.apply (...fx)
  }
  
  let evaluator
  const pipe = new Parser ()
  pipe. delegate (evaluator = new Evaluator (evalToken, apply_))
  for (let token of tokenize (input))
    pipe.write (token)
  pipe.end ()
  return evaluator.value
}



module.exports = { parse, tokenize }