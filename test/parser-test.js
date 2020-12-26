const log = console.log.bind (console)
const { parse } = require ('../src/grammar.js')

// log (JSON.stringify (parse ('a > b + c?test')))
var sample = 'a [foo="bee"] > (b | c)'
log (sample, '\n=========================')
log (JSON.stringify (parse (sample), null, 2))



