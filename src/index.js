const log = console.log.bind (console)
const { readFile } = require ('fs')
const { signatures, parse, nodeTypes:T } = require ('./signature.js')
const { fold, preEval, bindDefs } = require ('./compile.js')
const { _render } = require ('./dom.js')


// Domex
// =====

const lib = {
  
  '@default': bindDefs (parse (`
    ( span::number    > %
    | span::string    > %
    | span::boolean   > %
    | span::null      > "null"
    | span::function  > "function " + %name
    | span::undefined > "undefined"
    | span::symbol    > %
    | ul  ::array     > li* > @default
    | dl  ::object    > di* > dt $ + (dd > @default)
    | dl   .unknown   > di* > dt $ + (dd > @default) )`, preEval)),

  '@unsafe-raw-html':
    [[T.unsafeRaw, '@unsafe-raw-html']],
}


class DomEx {

  constructor (string) {
    this.ast = bindDefs (parse (string, preEval))
    this.exports = this.ast[0][0] === T.withlib ? this.ast[0][1] : Object.create (null)
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
  
  withLib (lib) {
    const r = { ast:[[T.withlib, lib], this.ast], exports:this.exports }
    return Object.setPrototypeOf (r, DomEx.prototype)
  }

  renderTo (data, stream, _end) {
    for (const chunk of _render (this.ast, { data, lib }))
      stream.write (chunk)
  }

  *render (data) {
    yield* _render (this.ast, { data, lib })
  }

}

// Template literal

const domex = (...args) =>
  new DomEx (String.raw (...args))


// Exports
// =======

module.exports = {
  version:'0.8.0-dev',
  DomEx, domex,
  Domex: DomEx
}
