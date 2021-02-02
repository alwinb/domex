const { inspect } = require ('util')
const log = console.log.bind (console)
const hide = value => ({ writable:1, configurable:1, value })
const unhide = value => ({ writable:1, configurable:1, enumerable:1, value })
const define = (obj, arg2, arg3) => typeof arg2 === 'string'
  ? Object.defineProperty (obj, arg2, arg3)
  : Object.defineProperties (obj, arg2)

// Dom Compat (sub API)
// --------------------

// TODO add plaintext/rawtext/  tags ea
const voidTags = {
  area:1,    base:1,  basefont:1,
  bgsound:1, br:1,    col:1,
  embed:1,   frame:1, hr:1,
  img:1,     input:1, keygen:1,
  link:1,    meta:1,  param:1, 
  source:1,  track:1
}


class El {

  static *render (el) {
    yield `<${ el.tagName }${ El.renderAttributes (el) }>`
    if (el.tagName in voidTags) return
    for (let n of el.childNodes)
      if (typeof n === 'string') yield n
      else yield* El.render (n)
    yield `</${ el.tagName }>`
  }

  static renderAttributes (el) {
    const r = [ ]
    for (let [k,v] of el.attributes) {
      r.push (' ', k)
      if (v !== '') r.push ('=', '"', v.replace (/"/g, '&quot;'), '"')
    }
    return r.join ('')
  }

  constructor (tagName) {
    this.tagName = String (tagName) .toLowerCase ()
    const cl = []
    define (this, {
      classList:  hide (cl),
      attributes: hide (new Map),
      childNodes: hide ([]) })
    // TODO also update the attributes then
    define (cl, 'add', hide (str => void (cl.push (str), define (this, 'classList', unhide (cl)))))
  }

  get lastChild () {
    const n = this.childNodes
    return n[n.length-1]
  }

  get outerHTML () {
    return Array.from (El.render (this)) .join ('')
  }

  setAttribute (k, v) {
    this.attributes.set (k, v)
    define (this, 'attributes', unhide (this.attributes))
  }

  append (...args) {
    const n = this.childNodes
    define (this, 'childNodes', unhide (!n.length ? args : n.concat (args)))
  }

  [inspect.custom]() {
    const { tagName, attributes, childNodes } = this
    const r = { tagName }
    if (attributes.size) r.attributes = attributes
    if (childNodes.length) r.childNodes = childNodes
    return r
  }

}

function createTextNode (data) {
  return data
}

function createElement (tagName) {
  return new El (tagName)
}

module.exports = { El, createElement, createTextNode }