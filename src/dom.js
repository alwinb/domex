const { inspect } = require ('util')
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

  setAttribute (k, v) {
    this.attributes.set (k, v)
    define (this, 'attributes', unhide (this.attributes))
  }

  append (...args) {
    const n = this.childNodes
    define (this, 'childNodes', unhide (!n.length ? args : n.concat (args)))
  }
}

function createTextNode (data) {
  return data
}

function createElement (tagName) {
  return new Element (tagName)
}

module.exports = { Element, createElement, createTextNode }