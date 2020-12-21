const log = console.log.bind (console)
const raw = (...args) => String.raw (...args)
const { Parser } = require ('./hoop-parser')
const { START, END, SKIP, LEAF, INFIX, PREFIX, POSTFIX } = Parser

// Domex Parser
// ============

// Lexer
// -----
// 'pre'  -- before an item / after an infix op
// 'post' -- after an item / before an infix op

const regex = (...args) =>
  new RegExp (String.raw (...args) .replace (/\s+/g, ''), 'ys')

const skip = raw `
    ( [\t\f\x20]+ | // [^\n]* )
    | ( [\n] )`

const InTree = {
  pre: regex `
    ${ skip } | 
    ( [a-zA-Z] [a-zA-Z0-9_\-]*
    | [(] )`,

  post: regex `
    ${ skip } | 
    ( [+|>)]
    | [{] [^}]* [}]
    | [\[]
    | [#@.]  [a-zA-Z]  [a-zA-Z0-9_\-]*
    | [$%?*] [a-zA-Z]? [a-zA-Z0-9_\-]* )` // TODO grammar change
}

// TODO proper string escapes
const InAttr = {
  pre: regex `
    ${ skip } | 
    ( [a-zA-Z]+
    | ["] [^"]* ["]
    | [$%] [a-zA-Z]? [a-zA-Z0-9_\-]*)`, 

  // TODO emit implicit concat operator; use lookahead?
  // or hack it for now and implement =value as a postfix op?
  // (or the other way around, foo= as a prefix op)
  post: regex `
    ${ skip } | 
    (=|])`,
}

// WIP add quoted strings
// const InString = {
//   pre: regex `\n | [^"\\]+ | \][nt]? | .{0}`,
//   post: `(["] | .{0})` // END, string-concat
// }


// Parser Config
// -------------

const lexerFor = t => _optable[t[0]][1]

const tokenInfo = (t, { lexer, state }) => {
  // if (typeof t !== 'string') return t[0] === '[]' ? POSTFIX : LEAF
  // NB just happens to 'magically' work for '[]' hoop
  if (lexer === InTree) {
    return _optable [t[0]] || [LEAF]
  }
  if (lexer === InAttr) {
    return _optable2 [t[0]] || [LEAF]
  }
}

const precedes = (t1, t2, { lexer }) => { // Ugh
  const optable = lexer === InTree ? _optable : _optable2

  t1 = typeof t1 !== 'string' ? t1[0] : t1
  t2 = typeof t2 !== 'string' ? t2[0] : t2
  // log ('precedes', t1, t2)
  const [r1, p1] = optable[t1]||optable[t1[0]]
  const [r2, p2] = optable[t2]||optable[t2[0]]
  const r = p1 > p2 ? true
    : p1 === p2 && r1 === POSTFIX ? true
    : false
  // log ('precedes', t1, t2, r)
  return r
}

const evalGroup = (start, x, end, state) => [start + end, x]

const _optable = {
  '\t': [ SKIP ],
  '\n': [ SKIP ],
  '/':  [ SKIP ],
  ' ':  [ SKIP ],

  '(':  [ START, InTree ],
  ')':  [ END ],
  '[':  [ START, InAttr ],
  '[]': [ POSTFIX, 9],

  '*': [ POSTFIX, 9],
  '.': [ POSTFIX, 9],
  '#': [ POSTFIX, 9],
  '@': [ POSTFIX, 9],
  '$': [ POSTFIX, 9],
  '%': [ POSTFIX, 9],
  '?': [ POSTFIX, 9],
  '{': [ POSTFIX, 9],
  '+': [   INFIX, 3],
  '>': [   INFIX, 3],
  '|': [   INFIX, 2],
}

const _optable2 = {
  '\t': [ SKIP ],
  '\n': [ SKIP ],
  '/':  [ SKIP ],
  ' ':  [ SKIP ],
  ']':  [ END ],
  '=':  [ INFIX, 0 ],
}

function parse (input) {
  const p = new Parser ('(', lexerFor, tokenInfo, precedes, evalGroup, ')' )
  return p.parse (input) [1]
}

// Evaluator
// =========

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

const modelSymbol = Symbol ('DomEx.model')
const keySymbol = Symbol ('DomEx.key')


// ### Eval

function lastElem (items) {
  for (let i=items.length-1; i>=0; i--)
    if ('tagName' in items[i]) return items[i]
  return null
}

function build (expr, input, lib = {}, createElement, DomEx) {
  const refs = Object.create (null)
  const ids = new WeakMap ()
  try {
    const elems = eval (expr, input, '')
    return { elem:elems[0]||null, elems , refs }
  }
  catch (e) {
    log (e, expr)
    throw new Error ('DomEx: error')
  }

  function evalAtt (expr, input, key) {
    // log ('evalAtt', input, key)
    if (typeof expr === 'string') {
      const c = expr[0]
      if (c === '$') return key
      if (c  === '%') return expr === c ? input : input [expr.substr (1)]
      if (c === '"') return expr.substr (1, expr.length-2)
      else return [expr, '']
    }

    const [op, _l, _r] = expr
    const c = op[0]
    if (c === '=') {
      const [op, _l, _r] = expr
      const c = op[0]
      // must be '=' for now, cause no other things are implemented yet
      // ... Alright, I need to do this properly...
      if (c === '=') {
        const r =  [_l, evalAtt (_r, input, key)]
        return r
      }
    }
  }

  // TODO I want to rewrite this into a loop
  
  function eval (expr, input, key) {

    // Atoms: tagname and Reference

    if (typeof expr === 'string') {
      if (expr[0] <= 'Z') { // Reference
        const ref = lib[expr]
        if (ref == null || typeof ref !== 'object' || !(ref instanceof DomEx))
          throw new Error ('DomEx: '+expr+' is not defined.')
        return eval (lib[expr].ast, input, key)
      }
      const elem = createElement (expr)
      elem[modelSymbol] = input
      elem[keySymbol] = key
      return [elem]
    }

    const [op, _l, _r] = expr
    const c = Array.isArray(op) ? '[' : op[0]

    // Special Forms - (Non-algebraic evaluation)

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

    // Algebraic
    
    let last
    const ls = eval (_l, input, key)
    if (c === '(') return ls
    if (c === '+') return ls.concat (eval (_r, input, key))
    if (c === '|') return ls.length ? ls : eval (_r, input, key)

    if ((last = lastElem (ls))) {

      if (c === '>') {
        last.append (...eval (_r, input, key))
        return ls
      }

      else if (c === '.') last.classList.add (op.substr (1))
      else if (c === '#') last.setAttribute ('id', op.substr (1))
      else if (c === '[') {
        const attr = evalAtt (op[1], input, key)
        last.setAttribute (...attr)
      }

      else if (c === '$') last.append (String (key))
      else if (c === '{') last.append (String (op.substr (1, op.length -2)))
      else if (c === '@') refs [op.substr (1)] = last
      else if (c  === '%') {
        const value = op === c ? input : input [op.substr(1)]
        last.append (value == null ? '' : String (value))
      }
      return ls
    }
    
    return []
  }
}


// DomEx API
// ----------

const DomExImpl = createElement => {

  class DomEx {
    constructor (source) {
      this.source = source
      Object.defineProperty (this, 'ast', { value: parse (source), enumerable:false })
    }
    render (input, lib) {
      return build (this.ast, input, lib, createElement, DomEx)
    }
  }

  DomEx.model = modelSymbol
  DomEx.key = keySymbol

  // ### Tagged string literals

  const domex = (...args) => new DomEx (String.raw (...args))

  function dom (...args) { 
    const domexp = new DomEx (String.raw (...args))
    return data => domexp .render (data)
  }


  return { DomEx, dom, domex, parse }
}


// Exports
// -------

module.exports = { DomExImpl, parse }

// var p = new Parser ('(', lexerFor, tokenInfo, precedes, collapse, ')' )
// // var tree = p.parse ('foo + bar + baz')
// var tree = p.parse (`a + b | c
// > d + d + e [s = foo]`) // fixme
// log (JSON.stringify (tree))