import { Domex, domex } from '../src/index.js'
const log = console.log.bind (console)

// Test
// ====

var sampleData = { name:'Joe', bar:undefined, foo:null, arr:[1,2,'x',3], empty:[] }
//var sampleData = [1,null,'x',3]

var sample = domex `ul > li > a [href="#"] > "hello, world"`
  //.renderTo (null, process.stdout)

var sample = domex `
( span::number    > %
| span::string    > %
| span::boolean   > %
| span::null      > "null"
| span::function  > "function " + %name
| span::undefined > "undefined"
| ul  ::array     > li* > @default
| dl  ::object    > di* > dt $ + (dd > @default)
| dl   .unknown   > di* > dt $ + (dd > @default)
) @default;

body
  > h1 "Test Domex :)"
  + p %name
  + @default
  + hr + hr + hr
  + @default
  + input[value=%] ~name
  + div:length $ " has length" ~empty
  + div:length $ " has length" ~arr
`

var sample = domex `
( dl::object > di* > dt $ + (dd > @json)
| ul::array  > li* > @json
| span::null "null"
| span %
) @json
`

// TextMate: Show result as HTML
// process.exitCode = 205
domex `("text" + b) #c` .renderTo ({}, process.stdout)

var sample = domex `@default`
var sampleData = [1,2,34, {a:2, b:[1,2]}]
sample.renderTo (sampleData, process.stdout)
// process.exit (205)

var sample = domex `pre % + " as HTML: " + @unsafe-raw-html`
var sampleData = '<b>test</b>'
sample.renderTo (sampleData, process.stdout)

//process.exit (205)

// var sample = domex `a[class=foo].b [class=" c d "].e`
// sample.renderTo (sampleData, process.stdout)

// var sample = domex `"test".name`
// sample.renderTo (sampleData, process.stdout)

// var sample = domex `"one":string + "two"`
// sample.renderTo (sampleData, process.stdout)
//process.exit (205)

const path = new URL (import.meta.url) .pathname .split ('/')
path [path.length-1] = ''
const __dirname = path.join ('/')

const e = Domex.fromFile (__dirname + '/test.dx', (err,dx) => {
  if (err) log (err)
  else dx.renderTo ({ name:'joe' }, process.stdout)
})

