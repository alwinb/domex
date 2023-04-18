const log = console.log.bind (console)
function* range (a, z = Infinity) { while (a <= z) yield a++ }
function assert (arg, message) { if (!arg) throw new Error ('Assertion Failed: ' + message ?? '') }


// Character Equivalence classes
// -----------------------------

const eqclasses = [
//NUL SOH STX ETX EOT ENQ ACK BEL BS  HT  LF  VT  FF  CR  SO  SI
   0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  2,  0,  0,  3,  0,  0, 
//DLE DC1 DC2 DC3 DC4 NAK SYN ETB CAN EM  SUB ESC FS  GS  RS  US
   0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, 
// SP  !   "   #   $   %   &   '   (   )   *   +   ,   -   .   /                    
   4,  5,  6,  7,  8,  9,  5,  5,  10, 11, 28, 12, 5,  13, 14, 30, // Out of order
// 0   1   2   3   4   5   6   7   8   9   :   ;   <   =   >   ?
   18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 16, 17, 5,  29, 12, 5, // Out of order
// @   A   B   C   D   E   F   G   H   I   J   K   L   M   N   O
   15, 19, 19, 19, 19, 19, 19, 20, 20, 20, 20, 20, 20, 20, 20, 20,
// P   Q   R   S   T   U   V   W   X   Y   Z   [   \   ]   ^   _
   20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 21, 22, 23, 5,  24,
// '   a   b   c   d   e   f   g   h   i   j   k   l   m   n   o
   5,  25, 25, 25, 25, 25, 25, 26, 26, 26, 26, 26, 26, 26, 26, 26,
// p   q   r   s   t   u   v   w   x   y   z   {   |   }   ~  DEL
   26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 5,  12, 5,  27, 0 ] // ++ .{ 0 } ** 128;

const num_classes = 31; // max + 1 for 0
assert (eqclasses.length === 128, 'Character class table length')


// DFA
// ---

// ### States

const [
  FAIL, // Determined non-accepting
  MAIN, BIND, STR,  ESC,  ATTS, S1,   S2,   COL,  COL2, AVAL, // Contiguous non-accepting
  ATEQ, ATOP, SID,  ATN,  ELN,  TVAL, ITER, IDEN, OP,   DATA,  COM, WSPS, WSCR, // Contiguous accepting
  WSNL, LPAR, RPAR, LQUO, RQUO, EQ,   KEY,  LBRA, RBRA, // Determined accepting
] = range (0)

const min_accepting = ATEQ;
const min_epsilon   = WSNL;


// ### Transitions

// TODO \xhh \u1234 \u{} escape sequences
// Fix the line comments (comment ends)

const ___ = FAIL // cosmetic
const transitions = [
//0      1    2     3     4     5     6    7      8    9     10      11    12    13    14    15    16    17    18    19    20    21   22
//___, MAIN, BIND, STR , ESC , ATTS, S1  , S2  , COL ,COL2, AVAL,   ATEQ, ATOP, SID , ATN , ELN , TVAL, ITER, IDEN,  OP , DATA, COM, WSPS, WSCR 
 ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , //  C0_
 ___ , WSPS, WSPS, DATA, ___ , WSPS, ___ , COM , ___ , ___ , WSPS,  WSPS, WSPS, ___ , ___ , ___ , ___ , ___ , ___ , WSPS, DATA, COM , WSPS, ___ , //  HT  
 ___ ,-WSNL,-WSNL,-WSNL, ___ ,-WSNL, ___ , ___ , ___ , ___ ,-WSNL, -WSNL,-WSNL, ___ , ___ , ___ , ___ , ___ , ___ ,-WSNL, ___ , ___ ,-WSNL,-WSNL, //  LF  
 ___ , WSCR, WSCR, WSCR, ___ , WSCR, ___ , ___ , ___ , ___ , WSCR,  WSCR, WSCR, ___ , ___ , ___ , ___ , ___ , ___ , WSCR, ___ , ___ , WSCR, ___ , //  CR  
 ___ , WSPS, WSPS, DATA, ___ , WSPS, ___ , COM , ___ , ___ , WSPS,  WSPS, WSPS, ___ , ___ , ___ , ___ , ___ , ___ , WSPS, DATA, COM , WSPS, ___ , //  SP  
 ___ , ___ , ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , DATA, COM , ___ , ___ , // other
 ___ ,-LQUO, ___ ,-RQUO,-ESC , ___ , ___ , COM , ___ , ___ ,-LQUO,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , COM , ___ , ___ , //  "  
 ___ , SID , ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , DATA, COM , ___ , ___ , //  #  
 ___ ,-KEY , ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ ,-KEY ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , DATA, COM , ___ , ___ , //  $  
 ___ , TVAL, ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ , TVAL,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , DATA, COM , ___ , ___ , //  %  // REVIEW SID
 ___ ,-LPAR, ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , DATA, COM , ___ , ___ , //  (  
 ___ , ___ , ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ ,-RPAR, DATA, COM , ___ , ___ , //  )  
 ___ , ___ , ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , -OP , DATA, COM , ___ , ___ , // infix
 ___ , ___ , ___ , DATA, ___ , ATN , ___ , COM , SID , SID , ATN ,  ___ , ___ , SID , ATN , ELN , ___ , ___ , ___ , ___ , DATA, COM , ___ , ___ , //  -  
 ___ , SID , ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , DATA, COM , ___ , ___ , //  .  
 ___ , ELN , ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , SID , DATA, COM , ___ , ___ , //  @  // REVIEW ELN
 ___ , ___ , ___ , DATA, ___ , ___ , ___ , COM , COL2, ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , COL , DATA, COM , ___ , ___ , //  :  
 ___ , ___ , ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , -OP , DATA, COM , ___ , ___ , //  ;  
 ___ , ___ , ___ , DATA, ___ , ATN , ___ , COM , SID , SID , ATN ,  ___ , ___ , SID , ATN , ELN , TVAL, ITER, IDEN, ___ , DATA, COM , ___ , ___ , //  0-9 
 ___ , ELN , IDEN, DATA, ___ , ATN , ___ , COM , SID , SID , ATN ,  ___ , ___ , SID , ATN , ELN , TVAL, ITER, IDEN, ___ , DATA, COM , ___ , ___ , //  A-F 
 ___ , ELN , IDEN, DATA, ___ , ATN , ___ , COM , SID , SID , ATN ,  ___ , ___ , SID , ATN , ELN , TVAL, ITER, IDEN, ___ , DATA, COM , ___ , ___ , //  G-Z 
 ___ ,-LBRA, ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , DATA, COM , ___ , ___ , //  [  
 ___ , ___ , ___ , ESC ,-ESC , ___ , ___ , COM , ___ , ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , COM , ___ , ___ , //  \  
 ___ , ___ , ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ , ___ , -RBRA,-RBRA, ___ , ___ , ___ , ___ , ___ , ___ , ___ , DATA, COM , ___ , ___ , //  ]  
 ___ , ___ , IDEN, DATA, ___ , ATN , ___ , COM , SID , SID , ATN ,  ___ , ___ , SID , ATN , ___ , TVAL, ITER, IDEN, ___ , DATA, COM , ___ , ___ , //  _  
 ___ , ELN , IDEN, DATA, ___ , ATN , ___ , COM , SID , SID , ATN ,  ___ , ___ , SID , ATN , ELN , TVAL, ITER, IDEN, ___ , DATA, COM , ___ , ___ , //  a-f
 ___ , ELN , IDEN, DATA,-ESC , ATN , ___ , COM , SID , SID , ATN ,  ___ , ___ , SID , ATN , ELN , TVAL, ITER, IDEN, ___ , DATA, COM , ___ , ___ , //  g-z // REVIEW ESC
 ___ , ___ , ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ ,-BIND, DATA, COM , ___ , ___ , //  ~  
 ___ , ___ , ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ITER, DATA, COM , ___ , ___ , //  *  
 ___ , ___ , ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ , ___ ,  -EQ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , DATA, COM , ___ , ___ , //  =  
 ___ , S1  , ___ , DATA, ___ , ___ , S2  , COM , ___ , ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , S1  , DATA, COM , ___ , ___   //  /
]

// ATEQ is 'after attribute name'
// AVAL is 'after attribute assign ='
// TODO force WSP between attribute and next attribute name

assert (WSCR === 23, 'Transition table width '+WSCR)
assert (transitions.length === min_epsilon * num_classes, 'Transition table size')


// Operators
// ---------

const Left  = -1
const Assoc = 0
const Right = 1

const optable = {
  // Infix ops // lexer ensures infix position
  ';': [1, Assoc],
  '|': [2, Assoc],
  '+': [3, Right],
  '>': [3, Right],
// REVIEW op precedence
  '~': [6, Left],   // Bind - lexer ensures rhs is an identifier
  '*': [6, Left],   // Bind - lexer ensures rhs is an identifier

   '': [5, Assoc],

  '@': [6, Left],
  ':': [6, Left],
  '::': [6, Left],


  // Postfix ops - Lexer ensures postfix position
  // '.': [6, Left],
  // '#': [6, Left],
  // Attribute Lists
  // '': [1, Assoc], // lexer ensures lhs/rhs are not nested
   // '': [5, Left],
  '=': [8, Assoc], // lexer ensures lhs/rhs are not nested
}


// Runtime
// -------

// NOTE
// OK so I'm making the grammar more uniform/ consistent,
// by allowing elem, text, and attribute-lists on the same level.
// That seems good, but now I need type assignments


function Parser (delegate, entryState = MAIN) {

  // DFA driver state

  let entry = entryState
  let anchor = 0, end = 0, pos = 0
  let line = 1, lastnl = 0

  // Tokeniser State

  let depth = 0 // parens / nesting depth
  let afterString = MAIN

  // Shunting yard

  const ops = []
  const arities = [] // arities for ops
  const depths = [] // depths for ops
  const operands = []

  // Methods

  this.parse = function (input) {
    this.write (input)
    // this.end ()
  }

  this._tree = function () {
    return { operands, ops, arities, depths }
  }

  this.write = function write (input) {
    const length = input.length
    while (pos < length) {

      // log ({entry})
      let state = entry
      let match = state >= min_accepting ? (end = pos, state) : FAIL

      while (state > 0 && pos < length) {
        const c = input.charCodeAt (pos++)
        const cc = c <= 128 ? eqclasses[c] : eqclasses (0)
        // log ({state, c:input[pos-1], cc})
        state = transitions [cc * min_epsilon + state];
        // log ('==>', state)
        if (state >= min_accepting) (match = state, end = pos)
      }
      if (state < 0) (match = -state, end = pos) // epsilon states coded as negative ints
      let _entry = entry


      switch (match) {

        case FAIL:
          throw new Error (createErrorMessage (input))

        // Domex context

        case LPAR:
          depth++; entry = MAIN; break;

        case ELN : case IDEN: // Operand
          operands.push ([match, input.substring (anchor, end)]);
          entry = OP; break

        case KEY: case TVAL: // Operand, NB May occur also in attribute lists.
          operands.push ([match, input.substring (anchor, end)]);
          entry = entry === AVAL ? ATOP : OP
        break

        case OP: // Operator
          pushOperator ([match, input.substring (anchor, end)])
          entry = MAIN
        break;

        case ITER: // Operator with conneced rhs
          pushOperator ([match, '*'], 2)
          operands.push ([IDEN, input.substring (anchor+1, end)])
          entry = OP
        break

        case BIND: // Pseudo-infix operator ~ // REVIEW identifier/vs elem after * op?
          pushOperator ([match, input.substring (anchor, end)])
          entry = BIND
        break

        case SID: // TODO clean up
          const ch = input[anchor];
          if (ch === ':' && input[anchor+1] === ch) {
            pushOperator ([match, '::'], 2)
            operands.push ([match, input.substring (anchor+2, end)]);
            entry = OP
          }
          else if (ch === '@' || ch === ':') {
            pushOperator ([match, ch], 2)
            operands.push ([match, input.substring (anchor+1, end)]);
            entry = OP
          }
          else {
            operands.push ([match, input.substring (anchor, end)]);
            entry = entry === MAIN || entry === BIND || entry === OP ? OP : ATOP
          }
        break

        case RPAR:
          if (depth == 0) 
            throw new Error (createErrorMessage (input, 'Misnested parenthesis'))
          depth--
          entry = OP
        break


        // Attribute Lists
        
        case LBRA:
          depth++
          entry = ATTS
        break

        case ATN:
          operands.push ([match, input.substring (anchor, end)])
          entry = entry === AVAL ? ATOP : ATEQ // REVIEW
        break

        case ATEQ: 
          pushOperator ([match, input.substring (anchor, end)], 2)
          entry = ATTS
        break

        case ATOP:
          pushOperator ([match, input.substring (anchor, end)], 2)
          entry = ATTS
        break
          
        case EQ:
          pushOperator ([match, input.substring (anchor, end)], 2)
          entry = AVAL
        break;

        case RBRA:
          // Lexer ensures depth > 1
          _endgroup (depth)
          const l = operands.length-1
          operands[l] = [[LBRA, 'attrs'], operands[l]]
          depth--
          entry = OP
        break

        // Strings

        case LQUO: // begin group: quoted string
          depth++
          afterString = entry === MAIN ? OP : ATOP;
          ops.push ([LQUO, 'string'])
          arities.push (0)
          depths.push (depth)
          entry = STR
        break

        case ESC:
          let e = input[end-1]
          if ('nrt"\\'.indexOf(e) < 0)
            throw new Error (createErrorMessage (input, 'Invalid escape sequence'))
          operands.push ([match, input.substring (anchor, end)])
          arities[arities.length-1]++
          entry = STR
        break

        case DATA: // Operand // TODO WSNL in strings
          operands.push ([match, input.substring (anchor, end)])
          arities[arities.length-1]++
        break

        case RQUO:
          _endgroup (depth);
          depth--
          entry = afterString
        break

        // Newlines

        case WSNL: // TODO newlines in strings
          line++
          lastnl = pos
          // entry = entry // (no change)
        break;

        // default:
        // (no change).
      }

      // Emit
      // log ([match, input.substring (anchor, end)])
      delegate.write ([match, input.substring (anchor, end)], _entry)

      anchor = pos = end
    }
    
    _end (input)
  }

  // Private

  function createErrorMessage (input, desc = 'Syntax error') {
    const col = pos - lastnl
    const before = input.substr (pos-1, 12)
    return `${desc} at line ${line}:${pos-lastnl}; before ${before} ; byte index ${pos}\n`
  }

  function _endgroup (depth) {
    // log ('endgroup', {depth, operands, ops})
    for (let i=ops.length-1; i>=0 && depths[i]>=depth; i--)
      _apply (ops.pop (), arities.pop (), depths.pop ())
  }

  function _end (input) {
    if (depth !== 0)
      throw new Error (createErrorMessage (input, 'Misnested parenthesis')) // or string!
    for (let i=ops.length-1; i>=0; i--)
      _apply (ops.pop (), arities.pop (), depths.pop ())
  }

  function pushOperator (op_b, arity=2) {
    loop: while (1) {
      let action = Right // if no operators on op stack, else

      if (ops.length > 0) {
        const op_a = ops[ops.length-1]
        const [a_rank, a_assoc] = optable [op_a[1]]
        const [b_rank, b_assoc] = optable [op_b[1]]
        const top_depth = depths[ops.length-1]

        action =
          top_depth < depth  ? Right :
          top_depth > depth  ? Left  :
          a_rank    > b_rank ? Left  :
          a_rank    < b_rank ? Right :
          a_assoc  // last case should assert a_assoc == b_assoc in the operator table
      }

      switch (action) { 
        case Left:
          _apply (ops.pop (), arities.pop (), depths.pop ())
          continue loop

        case Assoc:
          arities[arities.length-1]++;
          break loop

        case Right:
          ops.push (op_b)
          arities.push (arity) // TODO extend for postfix ops
          depths.push (depth)
          break loop
      }
    }
  }

  // AST construction
  function _apply (op, arity) {
    // log ('apply', ({ operands, ops, arity, op}))
    // Assumes operands.length >= arity
    const args = []
    while (arity--) args.unshift (operands.pop ()) 
    apply (op, ...args)
    operands.push ([op, ...args])
    // log ('apply result', op, ({ operands, ops }))
  }

}


// So what is the type language?
// And what else do I want to track?
// - baseType := TextNode | ElementNode // | AttList, AttName, AttVal,
// - Static / Dynamic
// - NodeList (Min_length, Max_length, Peer_NodeType)
// - Peer_NodeType := Elem | TextNode | ElemOrTextNode
// - Used references (list of @calls)
// - ....

function apply (op, ...args) {
  switch (op) {

    case LBRA:
    // type = AttributeList
    case ATOP:
      // assert children are name=value pairs
      // else set value to ''
      // type is AttributeListInner (irrelevant, safe by grammar)
    // case ATN:
    // case RBRA:
    // case ATEQ:
    // case EQ:

    case SID:

    case ELN:
      // type = Static, NodeList (ElementNode, 1, 1)

    case KEY:
      // type = Dynamic, NodeList (TextNode, 1, 1)

    case TVAL:
      // type = Dynamic, NodeList (TextNode, 1, 1)

    case ITER:
      // assert left.type is subtype of NodeList
      // type = Dynamic,  NodeList (left.type, 0, Inf)

    case IDEN:
      // ...

    case OP: // spit out....
      // Dynamic if one of lhs or rhs is
      // case + => type = NodeList (peer(lhs.type, rhs.type), min(lhs.min, rhs.min), max (lhs.max, rhs.max)) // (unless some empty?)
      // case | => implement type union
      // case > --> assert left has only elements? --> type of lhs
      // case apply --> assert left has only elems --> type of lhs

    case LQUO:
      // type = TextNode | AttValue

    // case RQUO:
    // case ESC:
    // case DATA:
    // case COM:
    // case WSPS:
    // case WSCR :
    // case WSNL:

    default: log (op)
  }
}

// Exports
// -------

export { Parser }