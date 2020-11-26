const log = console.log.bind (console)
const { RangeSet } = require ('../src/rangelist')


const cmpJs = (t1, t2) =>
  t1 < t2 ? -1 : t1 > t2 ? 1 : 0

const CharSet = new RangeSet (cmpJs, { above: _ => RangeSet.below (_ + 1) })
const { fromRange, fromElement, or } = CharSet

// Test / Use case example
// Let's try and use this with ASCII
// (Implement the character ranges for a cookie parser)

var ASCII = CharSet .fromRange (0, 127)
var CTRL  = CharSet .fromRange (0, 31 )
var DEL   = CharSet .fromElement (127)
var NUL   = CharSet .fromElement (0)
var CHAR  = CharSet .fromRange (1, 127)
var SP    = CharSet .fromElement (32)
var HTAB  = CharSet .fromElement (0x09)
var CR    = CharSet .fromElement (0x0D)
var LF    = CharSet .fromElement (0x0A)
var CTL   = CharSet .or (CTRL, DEL)
var WSP   = CharSet .or (SP, HTAB)

var DQUOTE = CharSet .fromElement ('"'.charCodeAt (0))

/*
var tokenchar = Charset.and(CHAR, CharSet.or(CTL, separators).negate())
//*/

var _seps = '()<>@,;:\"/[]?={}'
  .split ('')
  .map (x => CharSet.fromElement (x.charCodeAt (0)))
  .reduce ((x,y) => CharSet.or (x,y))

var separators = [SP, HTAB, _seps] .reduce ((x, y) => CharSet.or (x,y))
//log (separators.toArray(([d,x]) => '|' + JSON.stringify(String.fromCharCode(x))).join(' '))
// TODO... now to create a bintree from this How?
// So the delimiters are nodes; left/right are... nodes, leaves are true/false
log (separators.toArray())


var coctet = [
    CharSet.fromElement (0x21),
    CharSet.fromRange (0x23, 0x2B),
    CharSet.fromRange (0x2D, 0x3A),
    CharSet.fromRange (0x3C, 0x5B),
    CharSet.fromRange (0x5D, 0x7E)
  ] .reduce ((x,y) => CharSet.or (x,y))


// STD lib

var DIGIT = CharSet.fromRange ('0'.charCodeAt (0), '9'.charCodeAt (0))
var LOWER_ALPHA = CharSet.fromRange ('a'.charCodeAt (0), 'z'.charCodeAt (0))
var UPPER_ALPHA = CharSet.fromRange ('A'.charCodeAt (0), 'Z'.charCodeAt (0))
var ALPHA = CharSet.or (LOWER_ALPHA, UPPER_ALPHA)

const sets = {
  ASCII, CTRL, DEL, NUL, CHAR, SP, HTAB, CR, LF, CTL, WSP,
  DIGIT, UPPER_ALPHA, LOWER_ALPHA, ALPHA,
  coctet, separators, nonSeparators:separators.negate()
}

for (let x in sets) {
  log (x)
  sets[x]._log ()
  log ()
}

log (separators.constructor)