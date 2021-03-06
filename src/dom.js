import { inspect } from 'util'
import { createUnfold } from './eval.js'
import { nodeTypes as T, typeNames as N } from './signature.js'

const log = console.log.bind (console)
const hide = value => ({ writable:1, configurable:1, value })
const unhide = value => ({ writable:1, configurable:1, enumerable:1, value })
const define = (obj, arg2, arg3) => typeof arg2 === 'string'
  ? Object.defineProperty (obj, arg2, arg3)
  : Object.defineProperties (obj, arg2)


// Dom Compat (sub API)
// --------------------

class Element {

  constructor (tagName) {
    this.tagName = String (tagName) .toLowerCase ()
    const attributes = new Map ()
    define (this, {
      classList:  hide (new ClassList (attributes)),
      attributes: hide (attributes),
      childNodes: hide ([]) })
  }
  
  get lastChild () {
    const n = this.childNodes
    return n[n.length-1]
  }

  setAttribute (k, v) {
    k = String (k) .toLowerCase ()
    this.attributes.set (k, v)
    if (k === 'class') {
      define (this, 'classList', hide (new ClassList (this.attributes)))
      this.classList.splice (0, Infinity, v)
    }
  }

  append (...args) {
    const n = this.childNodes
    define (this, 'childNodes', unhide (!n.length ? args : n.concat (args)))
  }
}

// Quick hack to keep "class" and classList in sync:

class ClassList extends Array {
  constructor (owner) {
    super ()
    this.attributes = owner
  }

  add (item) {
    this.push (item)
    this.attributes.set ('class', this.join (' '))
  }
}

// Instantiate the evaluator
// -------------------------

function UnsafeRaw (data) {
  this.value = data
}

const createTextNode = data =>
  data

const _createRawHTMLNode = data =>
  new UnsafeRaw (data)

const createElement = tagName =>
  new Element (tagName)


const unfold =
  createUnfold ({ createElement, createTextNode, _createRawHTMLNode })


// ### Render to html / stream

const voidTags = {
  area:1,    base:1,  basefont:1,
  bgsound:1, br:1,    col:1,
  embed:1,   frame:1, hr:1,
  img:1,     input:1, keygen:1,
  link:1,    meta:1,  param:1, 
  source:1,  track:1
}

function* _render (expr, context) {
  const [elem, subs, sibs] = unfold (expr, context)
  if (elem === null) return
  
  if (typeof elem === 'string')
    yield elem.replace (/</g, '&lt;') // FIXME not in rawtext // FIXME escape control chars?
  
  else if (elem instanceof UnsafeRaw)
    yield elem.value

  else {
    yield `<${elem.tagName}${renderAttributes (elem)}>`
    if (!(elem.tagName in voidTags)) {
      if (subs) yield* _render (subs, context)
      yield `</${elem.tagName}>`
    }
  }
  if (sibs) yield* _render (sibs, context)
}

function renderAttributes (el) { const chunks = [ ]
  for (let [k,v] of el.attributes) {
    chunks.push (' ', k)
    if (v !== '') chunks.push ('=', '"', v.replace (/"/g, '&quot;'), '"') }
  return chunks.join ('')
}


// Exports
// -------

export { Element, createElement, createTextNode, _render }