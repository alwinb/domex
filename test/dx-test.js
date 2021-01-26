const fs = require ('fs')
const util = require ('util')
const log = console.log.bind (console)
const { signatures, parse } = require ('../src/grammar.js')
const { fold, preEval } = require ('../src/compile.js')

const expr = parse (fs.readFileSync ('./test.dx', 'utf8'), preEval)
log (JSON.stringify (expr, 0, 2))