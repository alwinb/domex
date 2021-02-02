const fs = require ('fs')
const util = require ('util')
const log = console.log.bind (console)
const { signatures, parse } = require ('../src/grammar.js')
const { fold, preEval, bindDefs } = require ('../src/compile.js')
const { unfold } = require ('../src/eval.js')

// Test
// ====

var sample = '(span > $ ~name) + div > % ~name'
var sample = 'span:string > ~name'
var sample = 'span:number > ~name'
var sample = '(span:number > %)* ~arr'

var sample = `
( span#t:number    > %
| span:string    > %
| span:null      > "null"
| span:undefined > "undefined"
| ul:array       > li* > @json
| dl:object      > di* > (dt > $) + (dd > @json)
| span           > "unknown"
) @json;

body > div > @json
`

log (sample, '\n'+sample.replace(/./g, '='))
// log (JSON.stringify (tree, null, 2), '\n')

function* render (expr, context) {
  const x = unfold (expr, context)
  const [elem, subs, sibs] = x
  if (!elem) return
  if (typeof elem === 'string')
    yield elem
  else {
    yield `<${elem.tagName} ${renderAttributes(elem)}>`
    if (subs) yield* render (subs, context)
    yield `</${elem.tagName}>`
  }
  if (sibs) yield* render (sibs, context)
}

function renderAttributes (el) {
  const r = [ ]
  for (let [k,v] of el.attributes) {
    r.push (' ', k)
    if (v !== '') r.push ('=', '"', v.replace (/"/g, '&quot;'), '"') }
  return r.join ('')
}



var tree = bindDefs (parse (sample, preEval))
var data = { name:'test', bar:undefined, foo:null, arr:[1,2,'x',3] }

for (let x of render (tree, { data }))
  log (x)


process.exit (205)