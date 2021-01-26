const log = console.log.bind (console)
const { signatures, parse } = require ('../src/grammar.js')
const { preEval } = require ('../src/compile.js')

/*
// log (JSON.stringify (parse ('a > b + c?test')))
var sample = 'a [foo="bee"] > (b | c) +d ; two > three'
log (sample, '\n=========================')
log (JSON.stringify (parse (sample), null, 2))
//*/


// Testing it with preEval

// log (JSON.stringify (parse ('a > b + c?test')))

var sample = 'a@one [foo="bee"] > (b | c) +d ; two@a > three'
log (sample, '\n=========================')
log (JSON.stringify (parse (sample, preEval), null, 2))
