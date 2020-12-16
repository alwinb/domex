/* domexp module */ (() => {

const log = console.log.bind (console)
const raw = (...args) => String.raw (...args)

const define = (obj, arg2, arg3) => typeof arg2 === 'string'
  ? Object.defineProperty (obj, arg2, arg3)
  : Object.defineProperties (obj, arg2)


// Dom Expression Language
// =======================

// Parser
// ------

// ### Lexer/ states
// 'pre'  -- before an item / after an infix op
// 'post' -- after an item / before an infix op

const regex = (...args) =>
  new RegExp (String.raw (...args) .replace (/\s+/g, ''), 'y')

const skip = raw `
    ( [\t\f\x20]+ | // [^\n]* )
    | ( [\n] )`

// Allright, there will be multiple lexers now,
// depending on the context -- which gets selected by start tokens.

const InGroup = {
  pre: regex `
    ${ skip } | 
    ( [a-zA-Z] [a-zA-Z0-9_\-]*
    | [(] )`,

  post: regex `
    ${ skip } | 
    ( [+|>)]
    | :=
    | [{] [^}]* [}]
    | [\[]
    | [#@.]  [a-zA-Z]  [a-zA-Z0-9_\-]*
    | [$%?*] [a-zA-Z]? [a-zA-Z0-9_\-]* )`
}

const InAttr = {
  pre: regex `
    ${ skip } | 
    ([a-zA-Z]+)`,

  post: regex `
    ${ skip } | 
    (=|])`,
}


// ### Operator table

const unary = Array.from ('*.#@$%?{') .reduce ((a, x) => (a[x] = 1, a), {})
const starts = { '(':InGroup, '[':InAttr }
const ends = { ')':1, ']':1 }
const infix = { ':=':0, '|':1, '>':2, '+':2, '=':0 }

// a > b + c > d  =  a > (b + (c > d))
// a + b | c > d  =  (a + b) | (c > d)
// TODO decide on the precedence of the postfix operators

// ### Operator Precedence Parser

function parse (string) {
  // position and newline counter
  let lastIndex = 0, done = false
  let line = 1, lastnl = 0

  // current lexer and lexer state
  let lexer = InGroup
  let state = lexer.pre

  // parser state
  const root = ['#root']
  let coterm = root, ops = []
  const context = [{ coterm, ops, lexer }]

  do {
    log ('LOOP', JSON.stringify ({ coterm, ops }))
    state.lastIndex = lastIndex
    const match = state.exec (string)
    if (match) {
      log (JSON.stringify (match[0]))
      lastIndex = state.lastIndex

      // skip whitespace and count newlines
      if (match[1] != null) continue
      if (match[2] != null) { lastnl = lastIndex; continue }
      const token = match[3]

      if (token in starts) { // START tokens
        coterm.push (coterm = [token])
        ops = []
        context[context.length] = { coterm, ops, lexer }
        lexer = starts[token]
        state = lexer.pre
      }

      else if (token[0] in unary) {
        // can merge with infix..
        // however right now postfix bind strongest anyway
        const l = coterm.length-1
        coterm[l] = [token, coterm[l]]
        state = lexer.post
      }

      else if (token in infix) { // default to infix-right on same precedence
        for (let op, l = ops.length-1; l>=0 && infix[(op = ops[l])] > infix[token]; l--) {
          const i = coterm.length-2
          coterm[i] = [ops.pop(), ...coterm.splice (i, 2, [])]
        }
        ops[ops.length] = token
        state = lexer.pre
      }

      else if (!(token in ends)) { // LEAF tokens
        coterm[coterm.length] = token
        state = lexer.post
      }
    }

    // END tokens and EOF
    if (!match || !lastIndex || ((token = match[3]) in ends)) {
      log ('eof or end group', token)
      // TODO check balance!
      for (let l = ops.length-1; l>=0; l--) {
        const i = coterm.length-2
        coterm.splice (i, 2, [ops.pop(), coterm[i], coterm[i+1]])
      }
      if (--context.length) {
        ({ coterm, ops, lexer } = context[context.length-1])
        state = lexer.post
      }
    }
  }
  while (context.length)

  if (lastIndex < string.length)
    throw new SyntaxError (`Invalid dom-expression. At ${line}:${lastIndex - lastnl} before ${string.substr(lastIndex, 10)}`)
  return root
}


// Analyser
// --------

const _typeof = input =>
    input === null ? 'null'
  : Array.isArray (input) ? 'array'
  : typeof input

const handlers = {
  test: (name, input, _type) => 
    _type === 'object' && 'type' in input ? name === input.type : name === _type,
  iter: function* (ref) { for (let k in ref) yield [k, ref[k]] },
}



// Evaluator
// ---------

// ### Dom (sub-API)

const createElement = 'document' in globalThis
  ? document.createElement.bind (document) :
  function createElement (tagName) {
    const elem = { tagName:String(tagName).toLowerCase(), class:[], childNodes:[] }
    define (elem, {
      append:    { value: (...nodes) => elem.childNodes.splice (Infinity, 0, ...nodes) },
      lastChild: { get: () => elem.childNodes[elem.childNodes.length-1] },
      classList: { get: () => ({ add (item) { elem.class.push (item) }}) },
    })
    return elem
  }

const modelSymbol = Symbol ('DomExp.model')
const keySymbol = Symbol ('DomExp.key')

// ### Eval

function lastElem (items) {
  for (let i=items.length-1; i>=0; i--)
    if ('tagName' in items[i]) return items[i]
  return null
}

function build (expr, input, lib = {}) {
  const refs = Object.create (null)
  const ids = new WeakMap ()
  const elems = eval (expr, input, '')
  return { elem:elems[0]||null, elems , refs }

  function eval (expr, input, key) {
    if (typeof expr === 'string') {
      if (expr[0] <= 'Z') { // Reference
        const ref = lib[expr]
        if (ref == null || typeof ref !== 'object' || !(ref instanceof DomExp))
          throw new Error ('DomExp: '+expr+' is not defined.')
        return eval (lib[expr].ast, input, key)
      }
      // tagname
      const elem = createElement (expr)
      elem[modelSymbol] = input
      elem[keySymbol] = key
      return [elem]
    }

    const [op, _l, _r] = expr
    if (op === ':=') return [] // TODO

    if (op === '#root') {
      return eval (_l, input, key)
    }

    if (op === '>') {
      const ls = eval (_l, input, key)
      const last = lastElem (ls)
      if (last) last.append (...eval (_r, input, key))
      return ls
    }

    if (op === '+') {
      const ls = eval (_l, input, key)
      ls.splice (Infinity, 0, ...eval (_r, input, key))
      return ls
    }

    if (op === '|') {
      const ls = eval (_l, input, key)
      return ls.length ? ls : eval (_r, input, key)
    }

    const c = op[0]
    if (c  === '?') {
      const test = handlers.test (op.substr(1), input, _typeof (input))
      return test ? eval (_l, input, key) : []
    }

    if (c  === '*') {
      let nodes = []
      const value = op === c ? input : (input||{})[op.substr(1)]
      for (let [k, v] of handlers.iter (value))
        nodes = nodes.concat (eval (_l, v, k))
      return nodes
    }

    const ls = eval (_l, input, key)
    const last = lastElem (ls)
    if (last) {
      if (c  === '%') {
        const value = op === c ? input : input [op.substr(1)]
        last.append (value == null ? '' : String (value))
      }
      /*  key  */ if (c === '$') last.append (String (key))
      /* text  */ if (c === '{') last.append (String (op.substr (1, op.length -2)))
      /*  ref  */ if (c === '@') refs [op.substr (1)] = last
      /* class */ if (c === '.') last.classList.add (op.substr (1))
      /*  id   */ if (c === '#') last.id = op.substr (1)
      return ls
    }
    return []
  }
}


function dom (string, input, decompose = handlers) {
  const { elems } = build (parse (string), input, decompose)
  if (elems.length > 1) throw new Error ('multiple root emmet-like expression')
  return elems[0]
}


// DomExp API
// ----------

class DomExp {
  constructor (source) {
    this.source = source
    define (this, 'ast', { value: parse (source), enumerable:false })
  }
  render (input, lib) {
    return build (this.ast, input, lib)
  }
}

DomExp.model = modelSymbol
DomExp.key = keySymbol

// ### Tagged string literals

function dom (...args) { 
  let domexp = new DomExp (String.raw (...args))
  return data => domexp .render (data)
}


// Exports
// -------

const exports = { DomExp, dom, parse }
if (globalThis.window) {
  window.modules = window.modules || { }
  window.modules.domexp = exports
}
else
  module.exports = exports

/* end domexp module */ })()