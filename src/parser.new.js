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
   15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 17, 5,  29, 12, 5, // Out of order
// @   A   B   C   D   E   F   G   H   I   J   K   L   M   N   O
   18, 19, 19, 19, 19, 19, 19, 20, 20, 20, 20, 20, 20, 20, 20, 20,
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
  FAIL,   // Determined non-accepting
  MAIN, BIND, STR,  ESC,  ATTS, S1,   S2,   COL, // Contiguous non-accepting
  ATT2, ATT3, SID,  ELEM, ATN, IDEN, POST, DATA, COMM, WSPS, WSCR,  // Contiguous accepting
  WSNL, INFX, LPAR, RPAR, LQUO, RQUO, CONS, EQ, KEY, LBRA, RBRA,   // Determined accepting
] = range (0)

const min_accepting = ATT3;
const min_epsilon   = WSNL;


// ### Transitions

const ___ = FAIL // cosmetic
const transitions = [
//0      1    2     3     4     5     6    7    8    9     10    11    12    13    14    15    16    17    18    19
//___, MAIN, BIND, STR , ESC , ATTS, S1 , S2 , COL, ATT2, ATT3, SID , ELEM, ATN , IDEN, POST, DATA, COMM, WSPS, WSCR 
 ___ , ___ , ___ , ___ , ___ , ___ , ___, ___, ___, ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , //  C0_
 ___ , WSPS, WSPS, DATA, ___ , WSPS, ___,COMM, ___, WSPS, WSPS, ___ , ___ , ___ , ___ , WSPS, DATA, COMM, WSPS, ___ , //  HT  
 ___ ,-WSNL,-WSNL,-WSNL, ___ ,-WSNL, ___, ___, ___,-WSNL,-WSNL, ___ , ___ , ___ , ___ ,-WSNL, ___ , ___ ,-WSNL,-WSNL, //  LF  
 ___ , WSCR, WSCR, WSCR, ___ , WSCR, ___, ___, ___, WSCR, WSCR, ___ , ___ , ___ , ___ , WSCR, ___ , ___ , WSCR, ___ , //  CR  
 ___ , WSPS, WSPS, DATA, ___ , WSPS, ___,COMM, ___, WSPS, WSPS, ___ , ___ , ___ , ___ , WSPS, DATA, COMM, WSPS, ___ , //  SP  
 ___ , ___ , ___ , DATA, ___ , ___ , ___,COMM, ___, ___ , ___ , ___ , ___ , ___ , ___ , ___ , DATA, COMM, ___ , ___ , // other
 ___ ,-LQUO, ___ ,-RQUO,-ESC , ___ , ___,COMM, ___, ___ ,-LQUO, ___ , ___ , ___ , ___ , ___ , ___ , COMM, ___ , ___ , //  "  
 ___ , SID , ___ , DATA, ___ , ___ , ___,COMM, ___, ___ , ___ , ___ , ___ , ___ , ___ , SID , DATA, COMM, ___ , ___ , //  #  
 ___ ,-KEY , ___ , DATA, ___ , ___ , ___,COMM, ___, ___ ,-KEY , ___ , ___ , ___ , ___ , ___ , DATA, COMM, ___ , ___ , //  $  
 ___ , IDEN, ___ , DATA, ___ , ___ , ___,COMM, ___, ___ , IDEN, ___ , ___ , ___ , ___ , ___ , DATA, COMM, ___ , ___ , //  %  // REVIEW IDEN
 ___ ,-LPAR, ___ , DATA, ___ , ___ , ___,COMM, ___, ___ , ___ , ___ , ___ , ___ , ___ ,-LPAR, DATA, COMM, ___ , ___ , //  (  
 ___ , ___ , ___ , DATA, ___ , ___ , ___,COMM, ___, ___ , ___ , ___ , ___ , ___ , ___ ,-RPAR, DATA, COMM, ___ , ___ , //  )  
 ___ , ___ , ___ , DATA, ___ , ___ , ___,COMM, ___, ___ , ___ , ___ , ___ , ___ , ___ ,-INFX, DATA, COMM, ___ , ___ , // infix
 ___ , ___ , ___ , DATA, ___ , ATN , ___,COMM, SID, ___ , ATN , SID , ELEM, ATN , ___ , ___ , DATA, COMM, ___ , ___ , //  -  
 ___ , ___ , ___ , DATA, ___ , ___ , ___,COMM, ___, ___ , ___ , ___ , ___ , ___ , ___ , SID , DATA, COMM, ___ , ___ , //  .  
 ___ , ___ , ___ , DATA, ___ , ATN , ___,COMM, SID, ___ , ATN , SID , ELEM, ATN , IDEN, ___ , DATA, COMM, ___ , ___ , //  0-9 
 ___ , ___ , ___ , DATA, ___ , ___ , ___,COMM, SID, ___ , ___ , ___ , ___ , ___ , ___ , COL , DATA, COMM, ___ , ___ , //  :  
 ___ , ___ , ___ , DATA, ___ , ___ , ___,COMM, ___, ___ , ___ , ___ , ___ , ___ , ___ ,-INFX, DATA, COMM, ___ , ___ , //  ;  
 ___ , SID , ___ , DATA, ___ , ___ , ___,COMM, ___, ___ , ___ , ___ , ___ , ___ , ___ , SID , DATA, COMM, ___ , ___ , //  @  
 ___ , ELEM, IDEN, DATA, ___ , ATN , ___,COMM, SID, ___ , ATN , SID , ELEM, ATN , IDEN, ___ , DATA, COMM, ___ , ___ , //  A-F 
 ___ , ELEM, IDEN, DATA, ___ , ATN , ___,COMM, ___, ___ , ATN , SID , ELEM, ATN , IDEN, ___ , DATA, COMM, ___ , ___ , //  G-Z 
 ___ , ___ , ___ , DATA, ___ , ___ , ___,COMM, SID, ___ , ___ , ___ , ___ , ___ , ___ ,-LBRA, DATA, COMM, ___ , ___ , //  [  
 ___ , ___ , ___ , ESC ,-ESC , ___ , ___,COMM, ___, ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , COMM, ___ , ___ , //  \  
 ___ , ___ , ___ , DATA, ___ ,-RBRA, ___,COMM, ___,-RBRA,-RBRA, ___ , ___ , ___ , ___ , ___ , DATA, COMM, ___ , ___ , //  ]  
 ___ , ___ , IDEN, DATA, ___ , ATN , ___,COMM, SID, ___ , ATN , SID , ___ , ATN , IDEN, ___ , DATA, COMM, ___ , ___ , //  _  
 ___ , ELEM, IDEN, DATA,-ESC , ATN , ___,COMM, SID, ___ , ATN , SID , ELEM, ATN , IDEN, ___ , DATA, COMM, ___ , ___ , //  a-f // REVIEW ESC
 ___ , ELEM, IDEN, DATA,-ESC , ATN , ___,COMM, SID, ___ , ATN , SID , ELEM, ATN , IDEN, ___ , DATA, COMM, ___ , ___ , //  g-z // REVIEW ESC
 ___ , ___ , ___ , DATA, ___ , ___ , ___,COMM, ___, ___ , ___ , ___ , ___ , ___ , ___ ,-BIND, DATA, COMM, ___ , ___ , //  ~  
 ___ , ___ , ___ , DATA, ___ , ___ , ___,COMM, ___, ___ , ___ , ___ , ___ , ___ , ___ ,-BIND, DATA, COMM, ___ , ___ , //  *  
 ___ , ___ , ___ , DATA, ___ , ___ , ___,COMM, ___,-EQ  , ___ , ___ , ___ , ___ , ___ , ___ , DATA, COMM, ___ , ___ , //  =  
 ___ , S1  , ___ , DATA,-ESC , S1  , S2 ,COMM, ___, ___ , ___ , ___ , ___ , ___ , ___ , S1  , DATA, COMM, ___ , ___   //  "/" // REVIEW ESC
]

// ATT2 is 'after attribute name'
// ATT3 is 'after attribute assign ='
// TODO force WSP between attribute and next attribute name

assert (WSCR === 19, 'Transition table width '+WSCR)
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
  '+': [4, Right],
  '>': [4, Right],
   '': [5, Left], 
  '~': [6, Left], // Bind - lexer ensures rhs is an identifier
  // Postfix ops - Lexer ensures postfix position
  // '.': [6, Left],
  // '#': [6, Left],
  // '@': [6, Left],
  // ':': [6, Left],
  // Attribute Lists
  // '': [1, Assoc], // lexer ensures lhs/rhs are not nested
  '=': [2, Assoc], // lexer ensures lhs/rhs are not nested
}


// Runtime
// -------

function Parser (delegate, entryState = MAIN) {

  // DFA driver state

  let entry = entryState
  let anchor = 0, end = 0, pos = 0
  let line = 1, lastnl = 0

  // Parser state

  let afterString = MAIN
  let depth = 0 // nesting depth
  const operands = [] // shunting yard
  const ops = [], ars = [], depths = [];
  
  this.parse = function (input) {
    this.write (input)
    // this.end ()
  }

  this._tree = function () {
    return { operands, ops, ars, depths }
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

        case RPAR:
          if (depth == 0) 
            throw new Error (createErrorMessage (input, 'Misnested parenthesis'))
          depth--; entry = POST; break;

        case INFX:
          handleInfix ([match, input.substring (anchor, end)])
          entry = MAIN; break;

        case POST: // POST token match corresponds to implicit infix juxstaposition
          handleInfix ([match, input.substring (anchor, end)])
          entry = MAIN; break;

        case BIND: // BIND token match corresponds to pseudo-infix ~ (and/or *)
          handleInfix ([match, input.substring (anchor, end)])
          entry = BIND; break;// REVIEW identifier/vs elem after * op?

        case ELEM: case IDEN: case SID: case KEY: // Operand
          operands.push ([match, input.substring (anchor, end)]); // TODO not (always) for SID
          entry = entry === MAIN || entry === BIND ? POST : ATTS; break // FIXME dont use SID for %name in ATTS


        // Attribute Lists
        
        case LBRA:
          depth++; entry = ATTS; break // Begin attribute list

        case RBRA:
          // Lexer ensures depth > 1
          // FIXME turn into higher order operator
          depth--; entry = POST; break

        case ATT2: case ATT3:
           entry = ATTS; break // Begin attribute list

        case ATN:
          operands.push ([match, input.substring (anchor, end)])
          entry = entry === ATTS ? ATT2 : ATTS; break; // After Attribute Name

        case EQ:
          handleInfix ([match, input.substring (anchor, end)])
          entry = ATT3; break;

        // Strings

        case LQUO:
          afterString = entry === MAIN ? POST : ATTS;
          entry = STR; break;

        case ESC:
          let e = input[end-1]
          if ('nrt"\\'.indexOf(e) < 0)
            throw new Error (createErrorMessage (input, 'Invalid escape sequence'))
          entry = STR; break;
        
        case DATA: // Operand
          operands.push ([match, input.substring (anchor, end)])
          break;

        case RQUO:
          entry = afterString; break;

        // Newlines

        case WSNL:
          // entry = entry // (no change)
          line++; lastnl = pos; break;

        // default:
        // (no change).
      }

      // Emit
      // log ([match, input.substring (anchor, end)])
      delegate.write ([match, input.substring (anchor, end)], _entry)

      anchor = pos = end
    }
    
    _end ()
  }

  function _end () {
    // End of input; apply all remaining operators
    for (let i=ops.length-1; i>=0; i--)
      _apply (ops.pop (), ars.pop (), depths.pop ())
  }

  // Private

  function createErrorMessage (input, desc = 'Syntax error') {
    const col = pos - lastnl
    const before = input.substr (pos-1, 12)
    return `${desc} at line ${line}:${pos-lastnl}; before ${before} ; byte index ${pos}\n`
    
  }

  function handleInfix (op_b) {
    while (1) {
      let action;

      if (ops.length === 0)
        action = Right

      else {
        const op_a = ops[ops.length-1]
        log (op_a)
        const [a_rank, a_assoc] = optable [op_a[1]]
        const [b_rank, b_assoc] = optable [op_b[1]]
        const top_depth = depths[ops.length-1]

      action
        = top_depth < depth ? Right
        : top_depth > depth ? Left
        : a_rank > b_rank   ? Left
        : a_rank < b_rank   ? Right
        : a_assoc  // last case should assert a_assoc == b_assoc in the operator table
      }

      if (action === Left)
        _apply (ops.pop (), ars.pop (), depths.pop ())
        // and retry -- back to while

      else if (action === Assoc) {
        ars[l]++;
        break
      }
      
      else if (action === Right) {
        ops.push (op_b)
        ars.push (2) // TODO extend for postfix ops
        depths.push (depth)
        break;
      }
    }
  }


  // AST construction
  function _apply (op, arity) {
    log ('apply', { operands, ops, arity, op})
    // Assumes operands.length >= arity
    const args = operands.slice (operands.length - arity)
    operands.length -= arity
    operands.push ([op, ...args])
  }

}


// Exports
// -------

export { Parser }