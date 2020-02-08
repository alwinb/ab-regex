
// Persistent Ordered Dictionaty
// AATree implementation

const defaultCompare = (a, b) =>
  a < b ? -1 : a > b ? 1 : 0

const [LEFT, RIGHT] = [-1, 1]
const EMPTY = Node (null, null, 0, null, null)

class AATree {

  constructor (compare = defaultCompare, store = EMPTY) {
  	if (typeof compare !== 'function')
      throw new Error ('First argument to AATree must be a comparison function.')
    this.compare = compare
    this.store = store
  }
  
  lookup (key) { 
    return this.select (key)
  }

  select (key) {
    const { compare } = this
    let node = this.store, path = null
    while (node.level) {
      const branch = compare (key, node.key)
      path = { branch, node, parent:path }
      if (branch === 0) return new Cursor (this, path, node.key)
      else node = branch < 0 ? node.l : node.r }
    return new Cursor (this, path, key)
  }

  insert (...pairs) {
  	let r = this
    const l = pairs.length
    for (let i = 0; i < l; i += 2)
  		r = r.lookup (pairs [i]) .set (pairs [i + 1])
  	return r
  }
}


function Cursor ({ compare }, path, key) {
  const found = path != null && path.branch === 0
  this.found = found
  this.key = found ? path.node.key : key
  this.value = found ? path.node.value : undefined
  this.set = value => new AATree (compare, set (path, key, value))
}


function Node (key, value, level, left, right) {
  return { l:left, level, key, value, r:right } }

function skew (n) { // immutable
  const { l, level } = n
  return (level && level === l.level) ?
    Node (l.key, l.value, l.level, l.l, Node (n.key, n.value, level, l.r, n.r)) :
    n }

function split (n) { // immutable
  const { level, r } = n
  return (n.level && n.level === r.r.level) ?
    Node (r.key, r.value, r.level+1, Node (n.key, n.value, n.level, n.l, r.l), r.r) : 
    n }

// `set (p, key, value)` reconstructs an (internal) AA tree from a path `p`,
// but with the value of the head node of the path set to 'value'. 

function set (p, key, value) {
  let n, r
  if (p !== null && p.branch === 0) { // found
    n = p.node
    r = Node (key, value, n.level, n.l, n.r)
    p = p.parent }
  else
    r = Node (key, value, 1, EMPTY, EMPTY)
  while (p !== null) {
    n = p.node
    r = (p.branch === RIGHT)
      ? Node (n.key, n.value, n.level, n.l, r)
      : Node (n.key, n.value, n.level, r, n.r)
    r = split (skew (r))
    p = p.parent }
  return r }


module.exports = AATree