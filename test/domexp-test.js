const util = require ('util')
const log = console.log.bind (console)
const { DomExp, parse, dom, domex } = require ('../src/')


// Test
// ====

// var sample = 'a[foo=%amp bar=%bee] | (c) + d'
// log('\n' + sample, '\n===========================')
// log(parse (sample))

/*
const App = domex `div#App[foo]
  > (header > ul.hlist > li {Folder} + li {Notebook})
  + (div #Sidebar
    > div @myfiles
    + div #Trash @trash)
  + div #Detail @detail
  + div #Inspector @inspector`

var sample = domex `div[foo]
  > (bar > baz)
  + div`
/*/

//var sample = domex `div.F[at=b]`
// var sample = domex `div > button%*`
// var sample = domex `ul > (li > a $ + Menu?object)*`

const lib = {

  // Main: domex `div.class > a[class="test"] + span?b | c`,
  Main: domex `(ul > MenuItem *entries)`
  //
  // Json: domex `span .number    ?number    %
  // | span .null      ?null      {null}
  // | span .undefined ?undefined {undefined}
  // | span .boolean   ?boolean   %
  // | span .string    ?string    %
  // | ul   .array     ?array     > (li > Json)*
  // | dl   .object    ?object    > span {object} + (di > dt $ + dd > Json)*
  // | span .function  ?function  {function } %name
  // //| span .unknown              %`

}

//log (JSON.stringify (lib.Main.ast,0,2))
log (lib.Main.source)
log (lib.Main.render ({a:[1,2,3], b:false, c:{ foo:1, bar:2 }}, lib) .elem.outerHTML)

//process.exit (205)
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
