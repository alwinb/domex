const fs = require ('fs')
const util = require ('util')
const log = console.log.bind (console)
const { signatures, parse } = require ('../src/grammar.js')
const { fold, preEval, bindDefs } = require ('../src/compile.js')
const { unfold } = require ('../src/eval.js')

// log (JSON.stringify (expr, 0, 2))

function compile (string) {
  return bindDefs ( parse (string, preEval))
}

function* render (expr, context) {
  const x = unfold (expr, context)
  const [elem, subs, sibs] = x
  if (!elem) return
  if (typeof elem === 'string')
    yield elem
  else {
    yield `<${elem.tagName}${renderAttributes(elem)}>`
    if (subs) yield* render (subs, context)
    yield `</${elem.tagName}>`
  }
  if (sibs) yield* render (sibs, context)
}

function renderAttributes (el) {
  if (!el.attributes.size) return ''
  const r = [ ]
  for (let [k,v] of el.attributes) {
    r.push (' ', k)
    if (v !== '') r.push ('=', '"', v.replace (/"/g, '&quot;'), '"') }
  return r.join ('')
}

// Run
// ---

const expr = compile (fs.readFileSync ('./test.dx', 'utf8'))
var data = { name:'test', bar:undefined, foo:null, arr:[1,2,'x',3] }

for (let x of render (expr, { data }))
  log (x)


process.exit (205)

// FIXMEs
// [value=%name] and the likes