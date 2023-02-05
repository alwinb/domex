import { readFile } from 'fs/promises'
import { parse, nodeTypes as T } from './signature.js'
import { preEval, bindDefs } from './compile.js'
import { _render } from './nodom.js'
const log = console.log.bind (console)


// Domex
// =====

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
    this.exports = this.ast[0][0] === T.withlib ? this.ast[0][1] : Object.create (null)
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

const  version = '0.8.1-dev'
export { Domex, domex }

// Domex.fromFile (process.env.TM_PROJECT_DIRECTORY + '/test/test.dx') .then (log)