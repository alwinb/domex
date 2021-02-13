const log = console.log.bind (console)
const { DomEx, domex } = require ('../src')

// Test
// ====

var sampleData = { name:'test', bar:undefined, foo:null, arr:[1,2,'x',3] }
//var sampleData = [1,null,'x',3]

var sample = domex `ul > li > a [href="#"] > "hello, world"`
  //.renderTo (null, process.stdout)

var sample = domex `
( span::number    .number    > %
| span::string    .string    > %
| span::boolean   .boolean   > %
| span::null      .null      > "null"
| span::function  .function  > "function " + %name
| span::undefined .undefined > "undefined"
| ul  ::array     .array     > li* > @default
| dl  ::object    .object    > di* > (dt > $) + (dd > @default)
| dl   .unknown              > di* > (dt > $) + (dd > @default)
) @default;

body
  > h1 "Test Domex :)"
  + @default
  + hr + hr + hr
  + @default
`

sample.renderTo (sampleData, process.stdout)
//process.exit (205)

// var sample = domex `a[class=foo].b [class=" c d "].e`
// sample.renderTo (sampleData, process.stdout)

var sample = domex `"test".name`
sample.renderTo (sampleData, process.stdout)

// var sample = domex `"one":string + "two"`
// sample.renderTo (sampleData, process.stdout)
//process.exit (205)


const e = DomEx.fromFile (__dirname + '/test.dx', (err,dx) => {
  if (err) log (err)
  else dx.renderTo ({ name:'joe' }, process.stdout)
  process.exit (205)
})

