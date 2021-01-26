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

// So this adds a binary 'let' operator akin to
// let name = expr1 in expr2

// This is like def, but defs are removed by the compiler
// and converted to lets -- indeed defs are distributed upwards

function bindDefs (expr) {
  let expr_ = [expr[0]]
  for (let i=1, l=expr.length; i<l; i++) {
    let x = expr[i], xa = x[0][2]
    // log ('bindDefs', x[0])
    if (xa && xa.name != null) {
      x = [[T.letin, xa.name], x, [[T.component, xa.name]]]
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
  const xa = (x && x[0] && x[0][2]) // putting annotations on the operator ;)
  switch (tag) {

    // ### Tree operands

    case T.Tree: // replace `()` group with contents
      return x

    case T.elem:
    case T.component:
      return expr

    // ### Tree operators

    case T.append: // flatten nested `+` to n-ary `+`
      return _assoc (T.append, bindDefs (expr))

    case T.orelse: // flatten nested `|` to n-ary `|`
      return _assoc (T.orelse, bindDefs (expr))

    case T.declare:
      // TODO collect all
      const ya = y[0][2]||{}
      const lib = 'lib' in ya ? ya.lib : {}
      if (ya) lib[ya.name] = y
      if (xa) lib[xa.name] = x
      return [[T.withlib, lib], y]

    case T.iter:
      return bindDefs (expr)

    case T.test:
      x[0].length = 2
      return xa ? ann (expr, { name:xa.name }) : expr
    
    case T.def:
      if (xa && xa.name != null)
        throw new Error (`expression ${data} is already named ${xa.name}`)
      return ann (x, { name:data })

    case T.descend:
      const op = [T.descend, data]
      if (xa) op[2] = { name:xa.name }
      return [op, x, bindDefs (y)]

    case T.value: // Split e.g. %foo into %~foo
      if (data.length > 1) 
        return [[T.bind, '~' + data.substr(1), xa], [[T.value, '%'], x]]
      else return xa ? (x[0].length = 2, ann (expr, { name:xa.name })) : expr

    case T.key:
    case T.bind: // REVIEW should bind distribute over defs and/ or descend or not?

    // REVIEW, disallow the following on non-elements? how? all?
    case T.klass:
    case T.hash:
    case T.Attr: // 'add attributes': higher order postfix operator
      return xa ? (x[0].length = 2, ann (expr, { name:xa.name })) : expr

    case T.Text: // 'append-text': higher order postfix operator
      const _expr = [[T.Text, x], y]
      return xa ? (x[0].length = 2, ann (_expr, { name:xa.name })) : _expr


    // ### Attribute operands (leafs)

    // NB may also be T.key or T.value
    case T.attrName:
      return expr

    case T.Quoted: // evaluate quoted values (group)
      return [T.Quoted, x]

    // ### Attribute  operators (assign and juxtapose)

    case T.attrNext: // convert to n-ary
      return _assoc (T.attrNext, expr)

    case T.assign: {
      // Assert types
      const ya = y[0][2]
      if (x[0][0] !== T.attrName) throw new TypeError ('Lhs of `=` must be attrName, got '+x.type)
      if (y[0][0] === T.assign)   throw new TypeError ('Rhs of `=` must not be an assignment')
      return [[T.assign, x[0][1]], y] // REVIEW rewrap attrNames in value) position
    }

    // ### Strings (Text/ Quoted)

    case T.strChars:  return data
    case T.escape:    return _escapes [data]
    case T.empty:     return ''
    case T.hexescape: return String.fromCodePoint (parseInt (data.substr(2), 16))
    case T.strCat:    return x + y

    // ### Default branch / Error
    default:
      throw new Error (`preEval: unknown operator type: ${tag} ${N[tag]}`)
  }
}

module.exports = { preEval, bindDefs }
