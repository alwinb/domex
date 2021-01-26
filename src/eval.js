const log = console.log.bind (console)
const { parse } = require ('../src/grammar.js')
const { tokenTypes:T } = require ('./grammar')

// modified hylomorphism

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
      else if (op[0] === T.orelse && branch && coterm[branch][0][0] !== T.void) { // NB hacked in special form '|'
        // If in an 'orelse' and the previous branch did not return void,
        // this then replaces the stack frame with only that branch as result.
        // A hack, but it works for now
        const nonvoid = coterm[branch]
        stack[stack.length-1] = [1, [op, nonvoid]]
        // So, review this...
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
  let op = expr[0]
  // log ('unfold', op)

  if (typeof op === 'number') // tagged constant
    return expr

  if (op[0] === T.component) {
    const n = op[1]
    // log ('deref', n, lib[n])
    // TODO detect cycles, but first now, implement the conditional
    if (!(n in lib)) throw new Error ('Unknown reference ' + op[1])
    return unfold ({ expr:lib[n], data, key, lib })
  }

  if (op[0] === T.letin) {
    const scope = Object.create (lib)
    scope [op[1]] = expr[1]
    // log ('letin', op, scope, expr[2])
    return unfold ({ expr:expr[2], data, key, lib:scope })
  }

  if (op[0] === T.bind) {
    key = op[1].substr(1)
    data = data[key]
    return unfold ({ expr:expr[1], data, key, lib })
  }

  if (op[0] === T.test) {
    let test = op[1].substr(1)
    let _type = data === null ? 'null' : Array.isArray (data) ? 'array' : typeof data
    if (_type === 'object' && data.type) _type = data.type
    // log ('test', expr, data, _type, test === _type)
    if (test !== _type) return [[T.void, 'ε']]
    else return unfold ({ expr: expr[1], data, key, lib })
  }

  if (op[0] === T.iter) {
    const _expr = [[T.append]]
    for (let [key,v] of Object.entries (data)) // TODO proper incremental analyse 
      _expr[_expr.length] = { expr:expr[1], data:v, key, lib }
    return _expr
  }

  if (op[0] === T.value)
    op = [T.text, String (data)]

  else if (op[0] === T.key)
    op = [T.text, String (key)]

  expr = expr.map (_ => ({ expr:_, data, key, lib }))
  expr[0] = op
  return expr
}


function eval (expr, data) {
  return refold ({ expr, data }, unfold)
}

// Exports
// =======

module.exports = { refold, eval }
