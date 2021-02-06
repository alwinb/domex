const log = console.log.bind (console)
const hoop = require ('./hoop2.js')
const { token, tokenType } = hoop
const { START, END, LEAF, PREFIX, INFIX, ASSOC, POSTFIX, SKIP } = hoop.Roles

// Grammar for Domex
// -----------------

const tokens = {
  space:     token `[\t\f\x20]+` (SKIP), // TODO tag the roles in the rule compiler for operators also
  comment:   token   `// [^\n]*` (SKIP), 
  newline:   token        `[\n]` (SKIP), 

  elem:      token `[a-zA-Z] [a-zA-Z0-9_\-]*` (LEAF),
  attrName:  token `[a-zA-Z] [a-zA-Z0-9_\-]*` (LEAF),
  component: token `@ [a-zA-Z] [a-zA-Z0-9_\-]*` (LEAF),
  value:     token   `[%] [a-zA-Z0-9]*` (LEAF),
  key:       token   `[$]` (LEAF),

  start:     token   `[(]` (START),
  end:       token   `[)]` (END),

  strStart:  token   `["]` (START),
  strChars:  token   `[^0x00-0x19\\"]+` (LEAF),
  escape:    token   `[\\]["/\\bfnrt]` (LEAF),
  hexescape: token   `[\\]u[a-fA-F0-9]{4}` (LEAF),
  empty:     token   `.{0}` (LEAF),
  strCat:    token   `.{0}` (INFIX, 0), // could use ASSOC
  strEnd:    token   `["]` (END),

  descend:   token   `[>]` (INFIX, 3),
  append:    token   `[+]` (ASSOC, 3),
  orelse:    token   `[|]` (ASSOC, 2),
  declare:   token   `[;]` (ASSOC, 0), // TODO also allow it in postfix pos

  attrStart: token    `\[` (START),
  assign:    token   `[=]` (INFIX, 9),
  collate:   token   `.{0}(?![[=])` (ASSOC, 0),
  attrEnd:   token    `\]` (END),
  valueIn:   token   `[%] [a-zA-Z0-9]*` (LEAF),
  keyIn:     token   `[$]` (LEAF),

  class:     token   `[.] [a-zA-Z_\-] [a-zA-Z0-9_\-]*` (POSTFIX, 9),
  hash:      token   `[#] [a-zA-Z_\-] [a-zA-Z0-9_\-]*` (POSTFIX, 9),
  def:       token   `[@] [a-zA-Z] [a-zA-Z0-9]*` (POSTFIX, 9),

  test:      token   `[:] [a-zA-Z] [a-zA-Z0-9]*` (POSTFIX, 9),
  ttest:     token   ` :: [a-zA-Z] [a-zA-Z0-9]*` (POSTFIX, 9),
  bind:      token   `[~] [a-zA-Z] [a-zA-Z0-9]*` (POSTFIX, 9),
  iter:      token   `[*] [a-zA-Z0-9]*` (POSTFIX, 9),

  // Additional tags,
  // used by compile and eval

  text:      tokenType (),
  void:      tokenType (),
  letin:     tokenType (),
  withlib:   tokenType (),
  withdata:  tokenType (),
}

const T = tokens

// Now using an even more high level description for the grammar.
// The function $=>$.Tree (eg) is used to make references to
// other rules in the grammar (is handled by hoop compile).

// NB here already the ordering of the token regexes matters, hacking it now

const signature = {

  Tree: {
    name: 'Tree',
    start: T.start,
    skip: [ T.space, T.comment, T.newline ],
    operands: [ T.elem, T.component, $ => $.Tree, $ => $.String, T.value, T.key ],
    operators: [
      T.descend, T.append, T.orelse, T.declare,
      $ => $.Attr,
      T.class, T.hash, T.def,
      T.ttest, T.test, T.bind, T.iter ],
    end: T.end,
  },

  Attr: {
    name: 'Attr',
    role: POSTFIX,
    precedence: 9,
    start: T.attrStart,
    skip: [ T.space, T.comment, T.newline ],
    operands: [ T.attrName, T.valueIn, T.keyIn, $ => $.String ],
    operators: [ T.assign, T.collate ],
    end: T.attrEnd,
  },

  String: {
    name: 'String',
    role: LEAF,
    start: T.strStart,
    operands: [ T.strChars, T.escape, T.hexescape, T.empty ],
    operators: [ T.strCat ],
    end: T.strEnd,
  },

}


// Configuring the parser
// ----------------------

const signatures = hoop.compile (signature)

function parse (input, apply) {
  const S0 = signatures.Tree.Before.next ('(')
  const E0 = signatures.Tree.After.next (')')
  const p = new hoop.Parser (signatures, S0, E0, apply)
  return p.parse (input)
}


// Exports
// -------
const types = {}
for (let k in T) types[k] = T[k][1]
for (let k in signatures) types[k] = signatures[k].type

module.exports = { signatures, parse, tokenTypes:types, Roles:hoop.Roles }