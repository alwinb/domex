const log = console.log.bind (console)
const { DomExpImpl, parse } = require ('./domexp')
module.exports = DomExpImpl (document.createElement.bind (document))
let wmodule = window.modules = window.modules || {}
wmodule.domexp = module.exports

