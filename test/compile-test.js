const log = console.log.bind (console)
const { parse } = require ('../src/grammar.js')
const { fold, preEval } = require ('../src/compile.js')

// Test
// ====

//var sample = 'a + b [foo="bar\\nbee"] + div @host'
//var sample = 'a "foo\\nbar"; form @b > c@d; e@f'
var sample = 'p "hello\\nworld" > (a + b)'
var sample = 'a[d="e\\nf"]'
var sample = 'a[d=f=g]'
var sample = 'a[d=f]' // TODO should probably wrap f
var sample = 'a[b =c d="e\\n" f g]'
var sample = 'a + b + g + (c | d | e) + e + f'
var sample = 'a?x | b?y | c'
var sample = '(a + b + c)*name'
var sample = 'a; b; c'
var sample = 'a[a=b c=d f=%]'
var sample = 'a[d=%]'
// var sample = '(form @login #login > input + button) @foo' // should throw
var sample = '(form @login #login > input + button)* @foo'
var sample = '(a@A | b@B | c) @foo'
var sample = 'a@A?a > b?b@B'
var sample = 'div "ab\\u0020c"'
var sample = 'div %name'
var sample = 'div@a %'
var sample = 'div % @a'
var sample = 'div@a %~name'
var sample = 'div %~name @a'
var sample = '(a@A?a | b?b@B | c) @foo'
var sample = 'form@login > (label > span "name" + input[name=name]) + button "submit"; div@xomething; foo; @login + bar'

log (sample, '\n===============\n')
const tree = parse (sample)
// log (JSON.stringify (tree))

var folded = fold (tree, preEval)
log (JSON.stringify (folded, 0, 2))

