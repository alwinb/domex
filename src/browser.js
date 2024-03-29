import { parse, nodeTypes as T } from './signature.js'
import { preEval, bindDefs } from './compile.js'
import { createUnfold, refKey } from './unfold.js'

const createElement = document.createElement.bind (document)
const createTextNode = document.createTextNode.bind (document)
const unfold = createUnfold ({ createElement, createTextNode })

const call = (obj, fn, ...args) => 
  typeof fn === 'function' && fn.call (obj, ...args)


// Domex - Browser Version
// =======================

const version = '0.9.4'

const lib = {
  
  default: bindDefs (parse (`
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

  'unsafe-raw-html':
    [[T.unsafeRaw, '@unsafe-raw-html']],
}

// const refKey = Symbol ('Domex.ref')

class Domex {

  constructor (string) {
    this.ast = bindDefs (parse (string, preEval))
    this.exports = Object.create (null)
    if (this.ast[0][0] === T.withlib) {
      const lib = this.ast[0][1]
      for (const k in lib) this.exports[k] = lib[k] = 
        Object.setPrototypeOf ({ ast:[[T.withlib, lib], lib[k]] }, Domex.prototype)
    }
  }

  withLib (lib) {
    const r = { ast:[[T.withlib, lib], this.ast], exports:this.exports }
    return Object.setPrototypeOf (r, Domex.prototype)
  }

  emitEvent (type, detail) {
    // log ('emitEvent', this, type, detail)
    let elem = this.elem?.parentNode
    // log (elem)
    if (elem) {
      const evt_ = new CustomEvent (type, { detail, bubbles:true })
      return elem.dispatchEvent (evt_)
    }
  }

  // Produces the full NodeList expressed with expr,
  // including their descendent recursively unfolded.

  // FIXME hooks are hacked in, may be buggy and only work with single-element domexes.
  // TODO stratify calls -- prevent redrawing from within didRender / didMount.
  // TODO no, kill that nonsense

  render (data, key = null) {
    const context = { data, key, lib }
    const frag = document.createDocumentFragment ()
    let { elem, deriv } = render1 (this.ast, context)
    const ref = elem && elem [refKey]
    while (elem) {
      if (ref instanceof Domex) {
        call (ref, ref.didRender, ref.value, ref.data)
        frag.append (elem)
        call (ref, ref.didMount, ref.value, ref.data)
      }
      else frag.append (elem);
      ({ elem, deriv } = render1 (deriv, context))
    }
    return { elem:frag.childNodes[0], elems:frag }
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
      if (h instanceof Domex) {
        call (h, h.didRender, h.value, h.data)
        elem.append (sub)
        call (h, h.didMount, h.value, h.data)
      }
      else elem.append (sub);
      ({ elem:sub, deriv } = render1 (deriv, context))
    }
  }
  return { elem, deriv:sibs }
}

Domex.refKey = refKey

// Template literal

const domex = (...args) =>
  new Domex (String.raw (...args))



// Exports
// =======

Domex.version = version
Object.assign (globalThis, { Domex, domex })
export { version, Domex, domex }