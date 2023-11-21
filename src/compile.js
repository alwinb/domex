import { nodeTypes as T, typeNames as N } from './signature.js'
import { typeMask } from './hoop2.js'
const log = console.log.bind (console)

// `preEval` Algebra
// =================

// This is a first-pass transformation that is applied incrementally
// during the parsing process. It is specified in terms of an algebra for
// the low-level AST as produced by the parser, and converts it to a 
// slightly simplified and restricted AST structure.

// This pass can be seen as a kind of syntactic desugaring and slight
// pre-evaluation (for instance, evaluating string literals).

// It applies the 'stack of postfix operators' ops
// and if named, add a binary 'let _ in _' operator akin to
// let/name = expr1 in expr2

// (REVIEW, I want to further restrict the allowed order of the 
// postfix/modifier operators to make sure that attributes are
// always bound to the same object to which their owner element
// gets bound, or to a descendent object thereof.

function bindDefs ({ expr, ops, name }) {
  if (ops) { let o, l
    for (o = ops; o [l = o.length - 1] != null; o = o[l]);
    o[l] = expr
    expr = ops
  }
  if (name != null)
    expr = [[T.letin, name], expr, [[T.deref, name]]]
  return expr
}

const _escapes =
  { 'b':'\b','f':'\f','n':'\n','r':'\r','t':'\t' }


// The Algebra
// -----------

function preEval (...expr) {
  // log ('preEval', expr)
  const [[opcode, opdata], lhs, rhs] = expr
  switch (opcode) {

    // ### Dom operands

    case T.group: // replace `()` group with contents
      return lhs // { expr: bindDefs (lhs) }

    case T.text:
      return { expr:[[T.text, lhs]], ops:null, name:null }

    case T.elem:
    case T.key:
    case T.deref:
      return { expr, ops:null, name:null }

    case T.value: { // Split e.g. %foo into %~foo
      const ref = [[T.value, '%']]
      let ops = opdata.length > 1 ? [[T.bind, '~' + opdata.substr(1)], null] : null
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
          const name = _expr[0][1] .substr (1)
          lib[name] = _expr [1] // store the body only
        }
        // TODO throw on name clashes
      }
      const last = expr[l]
      return { expr: [[T.withlib, lib], last.expr], name:last.name, ops:last.ops } 

    case T.descend: {
      const op = [T.descend, opdata]
      const _expr = [op, lhs.expr, bindDefs (rhs)]
      return { expr: bindDefs ({ ops:lhs.ops, expr:_expr, name:lhs.name }) }
    }

    // ### Dom operators (postfix)

    case T.def:
      if (lhs.name != null)
        throw new Error (`expression ${opdata} is already named ${name}`)
      return { name:opdata, expr:lhs.expr, ops:lhs.ops }

    case T.iter:
      return { ops:[expr[0], lhs.ops], name:null, expr:lhs.expr }

    case T.bind: case T.bindi: // REVIEW should bind distribute over defs or not?
    case T.test: case T.ttest:
    case T.class: case T.hash:
      return { ops:[expr[0], lhs.ops], name:lhs.name, expr:lhs.expr }

    case T.attr: { // 'add attributes': higher order postfix operator
      switch (lhs[0][0]) {
        case T.unquoted: case T.collate: case T.assign: break
        default: throw new TypeError ('Invalid attribute expression')
      }
      return { ops:[expr[0], lhs, rhs.ops], name:rhs.name, expr:rhs.expr }
    }

    // ### Dom append operators -- convert postfix to private infix

    case T.addtext: { // wrapfix-postfix
      const expr = [[T.append, " "], rhs.expr, [[T.text, lhs]]]
      return { ops: rhs.ops, name:rhs.name, expr }
    }

    case T.addkey: {
      const expr = [[T.append, " "], lhs.expr, [[T.key, '$']]]
      return { ops: lhs.ops, name:lhs.name, expr }
    }

    case T.addvalue:
    case T.addvaluei: {
      let vexpr = [[T.value, opdata]]
      if (opdata.length > 1) vexpr = [[T.bind, '~'+opdata.substr(1)], vexpr]
      const expr = [[T.append, " "], lhs.expr, vexpr]
      return { ops: lhs.ops, name:lhs.name, expr }
    }

    // ### Attributes
    
    // This evaluates the lower-level hoop AST for attribute lists that
    // consists of attribute names, attribute value-expressions, assignment
    // and collate (ie. attribute-list concatenation). 
    // It also checks the AST node types, so make sure that the 
    // assignment operators are not nested inside each other and that
    // the left operand is always an attribute-name.

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
      return [[expr[0][0], lhs]]

    case T.assign: { // assert additional type constraints
      const yop = rhs[0][0]
      if (lhs[0][0] !== T.unquoted) throw new TypeError ('Lhs of `=` must be an attribute name token')
      if (yop === T.assign)   throw new TypeError ('Rhs of `=` must not be an assignment')
      return [expr[0], lhs, rhs]
    }

    // ### Strings
    
    // This evaluates the hoop AST for strings, which consist of 
    // raw character rdata, the empty string, escape sequeces and 
    // a concatenation operator; to a javascript string.

    case T.strChars:  return opdata
    case T.escape:    return _escapes [opdata[1]] || opdata[1]
    case T.empty:     return ''
    case T.hexescape: return String.fromCodePoint (parseInt (opdata.substr(2), 16))
    case T.strCat:    return lhs + rhs

    default:
      throw new TypeError (`compile: unknown operator type: ${opcode} ${N[opcode]}`)
  }
}


// Exports
// -------

export { preEval, bindDefs }
