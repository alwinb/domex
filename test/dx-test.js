const fs = require ('fs')
const util = require ('util')
const log = console.log.bind (console)
const { signatures, parse } = require ('../src/grammar.js')
const { fold, preEval, bindDefs } = require ('../src/compile.js')
const { refold, eval } = require ('../src/eval.js')

const expr = compile (fs.readFileSync ('./test.dx', 'utf8'))
// log (JSON.stringify (expr, 0, 2))

function compile (string) {
  return bindDefs ( parse (string, preEval))
}

var unfolded = eval (expr, { name:'test', bar:undefined, foo:null, arr:[1,2,'x',3] })
log (JSON.stringify (unfolded, 0, 2))
