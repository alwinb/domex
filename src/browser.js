(() => {
const { signatures, parse, nodeTypes:T } = require ('./signature.js')
const { fold, preEval, bindDefs } = require ('./compile.js')
const { createUnfold, refKey } = require ('./eval.js')
const createElement = document.createElement.bind (document)
const createTextNode = document.createTextNode.bind (document)
const unfold = createUnfold ({ createElement, createTextNode })

const call = (fn, ...args) => 
  typeof fn === 'function' && fn (...args)

// Domex
// =====

const lib = {
  
  '@default': bindDefs (parse (`
    ( span::number    > %
    | span::bigint    > %
    | span::string    > %
    | span::boolean   > %
    | span::null      > "null"
    | span::function  > "function " + %name
    | span::undefined > "undefined"
    | span::symbol    > %
    | ul::array       > li* > @default
    | dl::object      > di* > dt $ + (dd > @default)
    | dl.unknown      > di* > dt $ + (dd > @default) )`, preEval)),

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

  // Produces the full NodeList expressed with expr,
  // including their descendent recursively unfolded.

  // FIXME hooks are hacked in, may be buggy and only work with single-element domexes.
  // TODO stratify calls -- prevent redrawing from within didRender / didMount.

  render (data, key = null) {
    const context = { data, key, lib }
    const frag = document.createDocumentFragment ()
    let { elem, deriv, expr, value, data:d } = render1 (this.ast, context)
    while (elem) {
      if (expr) call (expr.didRender, elem, value, d)
      frag.append (elem)
      // if (expr) call (expr.didMount, value, d);
      ;({ elem, deriv, expr, value, data:d } = render1 (deriv, context))
    }
    const r = { elem:frag.childNodes[0], elems:frag }
    return r
  }
}

// Produces the first item of the NodeList expressed by expr,
// including its descendents, recursively unfolded. 

function render1 (expr, context) {
  const [elem, subs, sibs] = unfold (expr, context)
  if (elem && elem instanceof Element && subs) {
    let { elem:sub, deriv } = render1 (subs, context)
    while (sub) {
      const h = sub && sub [refKey]
      if (h && h.expr) call (h.expr.didRender, sub, h.value, h.data)
      elem.append (sub)
      if (h && h.expr) call (h.expr.didMount, sub, h.value, h.data);
      ({ elem:sub, deriv } = render1 (deriv, context))
    }
  }
  const h = elem && elem [refKey]
  return { elem, deriv:sibs, expr:h?.expr, value:h?.value, data:h?.data }
}

DomEx.refKey = refKey

// Template literal

const domex = (...args) =>
  new DomEx (String.raw (...args))


// Exports
// =======

const exports = {
  version:'0.8.0-dev',
  DomEx, domex,
  Domex: DomEx
}

let wmodule = window.modules = window.modules || {}
wmodule.domex = exports 
})()