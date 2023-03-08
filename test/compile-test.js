import { parse } from '../src/signature.js'
import { preEval, bindDefs } from '../src/compile.js'
import { fold } from '../src/fold.js'
const log = console.log.bind (console)
import { samples, antisamples } from './samples.js'

// Test
// ====

var sample = samples[samples.length-1]

for (sample of samples) {
  log (sample, '\n===============\n')
  const tree = parse (sample)
  log (JSON.stringify (tree, 0, 2))

  var folded = bindDefs (fold (tree, preEval))
  log (JSON.stringify (folded, 0, 2))
}
