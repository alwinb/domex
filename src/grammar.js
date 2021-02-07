const log = console.log.bind (console)
const hoop = require ('./hoop2.js')
const { token, tokenType, start, atom, postfix, infix, assoc, end } = hoop
const { LEAF, POSTFIX } = hoop.Roles

const raw = (...source) =>
  String.raw (...source) .replace (/\s+/g, '')


// Grammar for Domex
// =================

const skips = {
  space:   raw `[\t\f\x20]+`,
  newline: raw `[\n]` , 
  comment: raw  `// [^\n]*`, 
}

// NB here the ordering of the token regexes does matter,
// and there may be cases that cannot be expressed with the
// current parser generator. No issues here though. 

const signature = {

  Dom: {
    name: 'Dom',
    skip: skips,
    end: end `[)]`,

    sig: [
      { elem:      atom    `    [a-zA-Z] [a-zA-Z0-9_\-]*`
      , component: atom    `[@] [a-zA-Z] [a-zA-Z0-9_\-]*`
      , value:     atom    `[%] [a-zA-Z0-9_\-]*`
      , key:       atom    `[$]`
      , group:    [LEAF,   `[(]`,  'Dom',   `[)]`]    // wrapfix-atom
      , text:     [LEAF,   `["]`,  'Chars', `["]`] }, // wrapfix-atom
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
      , attr:    [POSTFIX, `[[]`,  'Attr',  `[\]]`] } // wrapfix-postfix
    ],

  },

  Attr: {
    name: 'Attr',
    skip: skips,
    end: end `\]`,

    sig: [
      { attrName:  atom `[a-zA-Z] [a-zA-Z0-9_\-]*`
      , valueIn:   atom `[%] [a-zA-Z0-9]*`
      , keyIn:     atom `[$]`
      , stringIn: [LEAF, raw `["]`,  'Chars',  raw `["]`] }, // wrapfix-atom
      { collate:  assoc `.{0} (?![[=])` },
      { assign:   infix `[=]` },
    ],
  },

  Chars: {
    name: 'Chars',
    end: end `["]`,
    sig: [
      { strChars:  atom `[^0x00-0x19\\"]+`
      , escape:    atom `[\\]["/\\bfnrt]`
      , hexescape: atom `[\\]u[a-fA-F0-9]{4}`
      , empty:     atom `.{0}` },
      { strCat:   infix `.{0}` }
    ],
  },
}

const signatures = hoop.compile (signature)

// Node types/ tags
// ----------------

// Additional, syntax-less node-types that
// are used in compile and eval,

const additional = {
  void:      tokenType (),
  letin:     tokenType (),
  withlib:   tokenType (),
  withdata:  tokenType (),
}

// Collecting the types for export

const nodeTypes = {}
for (let k in additional)
  nodeTypes[k] = additional[k][1]

for (const sig in signatures)
  for (const k in signatures[sig].types)
    nodeTypes[k] = signatures[sig].types[k]


// Configuring the parser
// ----------------------

function parse (input, apply) {
  const S0 = signatures.Dom.Before.next ('(')
  const E0 = signatures.Dom.After.next (')')
  const p = new hoop.Parser (signatures, S0, E0, apply)
  return p.parse (input)
}


// Exports
// -------

module.exports = { signatures, nodeTypes, parse }