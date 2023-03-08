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
   4,  5,  6,  7,  8,  9,  5,  5,  10, 11, 27, 12, 5,  13, 14, 29, // Out of order
// 0   1   2   3   4   5   6   7   8   9   :   ;   <   =   >   ?
   15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 17, 5,  28, 12, 5, // Out of order
// @   A   B   C   D   E   F   G   H   I   J   K   L   M   N   O
   18, 19, 19, 19, 19, 19, 19, 20, 20, 20, 20, 20, 20, 20, 20, 20,
// P   Q   R   S   T   U   V   W   X   Y   Z   [   \   ]   ^   _
   20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 21, 22, 23, 5,  24,
// '   a   b   c   d   e   f   g   h   i   j   k   l   m   n   o
   5,  25, 25, 25, 25, 25, 25, 26, 26, 26, 26, 26, 26, 26, 26, 26,
// p   q   r   s   t   u   v   w   x   y   z   {   |   }   ~  DEL
   26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 5,  12, 5,  27, 0 ] // ++ .{ 0 } ** 128;

const num_classes = 30; // max + 1 for 0
assert (eqclasses.length === 128, 'Character class table length')


// DFA
// ---

// ### States

const [
  FAIL,   // Determined non-accepting
  MAIN, BIND, STR,  ESC,  ATTS, S1,   S2,   COL, // Contiguous non-accepting
  ATT3, ATT2, SID,  ELEM, ATN, IDEN, POST, DATA, COMM, WSPS, WSCR,  // Contiguous accepting
  WSNL, INFX, LPAR, RPAR, LQUO, RQUO, CONS, EQ, KEY, LBRA, RBRA,   // Determined accepting
] = range (0)

const min_accepting = ATT3;
const min_epsilon   = WSNL;


// ### Transitions

const ___ = FAIL // cosmetic
const transitions = [
//0      1    2     3     4     5     6    7    8    9     10    11    12    13    14    15    16    17    18    19
//___, MAIN, BIND, STR , ESC , ATTS, S1 , S2 , COL, ATT3, ATT2, SID , ELEM, ATN , IDEN, POST, DATA, COMM, WSPS, WSCR 
 ___ , ___ , ___ , ___ , ___ , ___ , ___, ___, ___, ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , //  C0_
 ___ , WSPS, WSPS, DATA, ___ , WSPS, ___,COMM, ___, WSPS, WSPS, ___ , ___ , ___ , ___ , WSPS, DATA, COMM, WSPS, ___ , //  HT  
 ___ ,-WSNL,-WSNL,-WSNL, ___ ,-WSNL, ___, ___, ___,-WSNL,-WSNL, ___ , ___ , ___ , ___ ,-WSNL, ___ , ___ ,-WSNL,-WSNL, //  LF  
 ___ , WSCR, WSCR, WSCR, ___ , WSCR, ___, ___, ___, WSCR, WSCR, ___ , ___ , ___ , ___ , WSCR, ___ , ___ , WSCR, ___ , //  CR  
 ___ , WSPS, WSPS, DATA, ___ , WSPS, ___,COMM, ___, WSPS, WSPS, ___ , ___ , ___ , ___ , WSPS, DATA, COMM, WSPS, ___ , //  SP  
 ___ , ___ , ___ , DATA, ___ , ___ , ___,COMM, ___, ___ , ___ , ___ , ___ , ___ , ___ , ___ , DATA, COMM, ___ , ___ , // other
 ___ ,-LQUO, ___ ,-RQUO,-ESC , ___ , ___,COMM, ___,-LQUO, ___ , ___ , ___ , ___ , ___ , ___ , ___ , COMM, ___ , ___ , //  "  
 ___ , SID , ___ , DATA, ___ , ___ , ___,COMM, ___, ___ , ___ , ___ , ___ , ___ , ___ , SID , DATA, COMM, ___ , ___ , //  #  
 ___ ,-KEY , ___ , DATA, ___ , ___ , ___,COMM, ___,-KEY , ___ , ___ , ___ , ___ , ___ , ___ , DATA, COMM, ___ , ___ , //  $  
 ___ , SID , ___ , DATA, ___ , ___ , ___,COMM, ___, SID , ___ , ___ , ___ , ___ , ___ , ___ , DATA, COMM, ___ , ___ , //  %  
 ___ ,-LPAR, ___ , DATA, ___ , ___ , ___,COMM, ___, ___ , ___ , ___ , ___ , ___ , ___ ,-LPAR, DATA, COMM, ___ , ___ , //  (  
 ___ , ___ ,-RPAR, DATA, ___ , ___ , ___,COMM, ___, ___ , ___ , ___ , ___ , ___ , ___ ,-RPAR, DATA, COMM, ___ , ___ , //  )  
 ___ , ___ , ___ , DATA, ___ , ___ , ___,COMM, ___, ___ , ___ , ___ , ___ , ___ , ___ ,-INFX, DATA, COMM, ___ , ___ , // infix
 ___ , ___ , ___ , DATA, ___ , ATN , ___,COMM, SID, ATN , ___ , SID , ELEM, ATN , ___ , ___ , DATA, COMM, ___ , ___ , //  -  
 ___ , ___ , ___ , DATA, ___ , ___ , ___,COMM, ___, ___ , ___ , ___ , ___ , ___ , ___ , SID , DATA, COMM, ___ , ___ , //  .  
 ___ , ___ , ___ , DATA, ___ , ATN , ___,COMM, SID, ATN , ___ , SID , ELEM, ATN , IDEN, ___ , DATA, COMM, ___ , ___ , //  0-9 
 ___ , ___ , ___ , DATA, ___ , ___ , ___,COMM, SID, ___ , ___ , ___ , ___ , ___ , ___ , COL , DATA, COMM, ___ , ___ , //  :  
 ___ , ___ , ___ , DATA, ___ , ___ , ___,COMM, ___, ___ , ___ , ___ , ___ , ___ , ___ ,-INFX, DATA, COMM, ___ , ___ , //  ;  
 ___ , SID , ___ , DATA, ___ , ___ , ___,COMM, ___, ___ , ___ , ___ , ___ , ___ , ___ , SID , DATA, COMM, ___ , ___ , //  @  
 ___ , ELEM, IDEN, DATA, ___ , ATN , ___,COMM, SID, ATN , ___ , SID , ELEM, ATN , IDEN, ___ , DATA, COMM, ___ , ___ , //  A-F 
 ___ , ELEM, IDEN, DATA, ___ , ATN , ___,COMM, ___, ATN , ___ , SID , ELEM, ATN , IDEN, ___ , DATA, COMM, ___ , ___ , //  G-Z 
 ___ , ___ , ___ , DATA, ___ , ___ , ___,COMM, SID, ___ , ___ , ___ , ___ , ___ , ___ ,-LBRA, DATA, COMM, ___ , ___ , //  [  
 ___ , ___ , ___ , ESC ,-ESC , ___ , ___,COMM, ___, ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , COMM, ___ , ___ , //  \  
 ___ , ___ , ___ , DATA, ___ ,-RBRA, ___,COMM, ___,-RBRA,-RBRA, ___ , ___ , ___ , ___ , ___ , DATA, COMM, ___ , ___ , //  ]  
 ___ , ___ , IDEN, DATA, ___ , ATN , ___,COMM, SID, ATN , ___ , SID , ___ , ATN , IDEN, ___ , DATA, COMM, ___ , ___ , //  _  
 ___ , ELEM, IDEN, DATA, ___ , ATN , ___,COMM, SID, ATN , ___ , SID , ELEM, ATN , IDEN, ___ , DATA, COMM, ___ , ___ , //  a-f // REVIEW ESC
 ___ , ELEM, IDEN, DATA,-ESC , ATN , ___,COMM, SID, ATN , ___ , SID , ELEM, ATN , IDEN, ___ , DATA, COMM, ___ , ___ , //  g-z // REVIEW ESC
 ___ , ___ , ___ , DATA, ___ , ___ , ___,COMM, ___, ___ , ___ , ___ , ___ , ___ , ___ ,-BIND, DATA, COMM, ___ , ___ , //  ~  
 ___ , ___ , ___ , DATA, ___ , ___ , ___,COMM, ___, ___ ,-EQ  , ___ , ___ , ___ , ___ , ___ , DATA, COMM, ___ , ___ , //  =  
 ___ , S1  , S1  , DATA,-ESC , S1  , S2 ,COMM, ___, ___ , ___ , ___ , ___ , ___ , ___ , S1  , DATA, COMM, ___ , ___   //  "/" // REVIEW ESC
]

// ATT2 is 'after attribute name'
// ATT3 is 'after attribute assign ='
// TODO force WSP between attribute and next attribute name

assert (WSCR === 19, 'Transition table width '+WSCR)
assert (transitions.length === min_epsilon * num_classes, 'Transition table size')


// Runtime
// -------

function Tokeniser (delegate, entryState = MAIN) {

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
          // OK so compare against stack
          entry = MAIN; break;

        case POST: // POST token match corresponds to implicit infix juxstaposition
          entry = MAIN; break;

        case BIND: // BIND token match corresponds to pseudo-infix ~ (and/or *)
          entry = BIND; break;// REVIEW identifier/vs elem after * op?

        case ELEM: case IDEN: case SID: case KEY: // Operand
          operands.push ([match, input.substring (anchor, end)]); // TODO not (always) for SID
          entry = entry === MAIN ? POST : ATTS; break // FIXME dont use SID for %name in ATTS


        // Attribute Lists
        
        case LBRA:
          depth++; entry = ATTS; break // Begin attribute list

        case RBRA:
          // Lexer ensures depth > 1
          depth--; entry = POST; break

        case ATT2: case ATT3:
           entry = ATTS; break // Begin attribute list

        case ATN:
          operands.push ([match, input.substring (anchor, end)])
          entry = ATT2; break; // After Attribute Name

        case EQ:
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
  }

  // Private

  function createErrorMessage (input, desc = 'Syntax error') {
    const col = pos - lastnl
    const before = input.substr (pos-1, 12)
    return `${desc} at line ${line}:${pos-lastnl}; before ${before} ; byte index ${pos}\n`
    
  }

}


// Exports
// -------

export { Tokeniser }