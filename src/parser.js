const log = console.log.bind (console)
const { Token, TokenClasses, Modifiers, Lexer, Verifier, Parser, Evaluator } = require ('ab-parse')
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

// ## Lexer

const
    R_STEP = '[a-zA-Z0-9]' //'[a-zA-Z_][a-zA-Z_0-9]*'
  , R_SPACE = '[ \t\f]+'
  , R_PREFIX = '[!]'
  , R_INFIX = '[&|]|(?:.{0}(?!$))'
  , R_POSTFIX = '[*?+]'
  , R_RANGE = '\\[[^\\]]-[^\\]]]'

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
    , [ R_INFIX,    operator,    'main' ] ] }


const tokenize = new Lexer (grammar, 'main') .tokenize

// ## Parser
// [Evaluator( (Parser( (parse) )tokenize]


// OK this 'evaluate constant // evaluate literal
// is a mess ..

function evalLiteral (token, algApply) {
  let data = token.data
  return token.name === 'range' ? algApply ('range', data[1], data[3])
    : token.name === 'step' ? algApply ('step', token.data)
    : undefined
}

function evalToken (token, algApply) {
  const r = token.type === T.Literal ? evalLiteral (token, algApply)
    : token.type === T.Const ? algApply (token.name)
    : token.name // Operators now... evalute to their name only; which s picked up by the apply function 
  return r
}


function parse (input, { apply = (...fx) => fx } = { }) {
  let evaluator
  const pipe = new Parser ()
  pipe. delegate (evaluator = new Evaluator (evalToken, apply))
  for (let token of tokenize (input)) pipe.write (token)
  pipe.end ()
  return evaluator.value
}

module.exports = { parse, tokenize }