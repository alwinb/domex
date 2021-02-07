const log = console.log.bind (console)
const hoop = require ('./hoop2.js')
const { token, tokenType } = hoop
const { START, END, LEAF, PREFIX, INFIX, ASSOC, POSTFIX, SKIP } = hoop.Roles

const rx = (...source) =>
  String.raw (...source) .replace (/\s+/g, '')

const atom = (...source) =>
  [String.raw (...source) .replace (/\s+/g, ''), LEAF]

const postfix = (...source) =>
  [String.raw (...source) .replace (/\s+/g, ''), POSTFIX]

const infix = (...source) =>
  [String.raw (...source) .replace (/\s+/g, ''), INFIX]

const assoc = (...source) =>
  [String.raw (...source) .replace (/\s+/g, ''), ASSOC]


// Grammar for Domex
// -----------------

const tokens = {
  end:       token   `[)]` (END),
  strEnd:    token   `["]` (END),
  attrEnd:   token    `\]` (END),

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

const skip = {
  space:   rx `[\t\f\x20]+`,
  newline: rx `[\n]` , 
  comment: rx  `// [^\n]*`, 
}

// NB here already the ordering of the token regexes matters, hacking it now

const signature = {

  Tree: {
    name: 'Tree',
    end: T.end,
    skip, 

    sig: [
      { elem:      atom    `    [a-zA-Z] [a-zA-Z0-9_\-]*`
      , component: atom    `[@] [a-zA-Z] [a-zA-Z0-9_\-]*`
      , value:     atom    `[%] [a-zA-Z0-9_\-]*`
      , key:       atom    `[$]`
      , group:    [LEAF,   `[(]`, $ => $.Tree,   `[)]`]
      , text:     [LEAF,   `["]`, $ => $.String, `["]`] },
      { declare:   assoc   `[;]` }, // TODO also allow it in postfix pos
      { orelse:    assoc   `[|]` },
      { descend:   infix   `[>]`
      , append:    assoc   `[+]` },
      { class:     postfix `[.] [a-zA-Z_\-] [a-zA-Z0-9_\-]*`
      , hash:      postfix `[#] [a-zA-Z_\-] [a-zA-Z0-9_\-]*`
      , def:       postfix `[@] [a-zA-Z] [a-zA-Z0-9]*`
      , ttest:     postfix ` :: [a-zA-Z] [a-zA-Z0-9]*`
      , test:      postfix `[:] [a-zA-Z] [a-zA-Z0-9]*`
      , bind:      postfix `[~] [a-zA-Z] [a-zA-Z0-9]*`
      , iter:      postfix `[*] [a-zA-Z0-9]*`
      , attr:     [POSTFIX, `[[]`, $ => $.Attr, `[\]]`] }
    ],

  },

  Attr: {
    name: 'Attr',
    end: T.attrEnd,
    skip,

    sig: [
      { attrName: atom `[a-zA-Z] [a-zA-Z0-9_\-]*`
      , valueIn:  atom `[%] [a-zA-Z0-9]*`
      , keyIn:    atom `[$]`
      , stringIn: [LEAF, rx `["]`, $ => $.String, rx `["]`] },
      { collate: assoc `.{0} (?![[=])` },
      { assign:  infix `[=]` },
    ],
  },

  String: {
    name: 'String',
    end: T.strEnd,
    sig: [
      { strChars:  atom `[^0x00-0x19\\"]+`
      , escape:    atom `[\\]["/\\bfnrt]`
      , hexescape: atom `[\\]u[a-fA-F0-9]{4}`
      , empty:     atom `.{0}` },
      { strCat: infix `.{0}` }
    ],
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

for (const sig in signatures)
  for (const k in signatures[sig].types)
    types[k] = signatures[sig].types[k]



module.exports = { signatures, parse, tokenTypes:types, Roles:hoop.Roles }