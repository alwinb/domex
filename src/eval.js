const { Roles: { GROUP, PREFIX, INFIX, POSTFIX, LEAF } } = require ('./hoop2')
const { tokenTypes:T } = require ('./grammar')


// Evaluator
// =========

// Simple traversal based fold for trees as follows:
// tree := [number, string] | [tree, ...trees]
// however, leafs [number, string] at an index of 0 are not passed to the
// supplied algebra -- these are considered to be operator names, not elements. 

function fold (expr, apply) {
  const root = [0, [...expr]]
  const stack = [ root ]
  let RET, l

  while (l = stack.length) {
    const frame = stack[l-1]
    const [branch, expr] = frame
    const op = expr[0]

    // bottom out
    if (typeof op === 'number') {
      RET = frame
      frame[1] = [[op, expr[1]]]
      stack.length--
    }

    // pass up ... and optionally down again
    else if (RET) {
      // hoops are flattened in the parser
      // log ('RET', RET[1])
      expr[branch] = branch ? apply (...RET[1]) : RET[1][0]
      if (branch === expr.length-1) {
        RET = frame
        stack.length--
      }
      else {
        RET = null
        frame[0] = branch + 1
      }
    }

    // descend
    else
      stack[l] = [0, [...expr[branch]]]
  }
  return apply (...RET[1])
}


//----------
// Try it

const _escapes = {
  '\\/': '/',
  '\\\\':'\\',
  '\\b': '\b',
  '\\f': '\f',
  '\\n': '\n',
  '\\r': '\r',
  '\\t': '\t',
}

const log = console.log.bind (console)
const { parse } = require ('../src/grammar.js')

//var sample = 'a + b [foo="bar\\nbee"] + div @host'
var sample = 'a "foo\\nbar"; form @b > c@d; e@f'

log (sample, '\n===============\n')
const tree = parse (sample)
log (tree)
const alg = (...args) => (['X', ...args])

for (let k in T) T[k] = T[k]>>8


// Humm first try and work wih the algebra itself a bit more. 
// I need the constants to be evaluated differently, not within apply ?


const defs = []
const decls = {}
  
function apply (...expr) {
  const [[_tag, data], x, y] = expr
  const tag = _tag >> 8

  if (tag === T.Tree) expr = x
  else if (tag === T.strCat) expr = x + y
  else if (tag === T.escape) expr = _escapes [data]
  else if (tag === T.strChars) expr = data
  else if (tag === T.empty) expr = data
  else if (tag === T.declare) {
    for (let k of defs)
      decls[k] = expr
    defs = []
  }
  else if (tag === T.def) {
    defs.push [data.substr(1)]
  }

  // if (tag === T.Quoted) return x
  // if (tag === T.Text) return x
  return expr
}

var folded = fold (tree, apply)
log (JSON.stringify (folded, 0, 2))
log (decls)



