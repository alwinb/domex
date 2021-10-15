const log = console.log.bind (console)

// HOOP Parser
// ===========

// 'Higher Order Operator Precedence Parser'
// :D

// Grammar Compiler
// ----------------

// ### Tokens and Token Types

// `token` is a template literal that returns a function.
// It is used to create token descriptions from a _raw_
// string, being the source of a RegExp, and a tokenRole and/ or
// additional info as arguments. 

// Tokens themselves are tuples (arrays)
// [[type, role, ...[precedence]], chunk].

// `rule` is used to specify higher order tokens/ in fact rules of
// a grammar format that is supported by the hoop parser. 

let typeId = 1
const roleMask = 0b111111111 // nine bits
const typeMask = ~roleMask

const token = (...source) => (role, ...info) =>
  [String.raw (...source) .replace (/\s+/g, ''), (typeId++ << 9) | role, ...info]

const tokenType = () => ['', typeId++ << 9] // HACK to produce typeIds, for now
const newTag = () => typeId++ << 9

// ### Tokens Roles
// Using bitflags for the token roles. 

const FlagsOnto = (map = {}, start = 0) =>
  new Proxy ({}, { get:($,k) => map [k] || (map[k] = 1 << start++) })

const Roles = { }
const { START, END, SKIP, LEAF, ASSOC, INFIX, PREFIX, POSTFIX, GROUP } = FlagsOnto (Roles)

const _token = role => (...source) =>
  [String.raw (...source) .replace (/\s+/g, ''), role]

const [start, atom, prefix, infix, assoc, postfix, end] = 
  [START, LEAF, PREFIX, INFIX, ASSOC, POSTFIX, END] .map (_token)

// const Token = { start, atom, prefix, infix, assoc, postfix, end }

// ### Lexer compiler

// `oneOf` compiles a list of token-descriptions to a RegExp that
// has an added additional method 'next (string, startpos = 0)`, to
// return `null` if no next token can be produced,
// or a token otherwise. 

function oneOf (tokens) {
  const regex = ''
  const infos = []
  const r = new RegExp (tokens.map (([src, type, ...info]) => (infos.push ({ type, info }), `(${src})`)) .join ('|'), 'ys')
  r.infos = infos
  Object.defineProperty (r, 'next', { value:next })

  function next (str, pos) {
    this.lastIndex = pos
    const match = this.exec (str)
    if (!match) return null
    let i = 1; while (match[i] == null) i++
    const { type, info } = infos[i-1]
    return [type, match[i], ...info]
  }
  return r
}

function compile (grammar) {
  const lexers = {}, types = {}
  for (const ruleName in grammar) {
    const r = grammar[ruleName]
    const { types:_types, lexer } = compileRule (ruleName, r, grammar)
    lexers [ruleName] = lexer
    types [ruleName] = _types
  }
  return { lexers, types }
}

// Two- state lexer for hoop grammars,
// compiled from a single 'rule'

function compileRule (ruleName, rule, grammar) {
  const { end, skip = {}, sig = [] } = rule
  const befores = [], afters = []
  const types = {}

  for (const k in skip) {
    const x = skip[k]
    befores.push ([x, SKIP])
    afters.push ([x, SKIP])
  }
  afters.push ([end[0], END])

  for (let i=0, l=sig.length; i<l; i++) for (const k in sig[i]) {
    let def = sig[i][k]
    let t = newTag (), info = 0

    if (typeof def[0] === 'number') { // wrapfix operator (WIP -- add end too)
      const [role, s, name, end] = def
      types[k] = t | role | GROUP
      info = [s, t | START | role, i, name]
    }

    else {
      const [rx, role] = def
      types[k] = t |= role
      info = [rx, t]
      if (!(t & LEAF)) info[2] = i
    }

    if (info[1] & (PREFIX | LEAF)) befores.push (info)
    else afters.push (info) // default precedence
  }
  
  const name = ruleName
  const Before = oneOf (befores)
  const After = oneOf (afters)
  return { name, types, lexer: {name, Before, After}}
}


// Runtime
// -------

const PRE = Symbol ('PRE '), POST = Symbol ('POST')

function Parser (lexers, startToken, endToken, apply = (...args) => args) {

  let context // context/ costack
  let group, input // current input
  let position, line, lastnl // current input position
  let lexer, state // current lexer-state

  this.parse = parse
  return this

  // ### Init
  
  function init (_input) {
    const root = new ShuntingYard (startToken, lexers [startToken[3]])
    ; (context = [ root ])
    ; (position = 0, line = 1, lastnl = 0)
    ; (input = _input, group = null)
    ; (lexer = root.lexer, state = PRE)
    return root
  }

  // ### Lexer

  function nextToken () {
    const regex = state === PRE ? lexer.Before : lexer.After
    const token = regex.next (input, position)

    if (token == null) {
      // we are at the input end if err is false
      const err = position < input.length && regex.lastIndex < position
      if (err || state === PRE)
        throw new ParserError (input, position, line, lastnl)
      return endToken
    }
  
    else if (token[1] === '\n')
      (line++, lastnl = position + 1);
    
    position = regex.lastIndex
    return token
  }

  // ### Parser

  function parse (_input) {
    for (let group, { ops, builds } = init (_input); ;) {
    const token = group || nextToken ()
    const role = group ? group[0][0] : token[0] 

    /*
    let debug = []
    for (let k in Roles)
      if (role & Roles[k]) debug.push (k)
    debug = debug.join('|')
    log (debug, token, group)
    log ({ position, lastnl }, '\n')
    //*/

    // Operator -- first apply ops of higher precedence

    let l = role & (LEAF | START | SKIP) ? -1 : ops.length-1
    for (; l >= 0; l--) {
      // TODO I suspect that this breaks with HOOPs (ie 'groups' on ops stack)
      const item = ops[l] // either an op, or a hoop
      const op = typeof item[0] === 'number' ? item : item[0]
      const useStack = role & END || precedes (op, token)
      if (!useStack) break
      ops.length--
      const arity = op[3]
      const i = builds.length - arity
      op.length = 2 // remove precedence and arity info
      builds[i] = op[0] & GROUP
        ? apply (...item.concat (builds.splice (i, arity))) // flatten hoop
        : apply (item, ...builds.splice (i, arity))
    }

    // END - Collapses the shunting yard into a 'compound token'
    // and 'pushes it in front ot the input'.

    if (role & END) {
      group = context.pop () .collapse (token)
      if (!context.length) return apply (...group)
      else ({ ops, builds, lexer } = context [context.length-1])
      continue
    }

    // START - Create a new shunting yard
    // TODO this should store the state? to prevent 
    // tokenInfo from returning something invalid?

    if (role & START) { 
      // token :: [type, value, precedence, lexerName]
      const sy = new ShuntingYard (token, lexers [token[3]]);
      ({ ops, builds, lexer } = context [context.length] = sy)
      state = PRE
    }

    else if (role & LEAF) { // TODO Err if state is After
      builds[builds.length] = group ? apply (...group) : apply (token)
      state = POST
    }

    else if (ops.length && (role & ASSOC) && token[0] === ops[ops.length-1][0]) {
      // TODO how should ASSOC hoops work?
      ops[ops.length-1][3]++ // increment the arity
      state = PRE
    }

    else if (role & (PREFIX | INFIX | ASSOC)) { // Err if state is Before
      ops[ops.length] = token
      const op = role & GROUP ? token[0] : token // op :: [type|role, data, precedence, arity]
      op[3] = op[0] & PREFIX ? 1 : 2 // arity
      state = PRE
    }

    else if (role & POSTFIX) { // TODO Err if state is Before
      const i = builds.length-1
      if (role & GROUP) { // NB flattening HOOP
        token[0].length = 2 // remove precedence/ arity info
        builds[i] = apply (...token, builds[i])
      }
      else {
        token.length = 2 // remove precedence/ arity info
        builds[i] = apply (token, builds[i])
      }
      state = POST
    }

    group = null
  }}

}

// ### Parser Error

const _ER = /([^\n]{0,80})/ys

function ParserError (input, position, line, lastnl) {
  const p = Math.max (lastnl, position-80)
  _ER.lastIndex = lastnl
  const snip = _ER.exec (input)[1]
  return new SyntaxError (`Invalid expression. ` +
    `At line ${line}:${position - lastnl}:\n\n` +
    `\t\t${snip}\n` +
    `\t\t${'^'.padStart(position - lastnl + 1)}`)
}

// ### Operator Precedence

function precedes (tok1, tok2) { // [type, value, precedence]
  // log (tok1, tok2)
  const p1 = tok1[2], p2 = tok2[2]
  return p1 > p2 ? true
    : p1 === p2 && p1[0] & roleMask === POSTFIX ? true : false
}


// Shunting Yard
// -------------

class ShuntingYard {

  constructor (token, lexer) {
    this.opener = token
    this.lexer = lexer
    this.ops = []
    this.builds = []
  }
  
   collapse (token) {
    const [type, data1, precedence] = this.opener
    const arity = type & PREFIX ? 1 : type & INFIX|ASSOC ? 2 : 0
    // Construct a token with a HOOP; Unset the START bit and add the GROUP bit.
    const hoop = [type &~ START | GROUP, data1 + token[1]]
    if (arity) hoop.push (precedence, arity) // NB REVIEW
    return [hoop, this.builds[0]]
  }

}


// Exports
// =======

export {
  compile, Parser, Roles, token, tokenType, roleMask, typeMask,
  start, atom, prefix, infix, assoc, postfix, end
}