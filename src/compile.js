const log = console.log.bind (console)
const { signatures, nodeTypes:T, typeNames:N } = require ('./signature')
const { typeMask } = require ('./hoop2')

// `preEval` Algebra
// =================
// Some pre-evaluation;
// Assert some additional type constraints.

// Applies the 'stack of postfix operators' ops
// and if named, add a binary 'let' operator akin to
// let/name = expr1 in expr2

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
  switch (tag) {

    // ### Dom operands

    case T.group: // replace `()` group with contents
      return x // { expr: bindDefs (x) }

    case T.text:
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

    // ### Dom operators (infix)

    case T.sibling:
    case T.orelse: {
      const _expr = [expr[0]]
      for (let i=1, l=expr.length; i<l; i++) _expr[i] = bindDefs (expr[i])
      return { expr: _expr }
    }

    case T.declare:
      const lib = Object.create (null)
      const l = expr.length-1
      for (let i=1; i<l; i++) {
        const _expr = bindDefs (expr[i])
        if (_expr[0][0] === T.letin) {
          const name = _expr[0][1]
          lib[name] = _expr [1] // store the body only
        }
        // TODO throw on name clashes
      }
      const last = expr[l]
      return { expr: [[T.withlib, lib], last.expr], name:last.name, ops:last.ops } 

    case T.descend: {
      const op = [T.descend, data]
      const _expr = [op, x.expr, bindDefs (y)]
      return { expr: bindDefs ({ ops:x.ops, expr:_expr, name:x.name }) }
    }

    // ### Dom operators (postfix)

    case T.def:
      if (x.name != null)
        throw new Error (`expression ${data} is already named ${name}`)
      return { name:data, expr:x.expr, ops:x.ops }

    case T.iter:
      return { ops:[expr[0], x.ops], name:null, expr:x.expr }

    case T.bind: // REVIEW should bind distribute over defs or not?
    case T.test: case T.ttest:
    case T.class: case T.hash:
      return { ops:[expr[0], x.ops], name:x.name, expr:x.expr }

    case T.attr: { // 'add attributes': higher order postfix operator
      switch (x[0][0]) {
        case T.unquoted: case T.collate: case T.assign: break
        default: throw new TypeError ('Invalid attribute expression')
      }
      return { ops:[expr[0], x, y.ops], name:y.name, expr:y.expr }
    }

    case T.addtext: { // wrapfix-postfix operator
      // convert to private append operator
      const expr = [[T.append, " "], y.expr, [[T.text, x]]]
      return { ops: y.ops, name:y.name, expr }
    }

    // ### Attributes

    case T.collate: 
      for (let i=1,l=expr.length; i<l; i++) { // Type check
        switch (expr[i][0][0]) {
          case T.assign: case T.unquoted: break
          default: throw new TypeError ('Invalid attribute expression')
        }
      }
      return expr

    case T.unquoted: case T.valueIn: case T.keyIn:
      return expr

    case T.stringIn:
      return [[expr[0][0], x]]

    case T.assign: { // assert additional type constraints
      const yop = y[0][0]
      if (x[0][0] !== T.unquoted) throw new TypeError ('Lhs of `=` must be an attribute name token')
      if (yop === T.assign)   throw new TypeError ('Rhs of `=` must not be an assignment')
      return [expr[0], x, y]
    }

    // ### Strings

    case T.strChars:  return data
    case T.escape:    return _escapes [data]
    case T.empty:     return ''
    case T.hexescape: return String.fromCodePoint (parseInt (data.substr(2), 16))
    case T.strCat:    return x + y

    default:
      throw new TypeError (`compile: unknown operator type: ${tag} ${N[tag]}`)
  }
}

module.exports = { preEval, bindDefs }
