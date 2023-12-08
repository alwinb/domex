import { readFile } from 'fs/promises'
import { parse, nodeTypes as T } from './signature.js'
import { preEval, bindDefs } from './compile.js'
import { _render } from './nodom.js'
const log = console.log.bind (console)


// Domex
// =====

const version = '0.9.4'

const lib = {
  
  default: bindDefs (parse (`
    ( span::number    > %
    | span::bigint    > %
    | span::string    > %
    | span::boolean   > %
    | span::null      > "null"
    | span::function  > "function " + %name
    | span::undefined > "undefined"
    | span::symbol    > %
    | ul::array       > li* > @default
    | dl::object      > di* > dt $ + (dd > @default)
    | dl   .unknown   > di* > dt $ + (dd > @default) )`, preEval)),

  'unsafe-raw-html':
    [[T.unsafeRaw, '@unsafe-raw-html']],
}

// Class

class Domex {

  constructor (string) {
    this.ast = bindDefs (parse (string, preEval))
    this.exports = Object.create (null)
    if (this.ast[0][0] === T.withlib) {
      const lib = this.ast[0][1]
      for (const k in lib) this.exports[k] = 
        Object.setPrototypeOf ({ ast:[[T.withlib, lib], lib[k]] }, Domex.prototype)
    }
  }

  static async fromFile (path, cb) {
    return new Domex (await readFile (path, 'utf-8'))
  }
  
  withLib (lib) {
    const r = { ast:[[T.withlib, lib], this.ast], exports:this.exports }
    return Object.setPrototypeOf (r, Domex.prototype)
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
  new Domex (String.raw (...args))


// Exports
// =======

export { version, Domex, domex }