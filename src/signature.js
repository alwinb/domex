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
      , sibling:   infix   `[+]` },
      { class:     postfix `[.] [a-zA-Z_\-] [a-zA-Z0-9_\-]*`
      , hash:      postfix `[#] [a-zA-Z_\-] [a-zA-Z0-9_\-]*`
      , def:       postfix `[@] [a-zA-Z_] [a-zA-Z0-9_]*`
      , ttest:     postfix ` :: [a-zA-Z_] [a-zA-Z0-9_]*`
      , test:      postfix `[:] [a-zA-Z_] [a-zA-Z0-9_]*`
      , bind:      postfix `[~] [a-zA-Z_] [a-zA-Z0-9_]*` // TODO what about numeric keys?
      , iter:      postfix `[*] (?:[a-zA-Z_] [a-zA-Z0-9_]*)?`
      , addvalue:  postfix `[%] (?:[a-zA-Z_] [a-zA-Z0-9_]*)?`
      , addkey:    postfix `[$]`
      , addtext: [POSTFIX, `["]`,  'Chars',  `["]`]   // wrapfix-postfix
      , attr:    [POSTFIX, `[[]`,  'Attr',     `]`] } // wrapfix-postfix
    ],

  },

  Attr: {
    name: 'Attr',
    skip: skips,
    end: end `\]`,

    sig: [
      { unquoted:  atom `[a-zA-Z] [a-zA-Z0-9_\-]*`
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
      { strChars:  atom `[^\x00-\x19\\"]+`
      , escape:    atom `[\\]["/\\bfnrt]`
      , hexescape: atom `[\\]u[a-fA-F0-9]{4}`
      , empty:     atom `.{0}(?=")` },
      { strCat:   infix `.{0}(?!")` }
    ],
  },
}

const compiled = hoop.compile (signature)

// Node types/ tags
// ----------------

// Additional, syntax-less node-types that
// are used in compile and eval,

const additional = {
  void:      tokenType (),
  letin:     tokenType (),
  withlib:   tokenType (), // [[T.withlib, lib], expr]
  context:   tokenType (), // [[T.context, ctx], expr]
  append:    tokenType (),
}

// Collecting the types for export

const nodeTypes = {}
for (let k in additional)
  nodeTypes[k] = additional[k][1]

for (const sig in compiled.types)
  for (const k in compiled.types[sig])
    nodeTypes[k] = compiled.types[sig][k]

const typeNames = { }
for (let k in nodeTypes)
  typeNames[nodeTypes[k]] = k


// Configuring the parser
// ----------------------

function parse (input, apply) {
  const S0 = compiled.lexers.Dom.Before.next ('(')
  const E0 = compiled.lexers.Dom.After.next (')')
  const p = new hoop.Parser (compiled.lexers, S0, E0, apply)
  return p.parse (input)
}


// Exports
// -------

module.exports = { nodeTypes, typeNames, parse }