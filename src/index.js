const log = console.log.bind (console)
const { DomExpImpl } = require ('./domexp')
const { createElement } = require ('./dom')
module.exports = DomExpImpl (createElement)