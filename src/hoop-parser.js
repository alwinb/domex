const log = console.log.bind (console)
const Symbols = new Proxy ({}, { get:(_,k) => Symbol (k) })

// Generic Higher Order Operator Precedence Parser 
// ===============================================

// Parser builder
// --------------

// ### Token 'roles'

const {
  PRE, POST, ERR_PRE, ERR_POST, // Before value, after value, error in 
  START, END, SKIP, LEAF, PREFIX, POSTFIX, INFIX } = Symbols // Token Roles

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
// lexer     - an object { pre, post }, both of which regexes
// tokenRole - a function that maps a token to a role as above
// precedes  - a function (t1, t2) that returns true if t1 has higher precedence than t2,
//           -- or equal precedence and is left-associative.
// collapse  - a function that 'collapses' a nested term into a (compound-) token.
//           -- thus it the above functions must accept the result and provide info on it.

// ### Parser

function Parser (S0, lexerFor, tokenRole, precedes, group, E0) { 
  const context = []    // stack of shunting yards
  let state     = PRE   // current lexer-state
  let token     = S0    // current input token (or node)
  let role      = START // tokenTole (token)
  let position  = 0     // current input position
  let line      = 1     // current input line
  let lastnl    = 0     // position of last newline
  let opener, ops, builds, lexer // ref-cache into the current shunting yard

  this.parse = parse
  return this

  /* where */

  function parse (input) { do {

    // ### Lexer

    if (token == null) {
      const regex = state === PRE ? lexer.pre : lexer.post
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

    role = tokenRole (token, state)

    // Operator - Apply operators of higher precedence
    let l = (role === LEAF || role === START || role === SKIP) ? -1 : ops.length-1
    for (; l >= 0; l--) {
      const op = ops[l]
      const cmp = role === END || precedes (op, token)
      if (!cmp) break
      const arity = tokenRole (op, state) === INFIX ? 2 : 1
      const i = builds.length - arity
      builds[i] = [ops.pop(), ...builds.splice (i, arity)]
    }

    // END - Collapses the shunting yard into a 'token'
    if (role === END) {
      context.pop ()
      token = group (opener, builds[0], token);
      role = tokenRole (token, state)
      if (!context.length) return token;
      ({ opener, ops, builds, lexer } = context [context.length-1])
      continue
    }

    // START - Create a new shunting yard
    // TODO this should store the state? to prevent 
    // tokenRole from returning something invalid?
    else if (role === START) { 
      opener = token
      ops    = []
      builds = []
      lexer  = lexerFor (token, context)
      context.push ({ opener, ops, builds, lexer })
      state = PRE
    }

    else if (role === LEAF) { // TODO Err if state is post
      builds.push (token)
      state = POST
    }

    else if (role === POSTFIX) { // TODO Err if state is pre
      const i = builds.length-1
      builds[i] = [token, builds[i]]
      state = POST
    }

    else if (role === PREFIX || role === INFIX) { // Err if state is pre
      ops[ops.length] = token
      state = PRE
    }

    token = null

  } while (1) }

}

Object.assign (Parser, { START, END, SKIP, LEAF, PREFIX, POSTFIX, INFIX })


// Exports
// =======

module.exports = { Parser }
