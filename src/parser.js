const log = console.log.bind (console)
const { Lexer, Parser, Evaluator, TokenClasses, Verifier, annotateWith } = require ('ab-parse')
const T = TokenClasses

// Parser for regular expressions
// ==============================

// ## Lexer

const
    R_STEP = '[a-zA-Z0-9]' //'[a-zA-Z_][a-zA-Z_0-9]*'
  , R_ANY = '[.]'
  , R_SPACE = '[ \t\f]+'
  , R_NEWLINE = '\n'
  , R_PREFIX = '[!]'
  , R_INFIX = '[&|]|(?:.{0}(?!$))'
  , R_POSTFIX = '[*?+]'
  , R_RANGE = '\\[[^\\]]-[^\\]]]'

const grammar = {
  main:
    [ [ R_STEP,     'STEP',  'post' ]
    , [ R_ANY,      'ANY',   'post' ]
    , [ R_SPACE,    'space',        ]
    , [ R_NEWLINE,  'space',        ]
    , [ R_PREFIX,   'op',           ]
    , [ '[(]',      'start'         ]
    , [ R_RANGE,    'RANGE', 'post' ] ], // quick test

  post:
    [ [ R_SPACE,    'space'         ]
    , [ R_NEWLINE,  'space'         ]
    , [ '[)\\]]',   'end',          ]
    , [ R_POSTFIX,  'op',           ]
    , [ R_INFIX,    'op',    'main' ] ] }

const tokenize = new Lexer (grammar, 'main') .tokenize


// ## Token annotation

const optable =
  { '*': [  'STAR', T.POSTFIX, 0 ]
  , '?': [   'OPT', T.POSTFIX, 0 ]
  , '+': [  'PLUS', T.POSTFIX, 0 ]
  ,  '': [  'CONC', T.INFIXL,  1 ]
  , '!': [   'NOT', T.PREFIX,  2 ]
  , '&': [   'AND', T.INFIXL,  4 ]
  , '|': [    'OR', T.INFIXL,  5 ] }


function annotate (token, _context) {
  //log ('annotate', token, _context)
  const [type, value] = token
  const info = type === 'op' ? optable [value]
    : type === 'space' ? [type, T.SPACE]
    : type === 'start' ? [value === '[' ? 'CLASS' : 'GROUP', T.BEGIN]
    : type === 'end'   ? [value === ']' ? 'CLASS' : 'GROUP', T.END]
    : [type, T.LEAF]
  return info
}


// ## Parser
// [Evaluator( (Parser( (parse) )_annotate) )tokenize]

function parse (input, alg = x => x) {
  const rpn = new Evaluator (alg)
  const parser = new Parser (rpn)
  const verifier = new Verifier (parser)
  const _annotate = annotateWith (annotate)

  for (let x of tokenize (input)) {
    if (x[0] === 'RANGE') {
      x[2] = x[1][3]
      x[1] = x[1][1]
    }
    // TODO; pass the context in another way, maybe via a return value?
    const atoken = _annotate (x, verifier.context)
    verifier.write (atoken)
  }

  verifier.end ()
  const r = rpn.value
  rpn.value = null
  return r
}


module.exports = { parse, tokenize }