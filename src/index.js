const log = console.log.bind (console)
const { readFile } = require ('fs')
const { signatures, parse } = require ('../src/signature.js')
const { fold, preEval, bindDefs } = require ('../src/compile.js')
const { unfold } = require ('../src/eval.js')
const raw = (...args) => String.raw (...args)

// Domex
// =====

class DomEx {

  constructor (string) {
    this.ast = bindDefs (parse (string, preEval))
  }

  static fromFile (path, cb) {
    readFile (path, 'utf-8', (err, string) => {
      if (err) cb (err)
      try {
        const dx = new DomEx (string)
        cb (err, dx)
      }
      catch (e) { cb (e) }
    })
  } 
  
  renderTo (data, stream, _end) {
    for (const chunk of render (this.ast, { data }))
      stream.write (chunk)
  }

  *render (data) {
    yield* render (this.ast, { data })
  }

}

// Template literal

const domex = (...args) =>
  new DomEx (String.raw (...args))

// Render to html / stream

const voidTags = {
  area:1,    base:1,  basefont:1,
  bgsound:1, br:1,    col:1,
  embed:1,   frame:1, hr:1,
  img:1,     input:1, keygen:1,
  link:1,    meta:1,  param:1, 
  source:1,  track:1
}

function* render (expr, context) {
  const [elem, subs, sibs] = unfold (expr, context)
  if (elem === null) return
  if (typeof elem === 'string')
    yield elem.replace (/</g, '&lt;') // TODO not in rawtext
  else {
    yield `<${elem.tagName}${renderAttributes (elem)}>`
    if (!(elem.tagName in voidTags)) {
      if (subs) yield* render (subs, context)
      yield `</${elem.tagName}>`
    }
  }
  if (sibs) yield* render (sibs, context)
}

function renderAttributes (el) { const chunks = [ ]
  for (let [k,v] of el.attributes) {
    chunks.push (' ', k)
    if (v !== '') chunks.push ('=', '"', v.replace (/"/g, '&quot;'), '"') }
  return chunks.join ('')
}


// Exports
// =======

module.exports = { DomEx, Domex:DomEx, domex }
