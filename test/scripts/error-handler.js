import { domex, Domex } from '../../dist/domex.min.js'
const { entries } = Object

// Use Symbol.toStringTag to always return constructor.name

Object.defineProperty (Object.prototype, Symbol.toStringTag, 
  { get: function () { return this.constructor.name } })

// Render Errors using domex:

const errorDx = domex `
  span @frame
    > " » "
    + a.error [href=%href title=%url] %message;

  div.br @error
    > h2.br0 %name ~error
    + div.hlist > @frame *stack;

  div.layer.error.notification
    > @error`

const errsDiv =
  document.createElement ('div')

function clearErrors () {
  errsDiv.innerHTML = ''
}

function showError (evt) {
  const { error, message, filename:url, lineno:line, colno:col } = evt
  const stack = parseStack (error.stack || String (error))
  const href = rewriteUrl (url, line, col) .href
  stack.push ({ message, line, col, url, href })
  if (!errsDiv.parentNode) document.body.append (errsDiv)
  errsDiv.append (errorDx.render ({ error, message:evt.message, stack }) .elem)
}

function parseStack (stack) {
  const result = []
  for (let sline of stack.split ('\n')) {
    let message, rest, line, col, url, _;
    [message, rest] = sline.split (/@?(?=\bfile:[/][/])/i) // FF, Safari
    if (rest) {
      const [_, url, line, col] = /^(.*)[:](\d+)[:](\d+)$/ .exec (rest)
      const href = rewriteUrl (url, line, col) .href
      result.unshift ({ message, url, line, col, href })
    }
  }
  return result
}

// convert file-URLs to to txmt: URL
function rewriteUrl (url1, line = 1, column = 0) {
  const url = new URL (url1, document.baseURI)
  if (url.protocol === 'file:' || url.protocol === 'x-txmt-filehandle:') {
    const callbackUrl = new URL ('txmt://open?')
    entries ({ url, line, column }) .forEach (kv => callbackUrl.searchParams.set (...kv))
    return callbackUrl
  }
  entries ({ line, column }) .forEach (kv => url.searchParams.set (...kv))
  return url1
}

// Main

window.addEventListener ('error', showError)
window.addEventListener ('keydown', evt => evt.metaKey && evt.code == 'KeyK' ? clearErrors () : null)