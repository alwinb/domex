const fs = require ('fs')
const util = require ('util')
const log = console.log.bind (console)
const { signatures, parse } = require ('../src/grammar.js')
const { Parser } = require ('../src/hoop2')
const { fold, preEval, bindDefs } = require ('../src/compile.js')
const { refold, eval } = require ('../src/eval.js')

// Test
// ====

var sample = 'span $ ~name + div %~name'
var sample = 'span:string ~name'
var sample = 'span:number ~name'
var sample = '(span:number %)* ~arr'
var sample = `
( span %:number
| span %:string
| span "null":null
| (ul > (li > @json)*):array
| (dl > (di > dt $ + dd > @json)*):object
| span "unknown"
) @json
`

const tree = bindDefs (parse (sample, preEval))

log (sample, '\n'+sample.replace(/./g, '='))
log (JSON.stringify (tree), '\n')

var unfolded = eval (tree, { name:'test', foo:null, arr:[1,2,'x',3] })
log (JSON.stringify (unfolded, 0, 2))
