(() => {
const { signatures, parse, nodeTypes:T } = require ('./signature.js')
const { fold, preEval, bindDefs } = require ('./compile.js')
const { createUnfold, refKey } = require ('./eval.js')
const createElement = document.createElement.bind (document)
const createTextNode = document.createTextNode.bind (document)
const unfold = createUnfold ({ createElement, createTextNode })


// Domex
// =====

const lib = {
  
  '@default': bindDefs (parse (`
    ( span::number    > %
    | span::string    > %
    | span::boolean   > %
    | span::null      > "null"
    | span::function  > "function " + %name
    | span::undefined > "undefined"
    | span::symbol    > %
    | ul  ::array     > li* > @default
    | dl  ::object    > di* > dt $ + (dd > @default)
    | dl   .unknown   > di* > dt $ + (dd > @default) )`, preEval)),

  '@unsafe-raw-html':
    [[T.unsafeRaw, '@unsafe-raw-html']],
}

// const refKey = Symbol ('Domex.ref')

class DomEx {

  constructor (string) {
    this.ast = bindDefs (parse (string, preEval))
    this.exports = this.ast[0][0] === T.withlib ? this.ast[0][1] : Object.create (null)
  }

  withLib (lib) {
    const r = { ast:[[T.withlib, lib], this.ast], exports:this.exports }
    return Object.setPrototypeOf (r, DomEx.prototype)
  }

  render (data) {
    const context = { data, lib }
    const frag = document.createDocumentFragment ()
    let { elem, deriv } = render1 (this.ast, context)
    while (elem) {
      frag.append (elem);
      ({ elem, deriv } = render1 (deriv, context))
    }
    return { elem:frag.childNodes[0], elems:frag }
  }
}

function render1 (expr, context) {
  const [elem, subs, sibs] = unfold (expr, context)
  if (elem && elem instanceof Element && subs) {
    let { elem:sub, deriv } = render1 (subs, context)
    while (sub) {
      elem.append (sub);
      ({ elem:sub, deriv } = render1 (deriv, context))
    }
  }
  return { elem, deriv:sibs }
}

DomEx.refKey = refKey

// Template literal

const domex = (...args) =>
  new DomEx (String.raw (...args))


// Exports
// =======

const exports = {
  version:'0.7.1-develop',
  DomEx, domex,
  Domex: DomEx
}

let wmodule = window.modules = window.modules || {}
wmodule.domex = exports 
})()