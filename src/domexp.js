/* domexp module */ (() => {

const { defineProperty:define } = Object
const log = console.log.bind (console)

// Dom Expression Language
// =======================

// Parser
// ------

// Lexer/ states

const atom = /([\n\t\f ]+)|([a-zA-Z][a-zA-Z0-9_\-]*|[(])/y
const afterAtom = /([\n\t\f ]+)|([+|>)]|[*]|:=|(?:[#@.][a-zA-Z]|[$%?][a-zA-Z]?)[a-zA-Z0-9_\-]*)/y

// Operator table

const unary = Array.from ('*.#@$%?') .reduce ((a, x) => (a[x] = 1, a), {})
const infix = { '>':1, '+':2, '|':1, ':=':0 }

// Operator Precedence Parser

function parse (string) {
  // lexer state
  let state = atom
  let lastIndex = 0, done = false
  state.lastIndex = 0

  // parser state
  const root = ['#root']
  let coterm = root, ops = []
  const context = [{ coterm, ops }]

  do {
    // log ('LOOP', JSON.stringify ({ coterm, ops }))
    state.lastIndex = lastIndex
    const match = state.exec (string)

    if (match) {
      lastIndex = state.lastIndex
      if (match[1] != null) continue // skip whitespace
      const token = match[2]
      //log (token, lastIndex)

      if (token === '(') { // START tokens
        coterm.push (coterm = ['()'])
        ops = []
        context[context.length] = { coterm, ops }
        state = atom
      }

      else if (token[0] in unary) {
        // can merge with infix..
        // however right now postfix bind strongest anyway
        const l = coterm.length-1
        coterm[l] = [token, coterm[l]]
        state = afterAtom
      }

      else if (token in infix) { // INFIX tokens
        for (let op, l = ops.length-1; l>=0 && infix[(op = ops[l])] >= infix[token]; l--) {
          const i = coterm.length-2
          coterm[i] = [ops.pop(), ...coterm.splice (i, 2, [])]
        }
        ops[ops.length] = token
        state = atom
      }

      else if (token !== ')') { // LEAF tokens
        coterm[coterm.length] = token
        state = afterAtom
      }
    }

    // END tokens and EOF
    if (!match || !lastIndex || (token = match[2] === ')')) {
      // TODO check balance!
      for (let l = ops.length-1; l>=0; l--) {
        const i = coterm.length-2
        coterm.splice (i, 2, [ops.pop(), coterm[i], coterm[i+1]])
      }
      if (--context.length)
        ({ coterm, ops } = context[context.length-1])
    }
  }
  while (context.length)

  if (lastIndex < string.length)
    throw new SyntaxError (`Invalid dom-expression "${string}"`)
  //log (JSON.stringify (root, null, 0))
  return root
}


// Evaluator
// =========

// Dom

const createElement = 'document' in globalThis
  ? document.createElement.bind (document) :
  function createElement (tagName) {
    const elem = { tagName:String(tagName).toLowerCase(), class:[], childNodes:[] }
    define (elem, 'append', { value: (...nodes) => elem.childNodes.splice (Infinity, 0, ...nodes) })
    define (elem, 'lastChild', { get: () => elem.childNodes[elem.childNodes.length-1] })
    define (elem, 'classList', { get: () => ({ add (item) { elem.class.push (item) } }) })
    return elem
  }

// Eval

function build (expr, input) {
  const refs = Object.create (null)
  const ids = new WeakMap ()
  let last
  const elems = eval (expr, input, '') || []
  return { elem:elems[0]||null, elems , refs }

  function eval (expr, input, key) {
    if (typeof expr === 'string') {
      if (expr[0] <= 'Z') {
        log ('domexp defs not yet implemented')
      }
      else last = createElement (expr)
      return [last]
    }

    // log (expr)
    const [op, _l, _r] = expr
    if (op === ':=') null

    if (op === '#root') {
      return eval (_l, input, key)
    }

    if (op === '>') {
      const [ls, l] = [eval (_l, input, key), last]
      if (!ls) return null
      const rs = eval (_r, input, key)
      if (rs) {
        l.append (...rs)
        return ls
      }
    }

    if (op === '+') {
      const [ls, l] = [eval (_l, input, key), last]
      if (!ls) return eval (_r, input, key)
      const rs = eval (_r, input, key)
      if (!rs) return ls
      return (ls.splice (Infinity, 0, ...rs), ls)
    }

    if (op === '|') {
      return eval (_l, input, key) || eval (_r, input, key)
    }

    const c = op[0]
    if (c  === '?') {
      const test = handlers.test (input, op.substr(1))
      return test ? eval (_l, input, key) : null
    }

    if (c  === '*') {
      let nodes = []
      for (let [k, v] of handlers.iter (input)) {
        const ls = eval (_l, v, k)
        if (ls) nodes = nodes.concat (ls)
      }
      return nodes.length ? nodes : null
    }

    const ls = eval (_l, input, key)
    if (ls) {
      if (c  === '%') {
        const value = op === c ? input : input [op.substr(1)]
        last.append (value == null ? '' : String (value))
      }
      if (c === '$') last.append (String (key))
      if (c === '@') refs [op.substr (1)] = last
      if (c === '.') last.classList.add (op.substr (1))
      if (c === '#') last.id = op.substr (1)
      return ls
    }
    return null
  }
}

const handlers = {
  test: (input, name) => typeof input === name,
  iter: function* (ref) { for (let k in ref) yield [k, ref[k]] },
}

function dom (string, input, decompose = handlers) {
  const { elems } = build (parse (string), input, decompose)
  if (elems.length > 1) throw new Error ('multiple root emmet-like expression')
  return elems[0]
}


// Api
// ---

class DomExp {
  constructor (source) {
    this.source = source
    define (this, 'ast', { value: parse (source), enumerable:false })
  }
  render (input) {
    return build (this.ast, input)
  }
}

DomExp.symbol = Symbol ('DomExp.symbol')

// Tagged templates

function dom (...args) { 
  let domexp = new DomExp (String.raw (...args))
  return data => domexp .render (data)
}


// Exports
// -------

const exports = { DomExp, dom, parse }
log (exports)
if (globalThis.window) {
  window.modules = window.modules || { }
  window.modules.domexp = exports
}
else
  module.exports = exports

/* end domexp module */ })()