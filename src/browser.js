const log = console.log.bind (console)
const { DomExImpl, parse } = require ('./domex')
module.exports = DomExImpl (document.createElement.bind (document))
let wmodule = window.modules = window.modules || {}
wmodule.domex = module.exports

