const { typeMask } = require ('./hoop2')
const { tokenTypes } = require ('./grammar')

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


// `types` Algebra
// ===============
// Some pre-evaluation;
// Bottom up type assignment;
// Assert some additional type constraints.

// first,
// remove the operator info from the token types

const T = { }
const typeNames = {}
const N = typeNames
for (let k in tokenTypes) {
  const t = T[k] = tokenTypes[k]>>8
  typeNames[t] = k
}
// log (tokenTypes, T)

// helper: assoc -- expr may be n-ary,
// collates immediate subexpressions with tag t

function _assoc (t, expr) {
  const [_, x, y] = expr
  const nary = [expr[0]]
  if (x.type === t) nary.push (...x.expr.slice(1))
  else nary.push (x)
  if (y.type === t) nary.push (...y.expr.slice(1))
  else nary.push (y)
  return nary
}

const _escapes = {
  '\\/': '/',
  '\\\\':'\\',
  '\\b': '\b',
  '\\f': '\f',
  '\\n': '\n',
  '\\r': '\r',
  '\\t': '\t',
}

// The Algebra
// -----------

function types (...expr) {
  const [[tag, data], x, y] = expr
  expr = [...expr]
  expr[0][0] = N[expr[0][0] >> 8] // for development/ pretty print
  switch (tag >> 8) {

    // ### Tree operands

    case T.Tree: // replace `()` group with contents
      return x

    case T.elem:
      return { type: N[T.elem], expr }

    case T.component:
      return { type: N[T.component], expr }

    // ### Tree operators

    case T.append: // flatten nested `+` to n-ary `+`
      return { type:N[T.append], expr: _assoc (N[T.append], expr)}

    case T.orelse: // flatten nested `|` to n-ary `|`
      return { type:N[T.orelse], expr: _assoc (N[T.orelse], expr)}

    case T.declare: // flatten nested `;` to n-ary `;` // REVIEW/ design
      return { type:N[T.declare], expr: _assoc (N[T.declare], expr)}

    case T.iter:
      return { type: N[T.iter], expr }

    case T.test: // convert to 1-ary `|`
      return { type: N[T.orelse], expr:[[N[T.orelse], '|'], expr] }
    
    case T.descend:
    case T.def:
    case T.bind:
    case T.value:
    case T.key:

    // TODO flatten the attribute ops too
    case T.klass:
    case T.hash:
    case T.Attr: // 'assign attributes': higher order postfix operator
      return { type: N[T.Tree], expr }

    case T.Text: // 'append-text': higher order postfix operator
      return { type: N[T.Tree], expr:[ [N[T.Text], x], y] }
    
    // ### Attribute operands

    case T.attrName:
      return { type: N[T.attrName], expr:data }

    case T.Quoted: // evaluate quoted values (group)
      return { type: N[T.Quoted], expr:[N[T.Quoted], x] }

    // ### Attribute  operators (assign)
    // case T.attrNext:
    case T.assign: // restrict types of x and y
      if (x.type !== N[T.attrName]) throw new TypeError ('Lhs of `=` must be attrName, got '+x.type)
      if (y.type === N[T.assign]) throw new TypeError ('Rhs of `=` must not be an assignment')
      return { type: N[T.assign], expr:[[N[T.assign], x.expr], y.expr] } // REVIEW rewrap attrNames in value position

    // ### Strings (Text/ Quoted)

    // operands -- evaluate strings
    case T.strChars: return data
    case T.escape: return _escapes [data]
    case T.empty: return ''
    case T.hexescape: return '' // TODO
    // operators
    case T.strCat: return x + y

    // ### Default branch / Error
    default:
      log ('apply - type - unknown', N[tag>>8], expr)
  }
}


// Try it
// ======

const log = console.log.bind (console)
const { parse } = require ('../src/grammar.js')

//var sample = 'a + b [foo="bar\\nbee"] + div @host'
//var sample = 'a "foo\\nbar"; form @b > c@d; e@f'
var sample = 'p "hello\\nworld" > (a + b)'
var sample = 'a[d="e\\nf"]'
var sample = 'a[d=f=g]'
var sample = 'a[d=f]' // TODO should probably not unwrap attrName f ? use unquoted instead?
//var sample = 'a[d=%]' // FIXME
//var sample = 'a[a=b c=d]' // FIXME
var sample = 'a + b + g + (c | d | e) + e + f'
var sample = 'a?x | b?y | c'
var sample = '(a + b + c)*name'
var sample = 'a; b; c'

log (sample, '\n===============\n')
const tree = parse (sample)
// log (JSON.stringify (tree))

var folded = fold (tree, types)
log (JSON.stringify (folded, 0, 2))
