DOM Expression
==============

**Note** —  Work in progress —  Going well — v0.1.0.

A new expression language for constructing DOM trees from data!

The language is inspired by [Emmet][1], which I think is a really nice algebraic language. DOM Expressions are similar, but unlike Emmet expressions, they define how to convert input data to a DOM tree. Thus, they define render functions. This means that they serve the same purpose as a template language. 

DOM Expressions are very concise and they look quite a bit like datatype declarations of functional languages. 
So I think of them as a description language for the graphical user interface of a web application. I have some ideas for creating a library for web UI component programming with it.  

At the moment it is a **very small** library, the minified version is around **4k** bytes. 


[1]: https://docs.emmet.io/abbreviations/

Example
-------

**Lists**

A simple example for building lists: The following results in a DOM tree for the HTML below it. (I've added whitespace to the HTML for readability). 

```javascript
dom `ul > (li %)*` ([1,2,3]) .elem
```
```html
<ul>
  <li>1</li>
  <li>2</li>
  <li>3</li>
 </ul>
```

Another example, for building definition lists from objects:

```javascript
dom `dl > (dt $ + dd %)*` ({ foo:1, bar:2 }) .elem
```
```html
<dl>
  <dt>foo</dt><dd>1</dd>
  <dt>bar</dt><dd>2</dd>
</dl>
```


**Recursion**

It is possible to construct recursive DOM expressions. 
Currently you need to do a bit of extra work to set up a 'library' object of DOM expressions to make the recursive references work and pass that as a second argument to `render`.

**TODO**

Grammar
-------

<center>
**Expressions**

_E_ ::=   

tag-name     |     Ident  

_E_ `|` _E_     |     _E_ `>` _E_     |     _E_ `+` _E_  

_E_ `*`     |     _E_ `*`prop     |     _E_ `?`test  

`(` _E_ `)`  

_E_ `.`class     |     _E_ `#`id     |     _E_ `@`ref  

_E_ `{`text`}` |     _E_ `$`     |     _E_ `%`     |     _E_ `%`prop  
</center>

**TODO**  

- Review the operator precedence;
- Add `%` et al. as atoms as well;  
- Add **Recursion** and/ or references;  
- Consider adding _E_`*`_prop_.

Semantics
---------

DOM Expressions denote render **functions** that take structured data as input to a list of DOM Nodes as output<sup>1</sup>.

**TODO:** Examples

<small>1</small>: together with a dictionary of stored references to specific elements. 

### Basic Combinators

- _element-name_ — creates a singleton list with a single _element-name_-element.
- _E1_ `>` _E2_ — adds _E2_ as children to the last element of _E1_.
- _E1_ `+` _E2_ — adds _E2_ as siblings to _E1_.

### Repetition :=: Decomposition

- _E_`*` — evaluates _E_ against each key-value pair in the current input and combines the results into a list of siblings. 
- _E_`?`_test_ — runs a test named _test_ against the current input and evaluates _E_ if true, or returns an empty sequence otherwise. 
- _E1_ `|` _E2_ — the 'or-else' operator – is equivalent to _E2_ if _E1_ evaluates to an empty list, otherwise it is equivalent to _E1_. 


Note that the `*` operator can be nested.  

### Attributes and References

- _E_`.`_class_ — adds _class_ to the `class` attribute of the last element of _E_.
- _E_`#`_id_ — sets the `id` attribute of the last element of _E_ to _id_.
- _E_`@`_ref_ — evaluates _E_ and **keeps a reference** to its last element under the name _ref_. (This is very useful — Refer to the API section to see how this can be used). 
- **TODO:** consider adding Emmet-style attributes, such as `[attr=value]`)

### Text and Data

- _E_ `%` — Appends the key of the current input to the last element of _E_ as a text node. 
- _E_ `%` — Appends a string representation of the current input to the last element of _E_. 
- _E_ `%`_prop_ — Appends a string representation of the current input's _prop_ property to the last element of _E_. 
- _E_ `{`_text_`}` — appends literal text _text_ to the last element of _E_.

API
---

**TODO**

- DomExp
  - constructor (expressionString)
  - render (data)
- RenderResult
  - elem
  - elems
  - refs
- DataSource
  - iter
  - test
  - get


Licence
-------

I have not yet decided. Something liberal, maybe somewhat copyleft. 
