const { RangeMap, RangeSet } = require ('./rangemap')
const log = console.log.bind (console)


// CharSets
// --------

const cmpJs = (t1, t2) =>
  t1 < t2 ? -1 : t1 > t2 ? 1 : 0

const cp = (str) =>
  str.codePointAt (0)

const above = cp =>
  RangeSet.below (cp + 1)

const CharSet =
  RangeSet (cmpJs, { above })

const _or = CharSet.or.bind (CharSet)

CharSet.or = (...args) =>
  args.reduce (_or)

CharSet.range = (a, b) =>
  CharSet.fromRange (cp(a), cp(b))

CharSet.char = (a) =>
  CharSet.fromElement (cp(a))

// Compare CharSets

CharSet.compare = ({ store:a }, { store:b }) => {
  let r = cmpJs (a.length, b.length)
       || cmpJs (a[0], b[0])
  for (let i = 1; !r && i < a.length; i += 2) {
    r = r || cmpJs (a[i][1], b[i][1]) // compare on delimiter value
          || cmpJs (a[i+1], b[i+1])
  }
  return r
}


// very quick test
// r1 = CharSet.range ('a', 'z')
// r2 = CharSet.range ('A', 'Z')
// r3 = CharSet.range ('0', '9')
// log (CharSet.or (r1,r2,r3))

// log (CharSet.compare (r1, r2))


module.exports = { CharSet }