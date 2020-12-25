const log = console.log.bind (console)
const hoop = require ('./hoop2.js')
const { token, rule } = hoop
const { START, END, LEAF, PREFIX, INFIX, POSTFIX, SKIP } = hoop.Roles

// Grammar for Domex
// -----------------

const tokens = {
  space:     token `[\t\f\x20]+` (SKIP),
  comment:   token   `// [^\n]*` (SKIP),
  newline:   token        `[\n]` (SKIP),

  elem:      token `[a-zA-Z] [a-zA-Z0-9_\-]*` (LEAF),
  attrName:  token `[a-zA-Z] [a-zA-Z0-9_\-]*` (LEAF),

  start:     token   `[(]` (START),
  end:       token   `[)]` (END),

  strStart:  token   `["]` (START),
  strChars:  token `[^"]+` (LEAF),
  empty:     token  `.{0}` (LEAF),
  strCat:    token  `.{0}` (INFIX, 0),
  strEnd:    token   `["]` (END),

  descend:   token   `[>]` (INFIX, 3),
  append:    token   `[+]` (INFIX, 3),
  orelse:    token   `[|]` (INFIX, 2),
  declare:   token   `[;]` (INFIX & POSTFIX, 0),

  attrStart: token    `\[` (START),
  assign:    token   `[=]` (INFIX, 9),
  attrNext:  token  `.{0}` (INFIX, 0),
  attrEnd:   token    `\]` (END),

  klass:     token   `[.] [a-zA-Z]+` (POSTFIX, 9),
  hash:      token   `[#] [a-zA-Z]+` (POSTFIX, 9),
  def:       token   `[@] [a-zA-Z]+` (POSTFIX, 9),

  test:      token   `[?] [a-zA-Z]+` (POSTFIX, 9),
  bind:      token   `[~] [a-zA-Z]+` (POSTFIX, 9),
  iter:      token   `[*] [a-zA-Z]*` (POSTFIX, 9),
  value:     token   `[%] [a-zA-Z]*` (POSTFIX, 9),
  key:       token   `[$]` (POSTFIX, 9),
}

const T = tokens
const types = {}
for (let k in T) types[k] = T[k][1]
// TODO still need to also export the rule types (shall I call'em sorts?)
// log (types)

// WIP using an even more high level description for the grammar.
// The function $=>$.Tree (eg) is used to make references to
// other rules in the grammar (is handled by compile below).

const Tree = rule ('Tree', {
  start: T.start,
  skip: [T.space, T.comment, T.newline],
  operands: [T.elem, $ => $.Tree],
  operators: [
    T.descend, T.append, T.orelse, T.declare,
    $ => $.Attr, $ => $.Text,
    T.klass, T.hash, T.def,
    T.test, T.bind, T.iter, T.value, T.key ],
  end: T.end,
})

const Attr = rule ('Attr', {
  role: POSTFIX,
  precedence: 9,
  start: T.attrStart,
  skip: [T.space, T.comment, T.newline],
  operands: [T.attrName, $ => $.Quoted],
  operators: [ T.assign ], // attrNext
  end: T.attrEnd,
})

// NB here already the ordering of the token regexes matters, hacking it now
const Quoted = rule ('Quoted', {
  role: LEAF,
  start: T.strStart,
  operands: [T.strChars, T.empty], // TODO escape sequences
  operators: [T.strCat],
  end: T.strEnd,
})

const Text = rule ('Text', Object.setPrototypeOf ({
  role: POSTFIX,
  precedence: 9,
}, Quoted))


// Now to compute the lexers and their Before/ After states from this
// This is fine, but it may cause issues with the sort-order of the tokens,
// so need to be careful there (eg. interrelating the different roles)

// creating lexer-states from the token descriptions

const lexers = hoop.compile ({ Tree, Attr, Quoted, Text })

// See if it works with the parser
// arch I think I need to change the parser now anyway
// as the lexer produces the tokeninfo-annotated tokens

function parse (input) {
  const S0 = lexers.Tree.Before.next ('(')
  const E0 = lexers.Tree.After.next (')')
  const p = new hoop.Parser (lexers, S0, E0)
  return p.parse (input)
}


// Exports
// -------

module.exports = { parse, tokenTypes:types }