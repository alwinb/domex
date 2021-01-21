const log = console.log.bind (console)
const { typeMask } = require ('./hoop2')
const { tokenTypes } = require ('./grammar')

// Evaluator
// =========

// Simple traversal based fold for trees as follows:
// tree := [number, string] | [tree, ...trees]
// however, leafs [number, string, ...annotations] at an index of 0 are not passed to the
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

    // pass up and unless at end, move down
    else if (RET) {
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


// `preEval` Algebra
// =================
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
  if (x[0][0] === t) nary.push (...x.slice(1))
  else nary.push (x)
  if (y[0][0] === t) nary.push (...y.slice(1))
  else nary.push (y)
  return nary
}

function ann (expr, a) {
  const e = [...expr]
  e[0] = [...e[0]]
  e[0][2] = a
  return e
}

function defbound (expr) {
  // check if the operands contain defs
  // if so, create lib and wrap expr in a scope node
  let expr_ = [expr[0]]
  for (let i=1, l=expr.length; i<l; i++) {
    let x = expr[i], xa = x[0][2]
    //x[0].length = 2; // NB removes annotation from the subexpression
    if (xa && xa.name != null) {
      x = [['scope', xa.name], x, [N[T.component], xa.name]]
    }
    expr_[i] = x
  }
  return expr_
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

function preEval (...expr) {
  const [[tag, data], x, y] = expr
  const xa = (x && x[0] && x[0][2])||{} // putting annotations on the operator ;)
  expr[0][0] = N[expr[0][0] >> 8] // for development/ pretty print
  switch (tag >> 8) {

    // ### Tree operands

    case T.Tree: // replace `()` group with contents
      return x

    case T.elem:
    case T.component:
      return expr

    // ### Tree operators

    case T.append: // flatten nested `+` to n-ary `+`
      return _assoc (N[T.append], defbound (expr))

    case T.orelse: // flatten nested `|` to n-ary `|`
      return _assoc (N[T.orelse], defbound (expr))

    case T.declare: 
      const ya = y[0][2]||{}
      const lib = 'lib' in ya ? ya.lib : {}
      if (ya.name != null) lib[ya.name] = y
      if (xa.name != null) lib[xa.name] = x
      return ann (y, { lib })

    case T.iter:
      return defbound (expr)

    case T.test:
      return ann (expr, { name:xa?xa.name:null })
    
    case T.def: 
      if (xa && xa.name != null)
        throw new SyntaxError (`expression ${data} is already named ${xa.name}`)
      return ann (x, { name:data })

    case T.descend:
      const op = [N[T.descend], data, { name:xa?xa.name:null }]
      return [op, x, defbound (y)]

    case T.value: // Split e.g. %foo into %~foo
      x[0].length = 2
      if (data.length > 1) 
        return [[N[T.bind], '~' + data.substr(1), xa], [[N[T.value], '%'], x]]
      else return ann (expr, { name:xa?xa.name:null })

    case T.key:
    case T.bind: // REVIEW should bind distribute over defs or not?

    // REVIEW, disallow the following on non-elements? how? all?
    // I think it makes sense to restrict that, yes, to 'elem-heads'?
    case T.klass:
    case T.hash:
    case T.Attr: // 'add attributes': higher order postfix operator
      x[0].length = 2
      return ann (expr, { name:xa?xa.name:null })

    case T.Text: // 'append-text': higher order postfix operator
      return ann ([[N[T.Text], x], y], { name:xa?xa.name:null })


    // ### Attribute operands (leafs)

    // NB may also be T.key or T.value
    case T.attrName:
      return expr

    case T.Quoted: // evaluate quoted values (group)
      return [N[T.Quoted], x]

    // ### Attribute  operators (assign and juxtapose)

    case T.attrNext: // convert to n-ary
      return _assoc (N[T.attrNext], expr)

    case T.assign: {
      // Assert types
      const ya = y[0][2]
      if (x[0][0] !== N[T.attrName]) throw new TypeError ('Lhs of `=` must be attrName, got '+x.type)
      if (y[0][0] === N[T.assign])   throw new TypeError ('Rhs of `=` must not be an assignment')
      return [[N[T.assign], x[0][1]], y] // REVIEW rewrap attrNames in value) position
    }

    // ### Strings (Text/ Quoted)

    case T.strChars:  return data
    case T.escape:    return _escapes [data]
    case T.empty:     return ''
    case T.hexescape: return String.fromCodePoint (parseInt (data.substr(2), 16))
    case T.strCat:    return x + y

    // ### Default branch / Error
    default:
      throw new Error (`preEval: unknown operator type: ${tag} ${tag>>8} ${N[tag>>8]}`)
  }
}

module.exports = { fold, preEval }
