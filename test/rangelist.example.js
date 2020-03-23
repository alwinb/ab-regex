const log = console.log.bind (console)
const { RangeSet } = require ('../src/rangelist')


const cmpJs = (t1, t2) =>
  t1 < t2 ? -1 : t1 > t2 ? 1 : 0

const CharSet = new RangeSet (cmpJs)
const { fromRange, fromElement, or } = CharSet

// Test / Use case example
// Let's try and use this with ASCII
// (Implement the character ranges for a cookie parser)

var ASCII = CharSet .fromRange (0, 127)   ._log ()
var CTRL  = CharSet .fromRange (0, 31 )   ._log ()
var NUL   = CharSet .fromElement (0)      ._log ()
var SP    = CharSet .fromElement (32)     ._log ()
var HTAB  = CharSet .fromElement (0x09)   ._log ()
var CR    = CharSet .fromElement (0x0D)   ._log ()
var LF    = CharSet .fromElement (0x0A)   ._log ()
var DEL   = CharSet .fromElement (127)    ._log ()
var CTL   = CharSet .or (CTRL, DEL)       ._log ()
var CHAR  = CharSet .fromRange (1, 127)   ._log ()
var WSP   = CharSet .or (SP, HTAB)        ._log ()

/*
var _str = '()<>@,;:\"/[]?={}'
var _seps = r
Array.prototype.map.call(_str, function(c) {
  _seps = _seps.or(r.Exactly(c.charCodeAt(c)))
})
var separators = CharSet.or (SP, HTAB) // .or(_seps) // TODO nary or
var tokenchar = CHAR.and(CTL.or(separators).negate())
//var DQUOTE = CharSet.fromElement ('"'.charCodeAt (0))
//*/

var coctet = [
    CharSet.fromElement (0x21),
    CharSet.fromRange (0x23, 0x2B),
    CharSet.fromRange (0x2D, 0x3A),
    CharSet.fromRange (0x3C, 0x5B),
    CharSet.fromRange (0x5D, 0x7E)
  ] .reduce ((x,y) => CharSet.or (x,y))._log()

//log ((128).toString (2))