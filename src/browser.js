const log = console.log.bind (console)
const { DomExImpl, parse } = require ('./domex')
const d = document
module.exports = DomExImpl (d.createElement.bind (d), d.createTextNode.bind (d))
let wmodule = window.modules = window.modules || {}
wmodule.domex = module.exports

