(() => {
const { signatures, parse } = require ('./signature.js')
const { fold, preEval, bindDefs } = require ('./compile.js')
const { createUnfold } = require ('./eval.js')
const createElement = document.createElement.bind (document)
const createTextNode = document.createTextNode.bind (document)
const unfold = createUnfold ({ createElement, createTextNode })


// Domex
// =====

const lib = { '@default': bindDefs (parse (`
  ( span::number    .number    > %
  | span::string    .string    > %
  | span::boolean   .boolean   > %
  | span::null      .null      > "null"
  | span::function  .function  > "function " + %name
  | span::undefined .undefined > "undefined"
  | ul  ::array     .array     > li* > @default
  | dl  ::object    .object    > di* > dt $ + (dd > @default)
  | dl   .unknown              > di* > dt $ + (dd > @default) )`, preEval)) }


class DomEx {

  constructor (string) {
    this.ast = bindDefs (parse (string, preEval))
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


// Template literal

const domex = (...args) =>
  new DomEx (String.raw (...args))


// Exports
// =======

const exports = { DomEx, Domex:DomEx, domex }
let wmodule = window.modules = window.modules || {}
wmodule.domex = exports 
})()