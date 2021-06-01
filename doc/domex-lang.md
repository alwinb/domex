The Domex Language
==================

Domex is an expression language for creating DOM trees from input data.
It serves the purpose of a template language, but it is quite different from traditional template languages. 
Instead it has taken on some of the characteristics of a specification, or a data description language. 


Grammar
-------

The abstract syntax of Domex is given by the following grammar. 

<center>

### DOM Expressions

_E_ ::=   

_elem_     |     _text_     |     `@`_ref_     |     `$`     |     `%`

_E_ `.`_class_     |     _E_ `#`_id_     |     _E_ `[`_Attrs_`]`

_E_ `>` _E_     |     _E_ `+` _E_     |     _E_ `|` _E_  

_E_ `*`     |     _E_ `~`_prop_

_E_ `@`_name_     |     _E_ `;` _E_

_E_ `:`_test_       |     _E_ `::`_type-test_

`(` _E_ `)`  

### Attribute Expressions

Attrs ::=     A  Attrs

A ::=     _attr-name_      |     _attr-name_ `=` _V_

V ::=     _text_     |     `$`     |     `%`

</center>


Semantics
---------

DOM Expressions denote render **functions** that take structured data as input to a list of DOM Nodes as output. 

### Primitives

- _tag-name_ — creates a singleton list with a single _tag-name_-element.
- _text_ — creates a singleton list with a single text-node.
- `@`_ref_  — refers to an expression with the name _ref_ in scope.  
- `$` — creates a singleton list with the key of the current input as a text-node. 
- `%` — creates a singleton list with the current input converted to a text-node. 


### Attributes

- _E_`.`_class_ — adds _class_ to the `class` attribute of the last element of _E_.
- _E_`#`_id_ — sets the `id` attribute of the last element of _E_ to _id_.
- _E_`[`_name_`=`_value_`]` — adds an attribute named _name_ with value _value_ to the last element of the result of _E_. 


### Child and Sibling Combinators

- _E1_ `>` _E2_ — adds _E2_ as children to the last element of _E1_.
- _E1_ `+` _E2_ — adds _E2_ as siblings to _E1_.
- _E1_ `|` _E2_ — the 'or-else' operator – is equivalent to _E2_ if _E1_ evaluates to an empty list, otherwise it is equivalent to _E1_. 

**Note**: I am still looking at the design of the `>` operator, and similarily the attribute operators. The question is, should they indeed only 'apply to the last element'? 


### Decomposition :=: Selection and Iteration

- _E_`*` — evaluates _E_ against each key-value pair in the current input and combines the results into a list of siblings. 
- _E_ `~`_name_ — evaluates _E_ against the property named _name_ of the input data.

Shorthands:

- The notation `%`_name_ may be used as a shorthand for `%` `~`_name_.  
- Likewise, _E_ `%`_name_ may be used for _E_ `%` `~`_name_.  
- Likewise, _E_ `*`_name_ is a shorthand for _E_ `*` `~`_name_.

The `*` operator is made to distribute over `>` as follows: (_E1_`*` `>` _E2_)  =  (_E1_ `>`_E2_)`*`.  
For example, `dl > di* > dt $ + dd %` is equivalent with `dl > (di > dt $ + dd %)*`.


### Append operator

- _E_ _text_ — appends _text_ the last element of _E_.
- _E_ `$` — Appends the key of the current input to the last element of _E_ as a text node. 
- _E_ `%` — Appends a string representation of the current input to the last element of _E_. 

**Note**: The design of the append operator with dynamic content (i.e. the last two items) is still somewhat problematic and may require some changes. Naïvely _E_ `%` is a shorthand for (_E_ `>` `%`), however the `~` operator is made to distribute over `>`, e.g. `span ~name > %` is equivalent to `(span > %) ~name`. Thus the question is, what should the semantics of e.g. `div ~prop %` be?


### Named expressions

- _E_`@`_name_ — assigns the expression _E_ the name _name_. Used in declarations and in recursive expressions. 
- _E1_ `;` … _En_ `;` _E_ – declaration list; use the named expressions in _E1_ … _En_ in the evaluation of _E_. 


### Conditionals

- _E_`:`_test_ — runs a test named _test_ against the current input and evaluates _E_ if true, or returns an empty sequence otherwise. 
- _E_`::`_test_ — runs a type-test named _test_ against the current input and results in _E_ if true, or in the empty sequence otherwise. 


