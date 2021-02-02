const { DomEx, domex } = require ('../src')

// Test
// ====

var sampleData = { name:'test', bar:undefined, foo:null, arr:[1,2,'x',3] }

var sample = domex `ul > li > a [href="#"] > "hello, world"`
  //.renderTo (null, process.stdout)

var sample = domex `
( span#t:number    > %
| span:string    > %
| span:null      > "null"
| span:undefined > "undefined"
| ul:array       > li* > @json
| dl:object      > di* > (dt > $) + (dd > @json)
| span           > "unknown"
) @json;

body > div > @json
`

sample.renderTo (sampleData, process.stdout)
process.exit (205)


const e = DomEx.fromFile ('./test.dx', (err,dx) => {
  if (err) log (err)
  else dx.renderTo ({ name:'joe' }, process.stdout)
  process.exit (205) 
})

