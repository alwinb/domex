const log = console.log.bind (console)
const hoop = require ('./hoop2.js')
const { token, rule } = hoop
const { START, END, LEAF, PREFIX, INFIX, POSTFIX, SKIP } = hoop.Roles

// Grammar for Domex
// -----------------

const
  space     = token `[\t\f\x20]+` (SKIP),
  comment   = token   `// [^\n]*` (SKIP)
  newline   = token        `[\n]` (SKIP),

  elem      = token `[a-zA-Z] [a-zA-Z0-9_\-]*` (LEAF),
  attrName  = token `[a-zA-Z] [a-zA-Z0-9_\-]*` (LEAF),

  start     = token   `[(]` (START),
  end       = token   `[)]` (END),

  strStart  = token   `["]` (START),
  strChars  = token `[^"]+` (LEAF)
  empty     = token  `.{0}` (LEAF)
  strCat    = token  `.{0}` (INFIX, 0)
  strEnd    = token   `["]` (END),

  descend   = token   `[>]` (INFIX, 3),
  append    = token   `[+]` (INFIX, 3),
  orelse    = token   `[|]` (INFIX, 2),
  declare   = token   `[;]` (INFIX & POSTFIX, 0),

  attrStart = token    `\[` (START),
  assign    = token   `[=]` (INFIX, 9),
  attrNext   = token  `.{0}` (INFIX, 0)
  attrEnd   = token    `\]` (END),

  klass     = token   `[.] [a-zA-Z]+` (POSTFIX, 9),
  hash      = token   `[#] [a-zA-Z]+` (POSTFIX, 9),
  def       = token   `[@] [a-zA-Z]+` (POSTFIX, 9),

  test      = token   `[?] [a-zA-Z]+` (POSTFIX, 9),
  bind      = token   `[~] [a-zA-Z]+` (POSTFIX, 9),
  iter      = token   `[*] [a-zA-Z]*` (POSTFIX, 9),
  value     = token   `[%] [a-zA-Z]*` (POSTFIX, 9),
  key       = token   `[$]` (POSTFIX, 9)

// WIP using an even more high level description for the grammar.
// The function $=>$.tree (eg) is used to make references to
// other rules in the grammar (is handled by compile below).

const tree = rule ('tree', {
  start,
  skip: [space, comment, newline],
  operands: [elem, $ => $.tree],
  operators: [
    descend, append, orelse, declare,
    $ => $.attr,
    klass, hash, def,
    test, bind, iter, value, key, $ => $.text ],
  end,
})

const attr = rule ('attr', {
  role: POSTFIX,
  precedence: 9,
  start: attrStart,
  skip: [space, comment, newline],
  operands: [attrName, $ => $.quoted],
  operators: [ assign ], // attrNext
  end: attrEnd,
})

// NB here already the ordering of the token expses matters, hacking it now
const quoted = rule ('quoted', {
  role: LEAF,
  start: strStart,
  operands: [strChars, empty], // TODO escape sequences
  operators: [strCat],
  end: strEnd,
})

const text = rule ('text', Object.setPrototypeOf ({
  role: POSTFIX,
  precedence: 9,
}, quoted))


// Now to compute the lexers and their Before/ After states from this
// This is fine, but it may cause issues with the sort-order of the tokens,
// so need to be careful there (eg. interrelating the different roles)

// creating lexer-states from the token descriptions

const lexers = hoop.compile ({ tree, attr, quoted, text })

// See if it works with the parser
// arch I think I need to change the parser now anyway
// as the lexer produces the tokeninfo-annotated tokens

function parse (input) {
  const S0 = lexers.tree.Before.next ('(')
  const E0 = lexers.tree.After.next (')')
  const p = new hoop.Parser (lexers, S0, E0)
  return p.parse (input)
}


// log (JSON.stringify (parse ('a > b + c?test')))
var sample = 'a [foo="bee"]'
log (sample, '\n=========================')
log (JSON.stringify (parse (sample)[3]))



