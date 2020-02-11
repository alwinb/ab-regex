const AATree = require ('../src/aatree.js')

//* TEST

AATree.prototype.lookup = AATree.prototype.select

AATree.prototype.forEach = function (fn, thisArg) {
  const pairs = this.stream ()
  let pair = pairs.next ()
  while (pair !== null) {
    fn.call (thisArg, pair.value, pair.key, this)
    pair = pairs.next ()
  }
}

AATree.prototype.stream = function () {
	let n = this.store
  const path = []
	return { next }
	function next () {
		while (n.level !== 0) {
			path.push (n)
			n = n.l }
		if (path.length) {
			const n_ = path.pop()
			n = n_.r
			return { key:n_.key, value:n_.value } }
		return null
  }
}

const log = console.log.bind (console)

var empty = new AATree ()
var tree1 = empty.insert (1, 'Hello', 2, 'World', 3, '!!')

function logp (value, key) {
  log (key+':', value)
}

tree1.forEach (logp)

// 1: Hello
// 2: World
// 3: !!

var cursor = tree1.select (3)
log (cursor.found)

// true

var tree2 = cursor.set ('!')
tree2.forEach (logp)

// 1: Hello
// 2: World
// 3: !

var cursor = tree2.select (5)
log (cursor.found)

// false

var tree4 = cursor.set ('Welcome!')
tree4.forEach (logp)

// 1: Hello
// 2: World
// 3: !
// 5: Welcome!

///*/