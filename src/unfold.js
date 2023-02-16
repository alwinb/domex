import { nodeTypes as T, typeNames as N, parse } from './signature.js'
const { assign, setPrototypeOf:setProto } = Object
const log = console.log.bind (console)

// Domex unfolder
// ==============

// unfold: takes an expression and input-data and returns a
// 'one-element unfolding': a tuple [elem, subs-expr, siblings-expr]
//  where elem is an actual DOM node (or sometimes internally, null), 
//  subs-expr the Dom expression that describes its children, 
//  and siblings-expr is a dom-expression that describes its (right-) siblings

const refKey = Symbol ('Domex.ref')
const ITER = Symbol ('unfold.generator')
const VOID = [[T.void, 'ε']]

const createUnfold = ({ createElement, createTextNode, _createRawHTMLNode }) =>
function unfold (expr, context = {})  {
  let { data, key, lib = {}, marks = {}, depth = 0 } = context
  const op = expr[0], opcode = op[0], opdata = op[1]
  const a  = expr[1],  b  = expr[2] // may be `undefined`
  // log ('\nunfold', expr)

  switch (opcode) {

  case T.void: return [null,                    VOID, VOID]
  case T.elem: return [createElement  (opdata), VOID, VOID]
  case T.text: return [createTextNode (opdata), VOID, VOID]
  
  case T.unsafeRaw:
   return [_createRawHTMLNode (show (data)), VOID, VOID]

  case T.key:
    return [createTextNode (show (key)), VOID, VOID]

  case T.value:
    return [createTextNode (show (data)), VOID, VOID]

  case T.deref: {
    const name = opdata .substr (1)
    const type = typeof data
    if (!(name in lib)) throw new ReferenceError ('Unknown reference @' + name)

    // HACK: detect cycles
    // TODO clean this up alright
    //*
    if (data != null && type === 'object' || type === 'function') {
      if (marks[name] == null)
        marks[name] = new WeakMap
      const seen = marks[name].get (data)
      if (seen == null || seen > depth) marks[name] .set (data, depth)
      else if (depth > seen) data = Symbol ('Circular')
    }

    context = { data, key, lib, marks, depth:depth+1 } //*/

    const expr = lib[name]
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
        setProto (instance, expr)
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
    const scope = assign (Object.create (lib), opdata)
    // log ('withlib', op, scope, a)
    return unfold (a, { data, key, lib:scope, marks, depth })
  }

  case T.context: { // 'withcontext'
    return unfold (a, opdata)
  }

  case T.letin: {
    const scope = Object.create (lib)
    scope [opdata] = a
    // log ('letin', op, scope, b)
    return unfold (b, { data, key, lib:scope, marks, depth })
  }

  case T.bind:
  case T.bindi: {
    key  = opdata.substr (1)
    data = data == null ? undefined : data[key]
    return unfold (a, { data, key, lib, marks, depth })
  }

  case T.ttest: {
    let test = opdata.substr (2)
    let _type = data === null ? 'null'
      : Array.isArray (data) ? 'array' : typeof data
    if (_type === 'object' && data.type) _type = data.type
    // log ('test', test, _type)
    if (test !== _type) return [null, VOID, VOID];
    // Adds test to classList
    const [elem, subs, sibs] = unfold (a, context)
    if (elem && elem.classList) elem.classList.add (test)
    return [elem, subs, sibs]
  }

  case T.test: {
    let test = opdata.substr (1)
    let _value = data == null ? false : data[test]
    if (!_value) return [null, VOID, VOID];
    // Adds test to classList
    const [elem, subs, sibs] = unfold (a, context)
    if (elem && elem.classList) elem.classList.add (test)
    return [elem, subs, sibs]
  }

  case T.iter: {
    if (data == null) return [null, VOID, VOID]
    if (typeof data !== 'object') data = []
    if (data[ITER] == null) {
      data = (opdata.length > 1)
        ? iterate (data [opdata.substr (1)])
        : iterate (data)
      data[ITER] = true
      return unfold (expr, { data, key, lib, marks, depth })
    }

    else {
      // NB data is a stateful iterator
      const item = data.next ()
      if (item.done) return [null, VOID, VOID]
      const [key, value] = item.value
      const [elem, subs, sibs] = unfold (a, { data:value, key, lib, marks, depth })
      const sibs2 = append (sibs, [[T.context, context], expr])
      return [elem, subs, append (sibs, sibs2)]
    }
  }

  case T.descend: {
    if (a[0][0] === T.sibling)
      // Syntactic transformation: (a1 + a2) > b ==> (a1 > b) + (a2 > b)
      return unfold ([[T.sibling, '+'], [[T.descend, '>'], a[1], b], [[T.descend, '>'], a[2], b]])
    // else unfold
    const [elem, subs, sibs] = unfold (a, context)
    if (!elem) return [null, VOID, VOID]
    const subs2 = [[T.context, { data, key, lib, marks, depth }], b]
    return [elem, append (subs, subs2), sibs]
  }

  case T.sibling: {
    const [elem, subs, sibs] = unfold (a, context)
    if (elem == null) return unfold (b, context)
    // TODO prevent superfluous withContext nodes (check that)
    const sibs2 = [[T.context, context], append (sibs, b)]
    return [elem, subs, sibs2] // TODO should subs be passed the context?
  }

  case T.append: {
    const [elem, subs, sibs] = unfold (a, context)
    if (elem == null) return [null, VOID, VOID]
    const subs2 = append (subs, [[T.context, context], b])
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
    const [elem, subs, sibs] = unfold (a, context)
    if (elem && elem.classList)
      elem.classList.add (opdata.substr (1))
    return [elem, subs, sibs]
  }
    
  case T.hash: {
    const [elem, subs, sibs] = unfold (a, context)
    if (elem && elem.setAttribute)
      elem.setAttribute ('id', opdata.substr (1))
    return [elem, subs, sibs]
  }
    
  case T.attr: {
    const [elem, subs, sibs] = unfold (b, context)
    if (elem && elem.setAttribute) setAttributes (elem, a, context)
    return [elem, subs, sibs]
  }

  default:
    throw new TypeError (`unfold: unknown operator type: ${opcode} ${N[opcode]}`)
  }
}

function append (x, y) {
  if (x[0][0] === T.void) return y
  if (y[0][0] === T.void) return x
  return [[T.sibling, '+'], x, y]
}

function show (input) {
  return input == null ? '' : String (input)
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
  const op = expr[0], opcode = op[0], opdata = op[1]
  // log ('setAttribute', elem, expr)
  if (opcode === T.unquoted) elem.setAttribute (opdata, '')
  if (opcode === T.assign)   elem.setAttribute (expr[1][0][1], evalAttribute(expr[2], context))
}

function evalAttribute ([[opcode,opdata]], context) {
  const data = context.data
  switch (opcode){
    case T.keyIn: return context.key
    case T.valueIn: return data == null ? '' : opdata === '%' ? String (data) : String (data[opdata.substr(1)]) // TODO failsafe
    default: return opdata
  }
}


// Data Analysis
// -------------

function* emptyGenerator (){}
const Generator = emptyGenerator.constructor

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