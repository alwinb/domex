const log = console.log.bind (console)
const { readFile } = require ('fs')
const { signatures, parse } = require ('./signature.js')
const { fold, preEval, bindDefs } = require ('./compile.js')
const { _render } = require ('./dom.js')


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
    for (const chunk of _render (this.ast, { data }))
      stream.write (chunk)
  }

  *render (data) {
    yield* _render (this.ast, { data })
  }

}

// Template literal

const domex = (...args) =>
  new DomEx (String.raw (...args))


// Exports
// =======

module.exports = { DomEx, Domex:DomEx, domex }
