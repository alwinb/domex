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

// Quick, hacking it, dual access to class attribute
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

function createTextNode (data) {
  return data
}

function createElement (tagName) {
  return new Element (tagName)
}

module.exports = { Element, createElement, createTextNode }