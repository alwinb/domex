const log = console.log.bind (console)
const { parse } = require ('../src/grammar.js')

// log (JSON.stringify (parse ('a > b + c?test')))
var sample = 'a [foo="bee"]'
log (sample, '\n=========================')
log (JSON.stringify (parse (sample)))



