import { nodeTypes as T, typeNames as N, parse } from './signature.js'
const refKey = Symbol ('Domex.ref')
const log = console.log.bind (console)

// unfold: takes an expression and its input data
// and returns a one-element unfolding [elem, subs-expr, siblings-expr]

const VOID = [[T.void, 'ε']]

const createUnfold = ({ createElement, createTextNode, _createRawHTMLNode }) =>
function unfold (expr, context = {})  {
  let { data, key, lib = {}, marks = {}, depth = 0 } = context
  const op = expr[0], tag = op[0]
  // log ('\nunfold', expr)

  switch (tag) {
  case T.void:
    return [null, VOID, VOID]

  case T.elem:
    return [createElement (op[1]), VOID, VOID]

  case T.text:
    return [createTextNode (op[1]), VOID, VOID]
  
  case T.unsafeRaw:
   return [_createRawHTMLNode (data == null ? '' : String (data)), VOID, VOID]

  case T.key:
    return [createTextNode (key == null ? '' : String (key)), VOID, VOID]

  case T.value:
    return [createTextNode (data == null ? '' : String (data)), VOID, VOID]

  case T.deref: {
    const n = op[1] .substr(1)
    const type = typeof data
    if (!(n in lib)) throw new ReferenceError ('Unknown reference @' + n)

    // HACK: detect cycles
    // TODO clean this up alright
    //*
    if (data != null && type === 'object' || type === 'function') {
      if (marks[n] == null)
        marks[n] = new WeakMap
      const seen = marks[n].get (data)
      if (seen == null || seen > depth) marks[n] .set (data, depth)
      else if (depth > seen) data = Symbol ('Circular')
    }

    context = { data, key, lib, marks, depth:depth+1 } //*/

    const expr = lib[n]
    let data_ = data

    // Quick hack to tag the model onto the elements
    // NB for the time being, on components:
    // - value is the unprepared / input data
    // - key is the input's key
    // - data is the _prepared_ data!

    if ('ast' in expr) { // instanceof Domex
      if (typeof expr.prepareData === 'function') {
        data_ = expr.prepareData (data, key)
        context.data = data_
      }
      const deriv = unfold (expr.ast, context)
      if (deriv[0]) {
        const instance = { elem:deriv[0], value:data, data:data_, key }
        Object.setPrototypeOf (instance, expr)
        deriv[0] [refKey] = instance
      }
      return deriv
    }

    else {
      const deriv = unfold (expr, context)
      if (deriv[0]) {
        const ref = { value:data, data:data_, key, expr }
        deriv[0] [refKey] = ref
      }
      return deriv
    }
  }

  case T.withlib: {
    const scope = Object.create (lib)
    Object.assign (scope, op[1])
    // log ('withlib', op, scope, expr[1])
    return unfold (expr[1], { data, key, lib:scope, marks, depth })
  }

  case T.context: { // 'withcontext'
    return unfold (expr[1], op[1])
  }

  case T.letin: {
    const scope = Object.create (lib)
    scope [op[1]] = expr[1]
    // log ('letin', op, scope, expr[2])
    return unfold (expr[2], { data, key, lib:scope, marks, depth })
  }

  case T.bind:
  case T.bindi: {
    key = op[1] .substr(1)
    data = data == null ? undefined : data[key]
    return unfold (expr[1], { data, key, lib, marks, depth })
  }

  case T.ttest: {
    let test = op[1] .substr (2)
    let _type = data === null ? 'null'
      : Array.isArray (data) ? 'array' : typeof data
    if (_type === 'object' && data.type) _type = data.type
    // log ('test', test, _type)
    if (test !== _type) return [null, VOID, VOID];
    // Adds test to classList
    const [elem, subs, sibs] = unfold (expr[1], context)
    if (elem && elem.classList) elem.classList.add (test)
    return [elem, subs, sibs]
  }

  case T.test: {
    let test = op[1] .substr (1)
    let _value = data == null ? false : data[test]
    if (!_value) return [null, VOID, VOID];
    // Adds test to classList
    const [elem, subs, sibs] = unfold (expr[1], context)
    if (elem && elem.classList) elem.classList.add (test)
    return [elem, subs, sibs]
  }

  case T.iter: {
    if (data == null) return [null, VOID, VOID]
    if (typeof data !== 'object') data = []
    if (data[ITER] == null) {
      data = (op[1].length > 1)
        ? iterate (data [op[1] .substr(1)])
        : iterate (data)
      data[ITER] = true
      return unfold (expr, { data, key, lib, marks, depth })
    }

    else {
      // NB data is a stateful iterator
      const item = data.next ()
      if (item.done) return [null, VOID, VOID]
      const [key, value] = item.value
      const [elem, subs, sibs] = unfold (expr[1], { data:value, key, lib, marks, depth })
      const sibs2 = append (sibs, [[T.context, context], expr])
      return [elem, subs, append (sibs, sibs2)]
    }
  }

  case T.descend: {
    // TODO what about (a + b) > c ? ==> convert to (a > c) + (b > c)
    const [elem, subs, sibs] = unfold (expr[1], context)
    if (!elem) return [null, VOID, VOID]
    const subs2 = [[T.context, { data, key, lib, marks, depth }], expr[2]]
    // log ('descend', { expr, subs, subs2 })
    return [elem, append (subs, subs2), sibs]
  }

  case T.sibling: {
    const [elem, subs, sibs] = unfold (expr[1], context)
    if (elem == null) return unfold (expr[2], context)
    // TODO prevent superfluous withContext nodes (check that)
    const sibs2 = [[T.context, context], append (sibs, expr[2])]
    return [elem, subs, sibs2] // TODO should subs be passed the context?
  }

  case T.append: {
    const [elem, subs, sibs] = unfold (expr[1], context)
    if (elem == null) return [null, VOID, VOID]
    const subs2 = append (subs, [[T.context, context], expr[2]])
    return [elem, subs2, sibs]
  }

  case T.orelse: {
    for (let i=1,l=expr.length; i<l; i++) {
      const [elem, subs, sibs] = unfold (expr[i], context)
      if (elem != null) return [elem, subs, sibs]
    }
    return [null, VOID, VOID]
  }

  case T.class: {
    const [elem, subs, sibs] = unfold (expr[1], context)
    if (elem && elem.classList) elem.classList.add (op[1] .substr (1))
    return [elem, subs, sibs]
  }
    
  case T.hash: {
    const [elem, subs, sibs] = unfold (expr[1], context)
    if (elem && elem.setAttribute) elem.setAttribute ('id', op[1] .substr (1))
    return [elem, subs, sibs]
  }
    
  case T.attr: {
    const [elem, subs, sibs] = unfold (expr[2], context)
    if (elem && elem.setAttribute) setAttributes (elem, expr[1], context)
    return [elem, subs, sibs]
  }

  default:
    throw new TypeError (`eval: unknown operator type: ${tag} ${N[tag]}`)
  }
}

function append (x, y) {
  if (x[0][0] === T.void) return y
  if (y[0][0] === T.void) return x
  return [[T.sibling, '+'], x, y]
}

// ### Attribute evaluation
// This is hacked in quick - not as tidy as the rest

function setAttributes (elem, expr, context) {
  // log ('setAttributes', elem, expr)
  if (expr[0][0] === T.collate) for (let i=0,l=expr.length; i<l; i++)
    setAttribute (elem, expr[i], context)
  else setAttribute (elem, expr, context)
}

function setAttribute (elem, expr, context) {
  // log ('setAttribute', elem, expr)
  if (expr[0][0] === T.unquoted) elem.setAttribute (expr[0][1], '')
  if (expr[0][0] === T.assign) elem.setAttribute (expr[1][0][1], evalAttribute(expr[2], context))
}

function evalAttribute ([[tag,opdata]], context) {
  const data = context.data
  switch (tag){
    case T.keyIn: return context.key
    case T.valueIn: return data == null ? '' : opdata === '%' ? String (data) : String (data[opdata.substr(1)]) // TODO failsafe
    default: return opdata
  }
}


// Data Analysis
// -------------

function* emptyGenerator (){}
const Generator = emptyGenerator.constructor

const ITER = Symbol ('unfold.generator')
function* iterate (data) {
  if (data != null) {
    if (Symbol.iterator in data) {
      let i = 0
      for (let x of data) yield [i++, x] }
    else yield* Object.entries (data)
  }
}




// Exports
// =======

export { createUnfold, refKey }