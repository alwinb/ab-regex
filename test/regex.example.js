const { Operators, Algebra } = require ('../src/signature')
const { Shared, Normalised, _print } = require ('../src/normalize')
const { Compiler, OneLevel } = require ('../src/dfa')
const log = console.log.bind (console)

const store = new Compiler ()
const { top, bottom, empty, char, any, range, group, repeat, star, opt, plus, not, and, or, conc, ors, concs }
  = Algebra.fromFunction (store.apply)

const oneOf = chars =>
  [...chars].reduce ((rx, c) => or (rx, char(c)), bottom)

const string = str => 
  [...str] .reduce ((rx, c) => conc (rx, char(c)), empty)

const lowerAlpha = range ('a', 'z')
const upperAlpha = range ('A', 'Z')
const digit = range ('0', '9')
const alpha = or (lowerAlpha, upperAlpha)
const alphaNum = ors (lowerAlpha, upperAlpha, digit)

const identStart = or (char ('_'), alpha)
const identCtd = or (identStart, digit)
const ident = conc (identStart, star (identCtd))
const intSuffix = ors (oneOf ('uUlL'), string ('ll'), string ('LL'))
const floatSuffix = oneOf ('flFL')

const cChar = and (any, not (oneOf ("'\n")))
const sChars = star (and (any, not (oneOf ('"\n'))))

// So this all works
// Now... let's add some gc to the store
// How to do that?

log (
  store.run(cChar.id, '\'')
)

