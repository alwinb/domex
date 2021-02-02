const log = console.log.bind (console)
const { parse } = require ('../src/grammar.js')
const { tokenTypes:T } = require ('./grammar')
const { createElement, createTextNode } = require ('./dom')

// unfold: takes an expression and its input data
// and returns a one-element unfolding [elem, subs-expr, siblings-expr]

function append (x, y) {
  if (x[0][0] === T.void) return y
  if (y[0][0] === T.void) return x
  return [[T.append, '+'], x, y]
}

const VOID = [[T.void, 'ε']]

function unfold (expr, context = {})  {
  let { data, key, lib = {} } = context
  const op = expr[0], tag = op[0]
  // log ('\nunfold', expr)

  switch (tag) {
  case T.void:
    return [null, VOID, VOID]

  case T.elem:
    return [createElement (op[1]), VOID, VOID]

  case T.text:
    return [createTextNode (op[1]), VOID, VOID]

  case T.key:
    return [createTextNode (String (key)), VOID, VOID]

  case T.value:
    return [createTextNode (String (data)), VOID, VOID]

  case T.component: {
    const n = op[1]
    // log ('deref', n, lib[n])
    // TODO detect cycles
    if (!(n in lib)) throw new ReferenceError ('Unknown reference ' + op[1])
    return unfold (lib[n], context)
  }
  
  case T.withlib: {
    const scope = Object.create (lib)
    Object.assign (scope, op[1])
    // log ('withlib', op, scope, expr[1])
    return unfold (expr[1], { data, key, lib:scope })
  }

  case T.withdata: {
    return unfold (expr[1], op[1])
  }

  case T.letin: {
    const scope = Object.create (lib)
    scope [op[1]] = expr[1]
    // log ('letin', op, scope, expr[2])
    return unfold (expr[2], { data, key, lib:scope })
  }

  case T.bind: {
    key = op[1] .substr(1)
    data = data[key]
    return unfold (expr[1], { data, key, lib })
  }

  case T.test: {
    let test = op[1] .substr(1)
    let _type = data === null ? 'null' : Array.isArray (data) ? 'array' : typeof data
    if (_type === 'object' && data.type) _type = data.type
    // log ('test', test, _type)
    if (test !== _type) return [null, VOID, VOID]
    else return unfold (expr[1], context)
  }

  case T.iter: {
    const body = expr[1]
    let sibs2 = [[T.append, '+']]
    let [elem, subs, sibs] = [null, VOID, VOID]
    for (let [key,v] of Object.entries (data)) { // TODO proper incremental analyse
      const ctx = { data:v, key, lib };
      if (!elem) [elem, subs, sibs] = unfold (body, ctx)
      else { sibs2 [sibs2.length] = [[T.withdata, ctx], body] }
    }
    if (sibs2.length === 1) sibs2 = VOID
    if (sibs2.length === 2) sibs2 = sibs2[1]
    // log ('iter', { elem, subs, sibs, sibs2 })
    return [elem, subs, append(sibs, sibs2)]
  }

  case T.descend: {
    const [elem, subs, sibs] = unfold (expr[1], context)
    if (!elem) return [null, VOID, VOID]
    const subs2 = [[T.withdata, { data, key, lib }], expr[2]]
    // log ('descend', { expr, subs, subs2 })
    return [elem, append (subs, subs2), sibs]
  }

  case T.append: { // FIXME
    const [elem, subs, sibs] = unfold (expr[1], context)
    let _expr = [[T.append, '+'], ...expr.slice (2)]
    if (_expr.length === 1) _expr = VOID
    else if (_expr.length === 2) _expr = _expr[1]
    const subs2 = [[T.withdata, { data, key, lib }], _expr]
    // log ('append', { expr, sibs, subs2 })
    return [elem, subs, append (sibs, subs2)]
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
    if (elem) elem.classList.add (op[1] .substr (1))
    return [elem, subs, sibs]
  }
    
  case T.hash: {
    const [elem, subs, sibs] = unfold (expr[1], context)
    if (elem) elem.setAttribute ('id', op[1] .substr (1))
    return [elem, subs, sibs]
  }
    
  case T.Attr:
    // TODO: set attributes
    const d1 = unfold (expr[1], context)
    return d1

  // default:
  //   log (expr)
  //   throw new Error (expr)
  }
}



// Exports
// =======

module.exports = { unfold }
