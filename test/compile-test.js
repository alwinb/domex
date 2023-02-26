import { parse } from '../src/signature.js'
import { preEval, bindDefs } from '../src/compile.js'
import { fold } from '../src/fold.js'
const log = console.log.bind (console)

// Test
// ====


var samples = [
  'p > "hello\\nworld" + a + b',
  'a[d="e\\nf"]',
  'a[d=f]',
  'a[b =c d="e\\n" f g]',
  'a + b + g + (c | d | e) + e + f',
  'a:x | b:y | c',
  '(a + b + c)*name',
  'a; b; c',
  'a[a=b c=d f=%]',
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
  'span:number:selected > %',
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
  `form@f1; form@f2; foo`,
  'a[d=%]',
  'a[d=a s="b" c d=e]',
  'a[d=a s="b" c=%name d=e %]',
  'a[a=a b=%]',
  'a[a "b"]',
  'a[a=a]',
  'a[a=a a=b c]',
  'a:string + b',
  'a[a="b"]',
  'a[a="b\\nc" c=d]',
  'p > "this is domex :)"',
  '(form @login #login > input + button) @foo', // I guess that is ok? Tagging # on top of login later?
  'a + b [foo="bar\\nbee"] + div @host', // REVIEW Allow newlines? Hm I think so. Very useful for style / script
  'a "foo\\nbar"; form @b > c@d; e@f'
]

var antisamples = [ // These must throw
  'a["test"]',
  'a[%]',
  'a[a=a %]',
  'a[d=f=g]',
]

var sample = samples[samples.length-1]


//for (sample of samples) {

log (sample, '\n===============\n')
const tree = parse (sample)
log (JSON.stringify (tree, 0, 2))

var folded = bindDefs (fold (tree, preEval))
log (JSON.stringify (folded, 0, 2))

//}
