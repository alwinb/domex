const log = console.log.bind (console)
const { signatures, parse } = require ('../src/grammar.js')
const { bindDefs, preEval } = require ('../src/compile.js')

/*
// log (JSON.stringify (parse ('a > b + c?test')))
var sample = 'a [foo="bee"] > (b | c) +d ; two > three'
log (sample, '\n=========================')
log (JSON.stringify (parse (sample), null, 2))
//*/


// Testing it with preEval

// log (JSON.stringify (parse ('a > b + c?test')))

var sample = 'a@one [foo="bee"] > (b | c) +d ; two@a > three'
var sample = 'div > "foo" + %'
var sample = 'div > "foo" + %name'
var sample = 'foo + bar + baz | bee@a +  buzz + bazz | boo'
var sample = 'foo[bar=bee buzz= bazz bo]'
log (sample, '\n=========================')
log (JSON.stringify (bindDefs(parse (sample, preEval)), null, 2))
