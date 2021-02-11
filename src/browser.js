(() => {
const { signatures, parse } = require ('./signature.js')
const { fold, preEval, bindDefs } = require ('./compile.js')
const { createUnfold } = require ('./eval.js')
const createElement = document.createElement.bind (document)
const createTextNode = document.createTextNode.bind (document)
const unfold = createUnfold ({ createElement, createTextNode })


// Domex
// =====

class DomEx {

  constructor (string) {
    this.ast = bindDefs (parse (string, preEval))
  }

  render (data) {
    const context = { data }
    const frag = document.createDocumentFragment ()
    let { elem, deriv } = render1 (this.ast, context)
    while (elem) {
      frag.append (elem);
      ({ elem, deriv } = render1 (deriv, context))
    }
    return { elem, elems:frag }
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


// Template literal

const domex = (...args) =>
  new DomEx (String.raw (...args))


// Exports
// =======

const exports = { DomEx, Domex:DomEx, domex }
let wmodule = window.modules = window.modules || {}
wmodule.domex = exports 
})()