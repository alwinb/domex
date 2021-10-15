import { parse } from '../src/signature.js'
import { bindDefs, preEval } from '../src/compile.js'
const log = console.log.bind (console)

/*
// log (JSON.stringify (parse ('a > b + c?test')))
var sample = 'a [foo="bee"] > (b | c) +d ; two > three'
log (sample, '\n=========================')
log (JSON.stringify (parse (sample), null, 2))
//*/


// Testing it with preEval

// log (JSON.stringify (parse ('a > b + c?test')))

const samples = [
  'div > "foo\\nbar" + %',
  'div > "foo" + %name',
  'foo + bar + baz | bee@a +  buzz + bazz | boo',
  'foo[bar=bee buzz= bazz bo]',
  'foo::string',
  'foo::string@f + (bar@x; buz) + be', // Hmmm is that as desired?
  'foo[s=d] > (bar > "be\\nb")',
  '//asdf\n\n(a@a; b@b; c)@x; d',
  'a#foo + b.boo > c > "zo\\no"',
  'a + b + c | d + e + f | g | h [i=j]',
  '\n( span::number    .number    > %)',
  'a@one [foo="bee\\bar"] > (b | c) +d ; two@a > three',
  `elem "bar" + bee`,
  `h1 %title`,
  `span $`
]

for (const sample of samples) {
  log (sample, '\n=========================')
  log (JSON.stringify (bindDefs(parse (sample, preEval)), null, 2))
}
