const log = console.log.bind (console)
const { signatures, parse } = require ('../src/grammar.js')
const { Parser } = require ('../src/hoop2')


/*
// log (JSON.stringify (parse ('a > b + c?test')))
var sample = 'a [foo="bee"] > (b | c) +d ; two > three'
log (sample, '\n=========================')
log (JSON.stringify (parse (sample), null, 2))
//*/


// Testing it with preEval

log (Parser)

const { preEval } = require ('../src/compile.js')

function parse2 (input) {
  const S0 = signatures.Tree.Before.next ('(')
  const E0 = signatures.Tree.After.next (')')
  const p = Parser (signatures, S0, E0, preEval)
  return p.parse (input)
}

// log (JSON.stringify (parse ('a > b + c?test')))
var sample = 'a@one [foo="bee"] > (b | c) +d ; two@a > three'
log (sample, '\n=========================')
log (JSON.stringify (parse2 (sample), null, 2))
