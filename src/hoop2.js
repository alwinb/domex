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
const roleMask = 0b111111111 // nine bits
const typeMask = ~roleMask

const token = (...source) => (role, ...info) =>
  [String.raw (...source) .replace (/\s+/g, ''), (typeId++ << 9) | role, ...info]

const tokenType = () => ['', typeId++ << 9] // HACK to produce typeIds, for now

// ### Tokens Roles
// Using bitflags for the token roles. 

const FlagsOnto = (map = {}, start = 0) =>
  new Proxy ({}, { get:($,k) => map [k] || (map[k] = 1 << start++) })

const Roles = { }
const { START, END, SKIP, LEAF, ASSOC, INFIX, PREFIX, POSTFIX, GROUP } = FlagsOnto (Roles)

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
  const type = (typeId++ << 9) | role | GROUP

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
  if (type & (PREFIX | INFIX | ASSOC | POSTFIX))
    this.precedence = precedence

  Object.defineProperties (this, {
    Before: { value: oneOf (befores) },
    After: { value: oneOf (afters) }
  })
}


// Runtime
// -------

const PRE = Symbol ('PRE '), POST = Symbol ('POST')
const _ER = /([^\n]{0,80})/ys

function Parser (lexers, S0, E0, apply = (...args) => args) { 
  let position  = 0     // current input position
  let line      = 1     // current input line
  let lastnl    = 0     // position of last newline
  let state     = PRE   // current lexer-state
  let token     = S0    // possible current input token + info (or node)
  let group     = null  // possible higher order token returned from last call
  const context = []    // stack of shunting yards
  let opener, ops, builds // ref-cache into the current shunting yard
  let lexer = lexers[S0[2]] // likewise // this is a bit hacky, REVIEW

  this.parse = parse
  return this

  /* where */

  function precedes (tok1, tok2) { // [type, value, precedence]
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
          _ER.lastIndex = lastnl
          const snip = _ER.exec (input)[1]
          throw new SyntaxError (`Invalid DOM expression. ` +
            `At line ${line}:${position - lastnl}:\n\n` +
            `\t\t${snip}\n` +
            `\t\t${'^'.padStart(position - lastnl + 1)}`)
        }
        token = E0
      }
      else if (token[1] === '\n')
        (line++, lastnl = position + 1)
      position = regex.lastIndex
    }
  
    // ### Parser

    // token :: [type+role, value, info]
    const role = group ? group[0][0] : token[0] 
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
      const arity = op[3]
      const i = builds.length - arity
      op.length = 2 // remove precedence/ arity info
      builds[i] = apply (op, ...builds.splice (i, arity))
    }

    // END - Collapses the shunting yard into a 'token'

    if (role & END) {
      context.pop ()
      token = [[lexer.type, opener[1] + token[1]], builds[0]];
      group = token
      if (!context.length) return apply (...token)
      // add precedence info
      if (lexer.type & (PREFIX | INFIX | ASSOC | POSTFIX)) token.push (lexer.precedence)
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
      builds[builds.length] = group ? apply (...group) : apply (token)
      state = POST
    }

    else if (ops.length && (role & ASSOC) && token[0] === ops[ops.length-1][0]) {
      ops[ops.length-1][3]++ // increment the arity
      state = PRE
    }

    else if (role & (PREFIX | INFIX | ASSOC)) { // Err if state is Before
      ops[ops.length] = token // op :: [type+role, value, precedence, arity]
      token[3] = token[0] & PREFIX ? 1 : 2 // arity
      state = PRE
    }

    else if (role & POSTFIX) { // TODO Err if state is Before
      const i = builds.length-1
      token.length = 2 // remove precedence/ arity info
      if (typeof token[0] !== 'number') // NB flattening HOOP
        builds[i] = apply (...token, builds[i])
      else
        builds[i] = apply (token, builds[i])
      state = POST
    }

    group = token = null

  } while (1) }

}


// Exports
// =======

module.exports = { compile, Parser, Roles, token, tokenType, roleMask, typeMask }