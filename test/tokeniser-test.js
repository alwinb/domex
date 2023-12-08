import { Parser } from '../src/parser.new.js'
import { samples, antisamples } from './samples.js'
const log = console.log.bind (console)

const failures = []

log('\n')
for (const sample of samples) {
  const t = new Parser ({write:log})
  log (sample, '\n=========================')
  try { t.parse (sample) }
  catch (error) { 
    log (error)
    failures.push ({ sample, error })
  }
  log ('\n')
}

if (failures.length)
  throw new Error (`Error in ${failures.length} out of ${samples.length} samples`)