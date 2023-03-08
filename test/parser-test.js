import { parse } from '../src/signature.js'
import { bindDefs, preEval } from '../src/compile.js'
import { samples, antisamples } from './samples.js'
const log = console.log.bind (console)

/*
// log (JSON.stringify (parse ('a > b + c?test')))
var sample = 'a [foo="bee"] > (b | c) +d ; two > three'
log (sample, '\n=========================')
log (JSON.stringify (parse (sample), null, 2))
//*/


// Testing it with preEval

// log (JSON.stringify (parse ('a > b + c?test')))

for (const sample of samples) {
  log (sample, '\n=========================')
  log (JSON.stringify (bindDefs(parse (sample, preEval)), null, 2))
}
