const log = console.log.bind (console)
const { DomExImpl } = require ('./domex')
const { createElement } = require ('./dom')
module.exports = DomExImpl (createElement)