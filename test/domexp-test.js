const log = console.log.bind (console)
const { DomExp, parse } = require ('../src/domexp')


// Test
// ====

parse ('Foo := a+b|(c)+d')


log (new DomExp ('a.test#sx > a@A $ | b@b ') .render ('sample'))
log (new DomExp ('ul> ( li?string $ | li?number $ )* .foo') .render ([1,2,3]))

log( dom `(a.test#sx > a@A $)* | b@b` ([]) )


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




