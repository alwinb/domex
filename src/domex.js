const log = console.log.bind (console)
const raw = (...args) => String.raw (...args)
const { Parser } = require ('./hoop-parser')
const { assign, setPrototypeOf:setProto } = Object
const { START, END, SKIP, LEAF, INFIX, PREFIX, POSTFIX } = Parser

// Domex Parser
// ============

// Lexer
// -----
// 'Before' -- before an item / after an infix op
// 'After'  -- after an item / before an infix op

const regex = (...args) =>
  new RegExp (String.raw (...args) .replace (/\s+/g, ''), 'ys')

const skip = raw `
    ( [\t\f\x20]+ | // [^\n]* )
    | ( [\n] )`

const InTree = {
  Before: regex `
    ${ skip } | 
    ( [a-zA-Z] [a-zA-Z0-9_\-]*
    | [(] )`,

  After: regex `
    ${ skip } | 
    ( [+;|>)]
    | ["] [^"]* ["]
    | [\[]
    | [#@.] [a-zA-Z]  [a-zA-Z0-9_\-]*
    | [$%?*~] [a-zA-Z]? [a-zA-Z0-9_\-]* )` // FIXME start with alpha always
}

// TODO proper string escapes
const InAttr = {
  Before: regex `
    ${ skip } | 
    ( [a-zA-Z]+
    | ["] [^"]* ["]
    | [$%] [a-zA-Z]? [a-zA-Z0-9_\-]*)`, 

  // TODO emit implicit concat operator; use lookahead?
  // or hack it for now and implement =value as a postfix op?
  // (or the other way around, foo= as a prefix op)
  After: regex `
    ${ skip } | 
    (=|])`,
}

// WIP add quoted strings
// const InString = {
//   Before: regex `\n | [^"\\]+ | \][nt]? | .{0}`,
//   After: `(["] | .{0})` // END, string-concat
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
    return _attrOps [t[0]] || [LEAF]
  }
}

const precedes = (t1, t2, { lexer }) => { // Ugh
  const optable = lexer === InTree ? _optable : _attrOps

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
  '~': [ POSTFIX, 9],
  '.': [ POSTFIX, 9],
  '#': [ POSTFIX, 9],
  '@': [ POSTFIX, 9],
  '$': [ POSTFIX, 9],
  '%': [ POSTFIX, 9],
  '?': [ POSTFIX, 9],
  '"': [ POSTFIX, 9],
  ';': [   INFIX, 10],
  '+': [   INFIX, 3],
  '>': [   INFIX, 3],
  '|': [   INFIX, 2],
}

const _attrOps = {
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

// ### Default Analyser

const _typeof = input =>
    input === null ? 'null'
  : Array.isArray (input) ? 'array'
  : typeof input

const handlers = {
  get: (name, input) => input && typeof input === 'object' ? input [name] : null,
  test: (name, input, _type) => 
    _type === 'object' && 'type' in input ? name === input.type : name === _type,
  iter: function* (ref) { for (let k in ref) yield [k, ref[k]] },
}


// Evaluator
// ---------

const componentSymbol = Symbol ('DomEx.component')
const modelSymbol = Symbol ('DomEx.model')
const scopeSymbol = Symbol ('DomEx.scope')
const keySymbol = Symbol ('DomEx.key')

// ### Eval

function lastElem (items) {
  for (let i=items.length-1; i>=0; i--)
    if ('tagName' in items[i]) return items[i]
  return null
}

const Builder = (createElement, DomEx) =>
function build (expr, input, key, lib) {

  const refs = Object.create (null)
  const subs = Object.create (null)
  // const ids = new WeakMap ()
  const scope = { input, key, subs }
  scope.elems = eval (expr, scope)
  scope.elem = scope.elems[0]||null
  return scope
  /* where */

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
  // opts -- options -- 
  function eval (expr, scope, opts = {}) {
    const { input, key, subs } = scope

    // Atoms: tagname and Reference

    if (typeof expr === 'string') {

      // Reference
      if (expr[0] <= 'Z') {
        const ref = lib[expr]
        if (ref == null || typeof ref !== 'object' || !(ref instanceof DomEx))
          throw new Error ('DomEx: '+expr+' is not defined.')
        const subcomponent = ref.render (input, lib, key)
        // const subcomponent = build (lib[expr].ast, input, key, lib)
        // merge subs // man I'm making a MESS
        for (let k in subcomponent.subs)
          subs[k] = subs[k] ? subs[k].concat (subcomponent.subs[k]) :subcomponent.subs[k]
        return subcomponent.elems
      }

      // Single element
      const elem = createElement (expr)
      return [elem]
    }

    const [op, _l, _r] = expr
    const c = Array.isArray(op) ? '[' : op[0]

    // Special Forms - (Non-algebraic evaluation)

    if (c  === '?') {
      const test = handlers.test (op.substr(1), input, _typeof (input))
      return test ? eval (_l, scope, opts) : []
    }

    if (c  === '~') {
      let k = op.substr(1)
      const v = handlers.get (k, input);
      const scope = { input:v, key:k, subs:Object.create (null) };
      scope.elems = eval (_l, scope, { context:'~' }) // model boundary
      ;(subs[k] || (subs[k] = [])) .push (scope)
      for (let elem of scope.elems) {
        elem[modelSymbol] = input
        elem[scopeSymbol] = scope
      }
      return scope.elems
    }

    if (c  === '*') {
      let nodes = []
      const value = op === c ? input : handlers.get (op.substr(1), input)
      // ok now if c derefs, then also should create a new scope already
      // that means though that its possible for the scope boundaries to coincode? YEs
      const listSubs = Object.create (null)
      const parentScope = { input, key, subs:listSubs }
      for (let [k, v] of handlers.iter (value)) {
        // todo if * destructures then create another boundary eh
        const scope = { input:v, key:k, subs:Object.create (null), parentScope }
        scope.elems = eval (_l, scope, { context:'*' })
        for (let elem of scope.elems) {
          elem[modelSymbol] = v
          elem[scopeSymbol] = scope
          nodes.push (elem) // and collect it in the parent
          ;(listSubs[k] || (listSubs[k] = [])) .push (scope)
        }
      }
      parentScope.elems = nodes
      // TODO add to subs // man am I making a mess ;)
      return nodes
    }

    // Algebraic
    
    // TODO support for ; and &

    let last
    const ls = eval (_l, scope, opts)
    if (c === '(') return ls
    if (c === '+') return ls.concat (eval (_r, scope, opts))
    if (c === '|') return ls.length ? ls : eval (_r, scope, opts)

    if ((last = lastElem (ls))) {

      if (c === '>') {
        last.append (...eval (_r, scope, opts))
        return ls
      }

      else if (c === '.') last.classList.add (op.substr (1))
      else if (c === '#') last.setAttribute ('id', op.substr (1))
      else if (c === '[') {
        const attr = evalAtt (op[1], input, key)
        last.setAttribute (...attr)
      }

      else if (c === '$') last.append (String (key))
      else if (c === '"') last.append (String (op.substr (1, op.length -2)))
      else if (c  === '%') {
        const value = op === c ? input : handlers.get (op.substr(1), input)
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

    render (input, lib, key = '') {
      // private component state
      let elem, elems, subs, model, state = 'init' // init|rendered for now

      const component = {
        get elem ()  { return elems[0] || null },
        get elems () { return elems || (elems = []) },
        get subs () { return subs },
        get value () { return model },
        set value (input) { this.render (input) }
      }

      function render (input, k = key) {
        if (this.prepareData) input = this.prepareData (input, k)
        if (state === 'init' || !this.shouldUpdate || this.shouldUpdate (input, model)) {
          const elems0 = elems;
          ({ elem, elems, subs } = build (this.ast, input, k, lib));
          if (elems0 && elems0.length) {
            elems0[0].before (...elems)
            for (let x of elems0) x.remove ()
          }
          (state = 'rendered', model = input)
          for (let e of elems) {
            e[componentSymbol] = this // Hacking it for now
            e[scopeSymbol] = this // Hacking it for now
            // for (let type in handlers) e.addEventListener (type, handleEvent)
          }
          if (this.didRender) this.didRender ()
        }
        return this
      }
      const proto = setProto ({ render }, this)
      return setProto (component, proto) .render (input, key)
    }
  }

  const build = Builder (createElement, DomEx)
  DomEx.component = componentSymbol
  DomEx.model = modelSymbol
  DomEx.scope = scopeSymbol

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
