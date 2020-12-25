const log = console.log.bind (console)
const SymbolsOnto = map => new Proxy ({}, { get:($,k) => (map [k] = Symbol(k), map [k]) })

// Generic Higher Order Operator Precedence Parser 
// ===============================================

// Parser builder
// --------------

// ### Token 'roles'

const {
  PRE, POST, ERR_PRE, ERR_POST, // Before value, after value, error in 
  START, END, SKIP, LEAF, PREFIX, POSTFIX, INFIX } = SymbolsOnto (Parser)

// const verify = (state, role) =>
//   role === SKIP ? state :
//   state === PRE ?
//     ( role === LEAF    ? POST
//     : role === START   ? POST
//     : role === PREFIX  ? PRE : ERR_PRE )
//   : state === POST ?
//     ( role === INFIX   ? PRE
//     : role === POSTFIX ? POST : ERR_POST )
//   : state;

// ### Parser Configuration

// S0        - a 'file-start' token - must have role START
// E0        - a 'file-end' token - must have role END
// lexerFor  - a function that maps a START-token to a lexer
// lexer     - an object { Before, After }, both of which regexes
// tokenInfo - a function that maps a token to an array [ role, ...] as above
// precedes  - a function (t1, t2) that returns true if t1 has higher precedence than t2,
//           -- or equal precedence and is left-associative.
// collapse  - a function that 'collapses' a nested term into a (compound-) token.
//           -- thus it the above functions must accept the result and provide info on it.

// ### Parser

function Parser (S0, lexerFor, tokenInfo, precedes, group, E0) { 
  const context = []    // stack of shunting yards
  let state     = PRE   // current lexer-state
  let token     = S0    // current input token (or node)
  let info              // tokenTole (token, { lexer, state })
  let position  = 0     // current input position
  let line      = 1     // current input line
  let lastnl    = 0     // position of last newline
  let opener, ops, builds // ref-cache into the current shunting yard
  let lexer     = lexerFor (S0) // likewise // this is a bit hacky, REVIEW

  this.parse = parse
  return this

  /* where */

  function parse (input) { do {

    // ### Lexer

    if (token == null) {
      const regex = state === PRE ? lexer.Before : lexer.After
      regex.lastIndex = position
      const match = regex.exec (input)

      if (match) {
        //let i=0; while (match[i] == null) i++;
        token = match[0] // [i]
        if (token === '\n') (line++, lastnl = position + 1)
      }
      else {
        const err = position < input.length && regex.lastIndex < position
        const eof = !err
        if (err || eof && state === PRE) {
          const before = input.substr (position, 80)
          throw new SyntaxError (`Invalid expression in state ${String (state)}. \n\tAt ${line}:${position - lastnl} before \n\t${before}\n`)
        }
        token = E0
      }
      position = regex.lastIndex
    }
  
    // ### Parser

    info = tokenInfo (token, { lexer, state })
    const role = info [0]
    // log ([token])

    // Operator - Apply operators of higher precedence
    let l = (role === LEAF || role === START || role === SKIP) ? -1 : ops.length-1
    for (; l >= 0; l--) {
      const { token:op, arity } = ops[l]
      const cmp = role === END || precedes (op, token, { lexer })
      // log (cmp)
      if (!cmp) break
      // log ('apply', op, role, arity)
      ops.pop ()
      const i = builds.length - arity
      builds[i] = [op, ...builds.splice (i, arity)]
    }

    // END - Collapses the shunting yard into a 'token'
    if (role === END) {
      context.pop ()
      // log ('END', builds)
      token = group (opener, builds[0], token);
      info = tokenInfo (token, state)
      if (!context.length) return token;
      ({ opener, ops, builds, lexer } = context [context.length-1])
      continue
    }

    // START - Create a new shunting yard
    // TODO this should store the state? to prevent 
    // tokenInfo from returning something invalid?
    else if (role === START) { 
      opener = token
      ops    = []
      builds = []
      lexer  = lexerFor (token, context)
      context.push ({ opener, ops, builds, lexer })
      state = PRE
    }

    else if (role === LEAF) { // TODO Err if state is After
      builds.push (token)
      state = POST
    }

    else if (role === POSTFIX) { // TODO Err if state is Before
      const i = builds.length-1
      builds[i] = [token, builds[i]]
      state = POST
    }

    else if (role === PREFIX || role === INFIX) { // Err if state is Before
      ops[ops.length] = { token, role, arity:role === INFIX ? 2 : 1 }
      state = PRE
    }

    token = null

  } while (1) }

}


// Exports
// =======

module.exports = { Parser }
