const log = console.log.bind (console)
const { parse } = require ('../src/grammar.js')
const { preEval, bindDefs } = require ('../src/compile.js')
const { fold } = require ('../src/fold.js')

// Test
// ====

//var sample = 'a + b [foo="bar\\nbee"] + div @host'
//var sample = 'a "foo\\nbar"; form @b > c@d; e@f'
var samples = [
  'p > "hello\\nworld" + a + b',
  'a[d="e\\nf"]',
  // 'a[d=f=g]', // must throw
  'a[d=f]', // TODO should probably wrap f, or dsallow
  'a[b =c d="e\\n" f g]',
  'a + b + g + (c | d | e) + e + f',
  'a:x | b:y | c',
  '(a + b + c)*name',
  'a; b; c',
  'a[a=b c=d f=%]',
  // '(form @login #login > input + button) @foo', // must throw
  '(form @login #login > input + button)* @foo',
  '(a@A | b@B | c) @foo',
  'a@A:a > b:b@B',
  'div > "ab\\u0020c"',
  'div > %name',
  'div@a > %',
  'div@a > %~name',
  '(a@A:a | b:b@B | c) @foo',
  'form@login > (label > span > "name" + input[name=name]) + button > "submit"; div@xomething; foo; @login + bar',
  '@a',
  '(div@a) + b',
  `form@f1; form@f2; foo`,
  'span:number:selected > %',
  'a[d=%]',
  '"test" @s', // I guess that's ok
  'span:number > %',
  '(span:number > %)*',
  'span:number* > %',
  'span[a=b c=d]* > %',
  'span:number > % | span:string > %',
  'div',
  '(div:foo)',
  '(div:foo@d)',
  '(div)@d',
]

var sample = samples[samples.length-1]


//for (sample of samples) {

log (sample, '\n===============\n')
const tree = parse (sample)
// log (JSON.stringify (tree))

var folded = bindDefs (fold (tree, preEval))
log (JSON.stringify (folded, 0, 2))

//}
