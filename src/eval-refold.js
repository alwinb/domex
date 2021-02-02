const log = console.log.bind (console)
const { parse } = require ('../src/grammar.js')
const { tokenTypes:T } = require ('./grammar')

// This is a standard hylomorphism that has been modified to
// short-circuit on the the '|' operator. 

function refold (seed, unfold, apply = (...args) => args) {
  const root = [0, unfold (seed)]
  const stack = [ root ]
  let RET, l

  while (l = stack.length) {
    //log ('stack', stack.map (([n,a]) => [n, a[0]]) )
    const frame = stack[l-1]
    const [branch, coterm] = frame
    const op = coterm[0]

    if (typeof op === 'number') { // bottom out
      RET = frame
      frame[1] = [[op, coterm[1]]]
      stack.length--
    }

    else if (RET) { // pass up; maybe move down again
      coterm[branch] = branch ? apply (...RET[1]) : RET[1][0]
      if (branch === coterm.length-1) {
        RET = frame
        stack.length--
      }
      else if (op[0] === T.orelse && branch && coterm[branch][0][0] !== T.void) {
        const nonvoid = coterm[branch]
        stack[stack.length-1] = [1, [op, nonvoid]]
      }
      else {
        RET = null
        const b = branch + 1
        frame[0] = b
        coterm[b] = unfold (coterm[b])
      }
    }

    else // descend
      stack[l] = [0, [...coterm[branch]]]
  }
  return apply (...RET[1])
}


// unfold: takes an expression and its input data
// and returns (for now) an expression. 

function unfold (seed)  {
  let { expr, data, key, lib = {} } = seed
  if (typeof expr[0] === 'number') // tagged constant
    return expr

  const op = expr[0], tag = op[0]
  // log ('unfold', op, '\n', expr[1], '\n', expr[2], '\n')

  if (tag === T.component) {
    const n = op[1]
    // log ('deref', n, lib[n])
    // TODO detect cycles
    if (!(n in lib)) throw new Error ('Unknown reference ' + op[1])
    return unfold ({ expr:lib[n], data, key, lib })
  }
  
  if (tag === T.text) {
    return expr
  }

  if (tag === T.key) {
    return [[T.text, String (key)]]
  }

  if (tag === T.value) {
    return [[T.text, String (data)]]
  }

  if (tag === T.withlib) {
    const scope = Object.create (lib)
    Object.assign (scope, op[1])
    // log ('withlib', op, scope, expr[1])
    return unfold ({ expr:expr[1], data, key, lib:scope })
  }

  if (tag === T.letin) {
    const scope = Object.create (lib)
    scope [op[1]] = expr[1]
    // log ('letin', op, scope, expr[2])
    return unfold ({ expr:expr[2], data, key, lib:scope })
  }

  if (tag === T.bind) {
    key = op[1].substr(1)
    data = data[key]
    return unfold ({ expr:expr[1], data, key, lib })
  }

  if (tag === T.test) {
    let test = op[1].substr(1)
    let _type = data === null ? 'null' : Array.isArray (data) ? 'array' : typeof data
    if (_type === 'object' && data.type) _type = data.type
    if (test !== _type) return [[T.void, 'ε']]
    else return unfold ({ expr: expr[1], data, key, lib })
  }

  if (tag === T.iter) {
    const _expr = [[T.append]]
    for (let [key,v] of Object.entries (data)) // TODO proper incremental analyse 
      _expr[_expr.length] = { expr:expr[1], data:v, key, lib }
    return _expr
  }

  const _expr = [op]
  for (let i=1, l=expr.length; i<l; i++)
    _expr[i] = { expr:expr[i], data, key, lib }
  return _expr
}


// foldup evaluates _static_ expressions
// ie. expressions without def, declare, test, key, value, iter, letin
// it evaluates orelse nodes (ao). 
// can be easily modifier to return a DOM

function foldup (op, ...args) {
  const [tag, data] = op
  const [x, y] = args
  const xop = x && x[0][0]
  switch (tag) {

    case T.void: case T.elem: case T.text: 
      return [op]

    case T.append: {
      const els = args .filter (_ => _ && _[0][0] !== T.void)
      return !els.length ? [[T.void, 'ε']] : els.length === 1 ? els[0] : [[T.append, '+'], ...els]
    }

    case T.orelse: {
      const els = args .filter (_ => _ && _[0][0] !== T.void)
      return els.length ? els[0] : [[T.void, 'ε']]
    }

    case T.descend:
      return xop === T.void ? x : [op, x, y]

    case T.class: case T.hash: case T.Attr:
      return xop === T.void ? x : [op, x]

    default:
      return [op, x, y]
      // log ('eval.apply: unknown ast node', op, x, y)
      // throw new TypeError ('eval.apply: unknown ast node')
  }
}


function eval (expr, data) {
  return refold ({ expr, data }, unfold, foldup)
}

// Exports
// =======

module.exports = { refold, eval }
