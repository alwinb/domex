const log = console.log.bind (console)
const { DomExImpl } = require ('./domex')
const { createElement, createTextNode } = require ('./dom')
module.exports = DomExImpl (createElement, createTextNode)