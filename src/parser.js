const log = console.log.bind (console)
const { Lexer, Parser, Evaluator, TokenClasses, Verifier, annotateWith } = require ('ab-parse')
const T = TokenClasses

// Parser for regular expressions
// ==============================

// ## Lexer

const
    R_STEP = '[a-zA-Z0-9]' //'[a-zA-Z_][a-zA-Z_0-9]*'
  , R_SPACE = '[ \t\f]+'
  , R_NEWLINE = '\n'
  , R_PREFIX = '[!*]'
  , R_INFIX = '[&|]|(?:.{0}(?!$))'
  , R_POSTFIX = '[*]'

const grammar = {
  main:
    [ [ R_STEP,     'STEP',  'post' ]
    , [ R_SPACE,    'space',        ]
    , [ R_NEWLINE,  'space',        ]
    , [ R_PREFIX,   'op',           ]
    , [ '[([]',     'start'         ] ],

  post:
    [ [ R_SPACE,    'space'         ]
    , [ R_NEWLINE,  'space'         ]
    , [ '[)\\]]',   'end',          ]
    , [ R_POSTFIX,  'op',           ]
    , [ R_INFIX,    'op',    'main' ] ] }

const tokenize = new Lexer (grammar, 'main') .tokenize


// ## Token annotation

// NB. currently there are _two_ concatenation operators
// juxtaposition; binds stronger than negation, so `!ab` == `!(ab)`
// but justapostion with space does not, thus `!a b` == `(!a) b`
// I may change that as I start working on a better syntax. 

const optable =
  { '*': [  'STAR', T.POSTFIX, 0 ]
  ,  '': [  'CONC', T.INFIXL,  1 ]
  , '!': [   'NOT', T.PREFIX,  2 ]
  , ' ': [  'CONC', T.INFIXL,  3 ]
  , '&': [   'AND', T.INFIXL,  4 ]
  , '|': [    'OR', T.INFIXL,  5 ]
  }

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

function parse (input, alg = x => x) {
  const rpn = new Evaluator (alg)
  const parser = new Parser (rpn)
  const verifier = new Verifier (parser)
  const _annotate = annotateWith (annotate)

  let space = false
  for (let x of tokenize (input)) {
    // hack, to have a non-space and a space concatenation operator
    if (space && x[1] === '' && x[0] === 'op') x = ['op', ' ']
    else if (x[0] === 'space') space = true
    else space = false
    // TODO; pass the context in another way, maybe via a return value?
    const atoken = _annotate (x, verifier.context)
    verifier.write (atoken)
  }
  verifier.end ()
  const r = rpn.value
  rpn.value = null
  return r
}


//
//  Test
//

/*
var sample = 'abcd(a)|ac*left'
var sample = 'a b|a*** c&ef'
var sample = '(a|)(bc)'
var sample = '(a)|[bc]'

log (sample)
log (...tokenize (sample))
log (JSON.stringify(parse (sample), null, 2))
//*/

module.exports = { parse, tokenize }