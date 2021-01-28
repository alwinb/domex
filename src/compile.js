const log = console.log.bind (console)
const { typeMask } = require ('./hoop2')
const { tokenTypes } = require ('./grammar')

// `preEval` Algebra
// =================
// Some pre-evaluation;
// Assert some additional type constraints.

const T = tokenTypes
const typeNames = { }
const N = typeNames
for (let k in tokenTypes) {
  const t = T[k]
  typeNames[t] = k
}
// log (T)

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

// Applies the 'stack of postfix operators' ops
// and if named, add a binary 'let' operator akin to
// let (name = expr1) in expr2

function bindDefs ({ expr, ops, name }) {
  if (ops) { let o, l
    for (o = ops; o[l = o.length - 1] != null; o = o[l]);
    o[l] = expr
    expr = ops
  }
  if (name != null)
    expr = [[T.letin, name], expr, [[T.component, name]]]
  return expr
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
  // log ('preEval', expr)
  const [[tag, data], x, y] = expr
  const xa = (x && x[0] && x[0][2]) // putting annotations on the operator ;)
  switch (tag) {

    // ### Tree operands

    case T.Tree: // replace `()` group with contents
      return x // { expr: bindDefs (x) }

    case T.String:
      return { expr:[[T.text, x]], ops:null, name:null }

    case T.elem:
    case T.key:
    case T.component:
      return { expr, ops:null, name:null }

    case T.value: { // Split e.g. %foo into %~foo
      const ref = [[T.value, '%']]
      let ops = data.length > 1 ? [[T.bind, '~' + data.substr(1)], null] : null
      return { expr:ref, ops, name:null }
    }

    // ### Tree operators (infix)

    case T.append: // flatten nested `+` to n-ary `+`
      return { expr: [expr[0], bindDefs(x), bindDefs(y)] } // FIXME assoc

    case T.orelse: // flatten nested `|` to n-ary `|`
      return { expr: [expr[0], bindDefs(x), bindDefs(y)] } // FIXME assoc

    case T.declare: // TODO/ FIXME
      const ya = y[0][2]||{}
      const lib = 'lib' in ya ? ya.lib : {}
      if (ya) lib[ya.name] = y
      if (xa) lib[xa.name] = x
      return [[T.withlib, lib], y]

    case T.descend: {
      const op = [T.descend, data]
      const _expr = [op, x.expr, bindDefs (y)]
      return { expr: bindDefs ({ ops:x.ops, expr:_expr, name:x.name }) }
    }

    // ### Tree operators (postfix)

    case T.def:
      if (x.name != null)
        throw new Error (`expression ${data} is already named ${name}`)
      return { name:data, expr:x.expr, ops:x.ops }

    case T.iter:
      return { ops:[expr[0], x.ops], name:null, expr:x.expr }

    case T.test:
    case T.class: // REVIEW, disallow the following on non-elements? how? all?
    case T.hash:
    case T.bind: // REVIEW should bind distribute over defs or not?
      return { ops:[expr[0], x.ops], name:x.name, expr:x.expr }

    case T.Attr: // 'add attributes': higher order postfix operator
      return { ops:[expr[0], x, y.ops], name:y.name, expr:y.expr }

    // ### Attributes

    case T.attrName:
      return expr

    case T.collate: // convert to n-ary
      return _assoc (T.collate, expr)

    case T.assign: { // assert additional type constraints
      const ya = y[0][2]
      if (x[0][0] !== T.attrName) throw new TypeError ('Lhs of `=` must be attrName, got '+x.type)
      if (y[0][0] === T.assign)   throw new TypeError ('Rhs of `=` must not be an assignment')
      return [[T.assign, x[0][1]], y] // REVIEW rewrap attrNames in value) position
    }

    // ### Strings

    case T.strChars:  return data
    case T.escape:    return _escapes [data]
    case T.empty:     return ''
    case T.hexescape: return String.fromCodePoint (parseInt (data.substr(2), 16))
    case T.strCat:    return x + y

    default:
      throw new Error (`preEval: unknown operator type: ${tag} ${N[tag]}`)
  }
}

module.exports = { preEval, bindDefs }
