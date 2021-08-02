const log = console.log.bind (console)
const { readFile } = require ('fs')
const { signatures, parse, nodeTypes:T } = require ('./signature.js')
const { fold, preEval, bindDefs } = require ('./compile.js')
const { _render } = require ('./dom.js')


// Domex
// =====

const lib = {
  
  '@default': bindDefs (parse (`
  ( span::number    .number    > %
  | span::string    .string    > %
  | span::boolean   .boolean   > %
  | span::null      .null      > "null"
  | span::function  .function  > "function " + %name
  | span::undefined .undefined > "undefined"
  | span::symbol    .symbol    > %
  | ul  ::array     .array     > li* > @default
  | dl  ::object    .object    > di* > dt $ + (dd > @default)
  | dl   .unknown              > di* > dt $ + (dd > @default) )`, preEval)),

  '@unsafe-raw-html': [[T.unsafeRaw, '@unsafe-raw-html']]
}


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
  version:'0.7.1-develop',
  DomEx, domex,
  Domex: DomEx
}
