const util = require ('util')
const log = console.log.bind (console)
const { DomExp, parse, dom } = require ('../src/domexp')


// Test
// ====

var sample = 'a[foo=%amp bar=%bee] | (c) + d'
log('\n' + sample, '\n===========================')
log(parse (sample))


/*
const lib = {
  Menu: new DomExp (`ul > ((li > a $ %) + Menu?object)*`)
}

log(
util.inspect(
  // new DomExp ('a.test#sx > a@A $ | b@b ') .render ('sample'),
  // new DomExp ('ul> (li?string % | li?number %)* .foo') .render ([1,2,3]),
  // dom `(a.test#sx > a@A $)* | b@b` ([]),
  // dom `span*one` ({one:[1,2,3]}).elems,
  lib.Menu.render({ one:1, two:2, three:{ foo:4, bar:5} }, lib).elem
,
{depth:Infinity}))
*/

// Cool this works, looks good!
// So very cool!

// Now what?
// And with the context-dependent operator tables
// Could experiment with hops right here,

// For domexp, ...
// reimplement the builder and implement the recursion
// Add the evaluator -- bottom up type checker

// How would a HOP work?
// So.... let's see
// Then, the result of an end token,
// must somehow be fed back to the ops instead of to the leafs
