Domex
=====

Domex is an expression language for creating DOM trees from input data. In Domex, expressions denote render **functions** that take structured data as input to a sequence of DOM Nodes as output; or to the HTML serialisation thereof. 

Domex serves the purpose of a template language, even though it isn't really a template language in the traditional sense. It is... different. 
It takes on some of the characteristics of a specification or a data description language. 

Part of the language is inspired by [Emmet][1], which I think is a really nice algebraic language.  

The main design goal is to create a language that relates input data to HTML in a way that makes progressive enhancement just as easy as the combination of HTML and CSS does. 

[1]: https://docs.emmet.io/abbreviations/

Examples
--------

Some examples to get an impression. 
The examples consists of three sections:

1. The Domex ("DOM expression"),
2. The input data, here as JSON,
3. The HTML output, with whitespace added for readability. 

**Lists**

```domex
 ul > li* %
```
```json
[ "One", "Two", "Three" ]
```
```html
<ul>
  <li>One</li>
  <li>Two</li>
  <li>Three</li>
</ul>
```

**Definition Lists**

```domex
dl > (dt $ + dd %)*
```
```json
{ "foo":1, "bar":2 }
```
```html
<dl>
  <dt>foo</dt><dd>1</dd>
  <dt>bar</dt><dd>2</dd>
</dl>
```

**Recursion**

An example that renders nested lists, illustrating a named expression `ul@list > …`, iteration `(…)*`, a recursive reference `@list`, a type test `…::array` and an alternative branch `… | li %`.

```domex
ul@list > (@list::array | li %)*
```
```json
[1,[2,3,[4,5]],6]
```
```html
<ul>
  <li>1</li>
  <ul>
    <li>2</li>
    <li>3</li>
      <ul>
        <li>4</li>
        <li>5</li>
      </ul>
    </ul>
  <li>6</li>
</ul>
```

**JSON renderer**

The following domex can be used to render JSON structures to nested `<ul>` and `<dl>` elements. 

```domex
( dl::object > di* > dt $ + (dd > @json)
| ul::array  > li* > @json
| span::null > "null"
| span %
) @json
```

**Login Form**

An example that illustrates the use of a declaration `form @login > … ;` and static and dynamic attributes. 

```domex
// lib

form @login
  > h1 "Login"
  + (label "name" > input [name="name" value=%name])
  + button "login";


// html

html
  > (head > title "login")
  + body > @login
```
```json
{ "name": "joe" }
```
```html
<html>
  <head>
    <title>login</title>
  </head>
  <body>
    <form>
      <h1>Login</h1>
      <label>name<input name="name" value="joe"></label>
      <button>login</button>
    </form>
  </body>
</html>
```

Language
--------

The documentation for the grammar and the semantics of the language so far, can be found [here][domex-lang]

[domex-lang]: doc/domex-lang.md

API
---

- domex 
  A template–literal tag. Returns a new DomEx object. 
- Domex class
  - constructor (domex-string)
  - render (data)
  - renderTo (data, writable)

Licence
-------

I have not yet decided. Something liberal, maybe somewhat copyleft. 
