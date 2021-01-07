const log = console.log.bind (console)

// HOOP Parser
// ===========

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
const roleMask = 0b11111111
const typeMask = ~roleMask

const token = (...source) => (role, ...info) =>
  [String.raw (...source) .replace (/\s+/g, ''), (typeId++ << 8) | role, ...info]

// ### Tokens Roles
// Using bitflags for the token roles. 

const FlagsOnto = (map = {}, start = 0) =>
  new Proxy ({}, { get:($,k) => map [k] || (map[k] = 1 << start++) })

const Roles = { }
const { START, END, SKIP, LEAF, INFIX, PREFIX, POSTFIX, GROUP } = FlagsOnto (Roles)

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
  const lexers = {}
  for (let ruleName in grammar) {
    const r = grammar[ruleName]
    lexers [ruleName] = new Lexer (ruleName, r, grammar)    
  }
  return lexers
}


// Two- state lexer,
// compiled from a single 'rule'

function Lexer (ruleName, rule, grammar) {
  const befores = [], afters = []
  const { role = LEAF, start, end,
    skip = [], infix = [], operands = [], operators = [],
    precedence } = rule
  const type = (typeId++ << 8) | role | GROUP

  for (let x of skip) {
    befores.push ([x[0], SKIP])
    afters.push ([x[0], SKIP])
  }
  afters.push ([end[0], END, type, precedence])

  for (let x of operands) {
    if (typeof x === 'function') {
      const subrule = x (grammar)
      const s = subrule.start
      befores.push ([s[0], START, subrule.name])
    }
    else befores.push ([x[0], x[1]|LEAF])
  }

  for (let x of operators) {
    if (typeof x === 'function') {
      const subrule = x (grammar)
      const s = subrule.start
      x = [s[0], START, subrule.name]
    }
    const type = x[1]
    if (type & PREFIX) befores.push (x)
    else afters.push (x)
  }

  this.name = ruleName
  this.type = type
  if (type & (PREFIX | INFIX | POSTFIX))
    this.precedence = precedence

  Object.defineProperties (this, {
    Before: { value: oneOf (befores) },
    After: { value: oneOf (afters) }
  })
}


// Runtime
// -------

// TODO I want to push the limits of the hoop parser a bit further, adding 
// support for separator+terminators such as trailing commas by setting
// their role to INFIX | POSTFIX -- to mean INFIX until stuck (e.g. before END)
// and POSTFIX otherwise.

const PRE = Symbol ('PRE '), POST = Symbol ('POST')

function Parser (lexers, S0, E0) { 
  const context = []    // stack of shunting yards
  let state     = PRE   // current lexer-state
  let token     = S0    // current input token+info (or node)
  let group     = null  // token is a START-END group to be reused as 'token'
  let position  = 0     // current input position
  let line      = 1     // current input line
  let lastnl    = 0     // position of last newline
  let opener, ops, builds // ref-cache into the current shunting yard
  let lexer = lexers[S0[2]] // likewise // this is a bit hacky, REVIEW

  this.parse = parse
  return this

  /* where */

  function precedes (tok1, tok2) { // type, value, info=precedence
    // log (tok1, tok2)
    const p1 = tok1[2], p2 = tok2[2]
    return p1 > p2 ? true
      : p1 === p2 && p1[0] & roleMask === POSTFIX ? true : false
  }

  function parse (input) { do {

    // ### Token Producer

    if (group == null && token == null) {
      const regex = state === PRE ? lexer.Before : lexer.After
      token = regex.next (input, position)

      if (!token) {
        const err = position < input.length && regex.lastIndex < position
        const eof = !err
        if (err || eof && state === PRE) {
          const p = Math.max (lastnl, position-80)
          const snip = input.substr (p, 80)
          throw new SyntaxError (`Invalid DOM expression. ` +
            `At line ${line}:${position - lastnl}:\n\n` +
            `\t\t${snip}\n` +
            `\t\t${'^'.padStart(position - p + 1)}`)
        }
        token = E0
      }
      else if (token.value === '\n')
        (line++, lastnl = position + 1)
      position = regex.lastIndex
    }
  
    // ### Parser

    const role = group ? group[0][0] : token[0] // type|role, value, info
    const info = group ? group[0][2] : token[2]

    /*
    let debug = []
    for (let k in Roles)
      if (role & Roles[k]) debug.push (k)
    debug = debug.join('|')
    log (debug, token, group) //*/

    // Operator -- first apply ops of higher precedence

    let l = role & (LEAF | START | SKIP) ? -1 : ops.length-1
    for (; l >= 0; l--) {
      // TODO I suspect that this breaks with HOOPs (ie 'groups' on ops stack)
      const op = ops[l]
      const useStack = (role & END) || precedes (op, token)
      if (!useStack) break
      ops.length--
      const arity = op[0] & INFIX ? 2 : 1
      const i = builds.length - arity
      // log ('apply', op[2], arity, i)
      op.length-- // remove precedence info
      builds[i] = [op, ...builds.splice (i, arity)]
    }

    // END - Collapses the shunting yard into a 'token'
    if (role & END) {
      context.pop ()
      token = [[lexer.type, opener[1] + token[1]], builds[0]];
      group = token
      if (!context.length) return token;
      // add precedence info
      if (lexer.type & (PREFIX | INFIX | POSTFIX)) token.push (lexer.precedence)
      ;({ opener, ops, builds, lexer } = context [context.length-1])
      continue
    }

    // START - Create a new shunting yard
    // TODO this should store the state? to prevent 
    // tokenInfo from returning something invalid?

    if (role & START) { 
      opener = token
      ops    = []
      builds = []
      lexer  = lexers [info] // info == [type, START, lexer]
      context.push ({ opener, ops, builds, lexer })
      state = PRE
    }

    else if (role & LEAF) { // TODO Err if state is After
      builds.push (token)
      state = POST
    }

    else if (role & (PREFIX | INFIX)) { // Err if state is Before
      ops[ops.length] = token //, role, arity: role & INFIX ? 2 : 1 }
      state = PRE
    }

    else if (role & POSTFIX) { // TODO Err if state is Before
      const i = builds.length-1
      token.length-- // remove precedence info
      if (typeof token[0] !== 'number') // NB flattening HOOP here
        builds[i] = [...token, builds[i]]
      else
        builds[i] = [token, builds[i]]
      state = POST
    }

    group = token = null

  } while (1) }

}


// Exports
// =======

module.exports = { compile, Parser, Roles, token, roleMask, typeMask }