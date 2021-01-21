
// A quick adaptation of the fold
// TODO review and merge it with the fold in compile

function refold (seed, unfold, apply) {
  const root = [0, unfold (seed)]
  const stack = [ root ]
  let RET, l

  while (l = stack.length) {
    //log ('stack', stack.map (([n,a]) => [n, a[0]]) )
    const frame = stack[l-1]
    const [branch, coterm] = frame
    const op = coterm[0]

    // bottom out
    if (typeof op === 'number') {
      RET = frame
      frame[1] = [[op, coterm[1]]]
      stack.length--
    }

    // pass up and unless at end, move down
    else if (RET) {
      coterm[branch] = branch ? apply (...RET[1]) : RET[1][0]
      if (branch === coterm.length-1) {
        RET = frame
        stack.length--
      }
      else {
        RET = null
        const b = branch + 1
        frame[0] = b
        coterm[b] = unfold (coterm[b])
      }
    }

    // descend
    else
      stack[l] = [0, [...coterm[branch]]]
  }
  return apply (...RET[1])
}

// Test

const log = console.log.bind (console)
const { parse } = require ('../src/grammar.js')
const { tokenTypes:T } = require ('./grammar')

// log (T)

// unfold: takes an expression and its input data
// and returns (for now) an expression. 

function unfold (seed)  {
  let { expr, data, key, lib = {} } = seed
  let op = expr[0]

  if (op === T.component) {
    const n = expr[1]
    if (!(n in lib)) throw new Error ('Unknown reference ' + expr[1])
    return unfold ({ expr:lib[expr], data, key })
  }
  
  if (typeof op === 'number') // tagged constant
    return expr

  if (op[0] === T.bind) {
    key = op[1].substr(1)
    data = data[key]
    return unfold ({ expr:expr[1], data, key })
  }

  if (op[0] === T.test) {
    let test = op[1].substr(1)
    let _type = data === null ? 'null' : Array.isArray (data) ? 'array' : typeof data
    if (_type === 'object' && data.type) _type = data.type
    log ('test', expr)
    if (test !== _type) return [[T.void, 'ε']]
    return unfold ({expr: expr[1], data, key })
  }

  if (op[0] === T.iter) {
    const _expr = [[T.append]]
    for (let [key,v] of Object.entries (data)) // TODO proper incremental analyse 
      _expr[_expr.length] = { expr:expr[1], data:v, key }
    return _expr
  }

  if (op[0] === T.value)
    op = [T.text, String (data)]

  else if (op[0] === T.key)
    op = [T.text, String (key)]

  expr = expr.map (_ => ({ expr:_, data, key }))
  expr[0] = op
  return expr
}


// Test
// ====

var sample = 'span $ ~name + div %~name'
var sample = 'span:string ~name'
var sample = 'span:number ~name'
var sample = '(span:number %)* ~arr'
var sample = 'div@a; @a'

const tree = parse (sample)

log (sample, '\n'+sample.replace(/./g, '='))
log (JSON.stringify (tree), '\n')

var folded = refold ({ expr:tree, data:{ name:'test', arr:[1,2,'x',3] }}, unfold, (...args) => args)
log (JSON.stringify (folded, 0, 2))

