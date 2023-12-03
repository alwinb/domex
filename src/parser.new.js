const log = console.log.bind (console)
function* range (a, z = Infinity) { while (a <= z) yield a++ }
function assert (arg, message) { if (!arg) throw new Error ('Assertion Failed: ' + message ?? '') }
const intsInto = (map, i = 0) => new Proxy ({}, { get:($,k) => (map [k] = i, i++) })


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

const states = {}
const {
  FAIL, // Determined non-accepting
  MAIN, BIND, STR,  ESC,  ATTS, S1,   S2,   COL,  COL2, AVAL, // Contiguous non-accepting
  AATN, ATOP, SID,  ATN,  ELN,  TVAL, ITER, IDEN, OP,   DATA,  COM, WSPS, WSCR, // Contiguous accepting
  WSNL, LPAR, RPAR, LQUO, RQUO, EQ,   KEY,  LBRA, RBRA, // Determined accepting (Epsilon states)
} = intsInto (states, 0)

const min_accepting = AATN;
const min_epsilon   = WSNL;

const stateNames = []
for (const k in states)
  stateNames[states[k]] = k


// ### Transitions

// TODO \xhh \u1234 \u{} escape sequences
// Fix the line comments (comment ends)

const ___ = FAIL // cosmetic
const transitions = [
//0      1    2     3     4     5     6    7      8     9     10    11     12    13    14    15    16    17    18    19    20    21   22    23
//___, MAIN, BIND, STR , ESC , ATTS, S1  , S2  , COL , COL2, AVAL, AATN , ATOP, SID , ATN , ELN , TVAL, ITER, IDEN,  OP , DATA, COM, WSPS, WSCR 
 ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , //  C0_
 ___ , WSPS, WSPS, DATA, ___ , WSPS, ___ , COM , ___ , ___ , WSPS,  WSPS, WSPS, ___ , ___ , ___ , ___ , ___ , ___ , WSPS, DATA, COM , WSPS, ___ , //  HT  
 ___ ,-WSNL,-WSNL,-WSNL, ___ ,-WSNL, ___ , ___ , ___ , ___ ,-WSNL, -WSNL,-WSNL, ___ , ___ , ___ , ___ , ___ , ___ ,-WSNL, ___ , ___ ,-WSNL,-WSNL, //  LF  
 ___ , WSCR, WSCR, WSCR, ___ , WSCR, ___ , ___ , ___ , ___ , WSCR,  WSCR, WSCR, ___ , ___ , ___ , ___ , ___ , ___ , WSCR, ___ , ___ , WSCR, ___ , //  CR  
 ___ , WSPS, WSPS, DATA, ___ , WSPS, ___ , COM , ___ , ___ , WSPS,  WSPS, WSPS, ___ , ___ , ___ , ___ , ___ , ___ , WSPS, DATA, COM , WSPS, ___ , //  SP  
 ___ , ___ , ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , DATA, COM , ___ , ___ , // other
 ___ ,-LQUO, ___ ,-RQUO,-ESC , ___ , ___ , COM , ___ , ___ ,-LQUO,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , COM , ___ , ___ , //  "  
 ___ , ___ , ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , SID , DATA, COM , ___ , ___ , //  #  
 ___ ,-KEY , ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ ,-KEY ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , DATA, COM , ___ , ___ , //  $  
 ___ , TVAL, ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ , TVAL,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , DATA, COM , ___ , ___ , //  %  // REVIEW KEY/VAL
 ___ ,-LPAR, ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , DATA, COM , ___ , ___ , //  (  
 ___ , ___ , ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ ,-RPAR, DATA, COM , ___ , ___ , //  )  
 ___ , ___ , ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , -OP , DATA, COM , ___ , ___ , // infix
 ___ , ___ , ___ , DATA, ___ , ATN , ___ , COM , SID , SID , ATN ,  ___ , ___ , SID , ATN , ELN , ___ , ___ , ___ , ___ , DATA, COM , ___ , ___ , //  -  
 ___ , ___ , ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , SID , DATA, COM , ___ , ___ , //  .  
 ___ , ELN , ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , SID , DATA, COM , ___ , ___ , //  @  // REVIEW ELN
 ___ , ___ , ___ , DATA, ___ , ___ , ___ , COM , COL2, ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , COL , DATA, COM , ___ , ___ , //  :  
 ___ , ___ , ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ , -OP , DATA, COM , ___ , ___ , //  ;  
 ___ , ___ , ___ , DATA, ___ , ATN , ___ , COM , SID , SID , ATN ,  ___ , ___ , SID , ATN , ELN , TVAL, ITER, IDEN, ___ , DATA, COM , ___ , ___ , //  0-9 
 ___ , ELN , IDEN, DATA, ___ , ATN , ___ , COM , SID , SID , ATN ,  ___ , ___ , SID , ATN , ELN , TVAL, ITER, IDEN, ___ , DATA, COM , ___ , ___ , //  A-F 
 ___ , ELN , IDEN, DATA, ___ , ATN , ___ , COM , SID , SID , ATN ,  ___ , ___ , SID , ATN , ELN , TVAL, ITER, IDEN, ___ , DATA, COM , ___ , ___ , //  G-Z 
 ___ , ___ , ___ , DATA, ___ , ___ , ___ , COM , ___ , ___ , ___ ,  ___ , ___ , ___ , ___ , ___ , ___ , ___ , ___ ,-LBRA, DATA, COM , ___ , ___ , //  [  
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

// AATN is 'after attribute name'
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
  ';':  [1, Assoc],
  '|':  [2, Assoc],
  '+':  [3, Right],
  '>':  [3, Right],
   '':  [4, Assoc],
  '[]': [5, Left],
  '~':  [5, Left],   // Bind - lexer ensures rhs is an identifier
  '*':  [5, Left],   // Bind - lexer ensures rhs is an identifier // TODO require ** or *~ for that?
  '@':  [5, Left],
  ':':  [5, Left],
  '::': [5, Left],
  '.':  [5, Left],
  '#':  [5, Left],
  // Attribute Lists
  'att': [7, Assoc], // lexer ensures lhs/rhs are not nested
  '=': [8, Assoc], // lexer ensures lhs/rhs are not nested
}


// Runtime
// -------

// NOTE
// OK so I'm making the grammar more uniform/ consistent,
// by allowing elem, text, and attribute-lists on the same level.
// That seems good, but now I need type assignments :S
// OTPH, I want them anyway to determin output-size

function Parser (delegate, entryState = MAIN) {

  // DFA driver state

  let input = ''
  let entry = entryState
  let anchor = 0, end = 0, pos = 0
  let line = 1, lastnl = 0

  // Tokeniser State

  let depth = 0 // parens / nesting depth
  let afterString = MAIN

  // Shunting yard

  const ops = [] // operator stack
  const arities = [] // arities for ops
  const depths = [] // depths for ops
  const operands = [] // operand stack  
  
  // API methods

  const self = this
  this.parse = parse
  this._state  = function () {
    return { operands, ops, arities, depths }
  }

  // Parser

  function parse (_input) {
    input = _input
    write (input)
    eof ()
  }

  function eof () {
    log ('end', self._state  ())
    if (depth !== 0)
      throw new Error (createErrorMessage (input, 'Misnested parentheses'));
    for (let i=ops.length-1; i>=0; i--)
      _apply (ops.pop (), arities.pop (), depths.pop ())
  }

  function write (input_arg) {
    input = input_arg
    const length = input.length
    while (pos < length) {

      // log ({entry})
      let state = entry
      let match = state >= min_accepting ? (end = pos, state) : FAIL

      while (state > 0 && pos < length) {
        const c = input.charCodeAt (pos++)
        const cc = c <= 128 ? eqclasses[c] : eqclasses [0]
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
          depth++;
          entry = MAIN; break;

        case ELN : case IDEN: // Operand
          pushOperand (match, input.substring (anchor, end));
          entry = OP; break

        case KEY: case TVAL: // Operand, NB May occur also in attribute lists.
          pushOperand (match, input.substring (anchor, end));
          entry = entry === AVAL ? ATOP : OP
        break

        case OP: // Operator
          // FIXME why only one '' gets applied?
          pushOperator ([match, input.substring (anchor, end)])
          entry = MAIN
        break;

        case ITER: // Operator with conneced rhs
          pushOperator ([match, '*'], 2)
          pushOperand (IDEN, input.substring (anchor+1, end))
          entry = OP
        break

        case BIND: // Pseudo-infix operator ~ // REVIEW identifier/vs elem after * op?
          pushOperator ([match, input.substring (anchor, end)])
          entry = BIND
        break

        case SID: // TODO clean up
           // starting with one of #, ., @, : or ::
          const ch = input[anchor];
          if (ch === ':' && input[anchor+1] === ch) {
            pushOperator ([match, '::'], 2)
            pushOperand (IDEN, input.substring (anchor+2, end));
            entry = OP
          }
          else { // (ch === '@' || ch === ':' || ch === '.' || ch === '#')
            pushOperator ([match, ch], 2)
            pushOperand (IDEN, input.substring (anchor+1, end));
            entry = OP
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
          pushOperator ([match, '[]'], 2, ++depth)
          entry = ATTS
        break

        case ATN:
          pushOperand (match, input.substring (anchor, end))
          entry = entry === AVAL ? ATOP : AATN // REVIEW
        break

        case ATOP:
        case AATN: 
          pushOperator ([match, 'att'], 2)
          entry = ATTS
        break

        case EQ:
          pushOperator ([match, input.substring (anchor, end)], 2)
          entry = AVAL
        break;

        case RBRA:
          // Lexer ensures depth > 1
          endGroup ()
          // OK, so endGroup here is only needed because ...
          // well because what? I don't need it for the
          // parens because the depth counter is used to determine
          // the precedence anyway. So why here?
          // const l = operands.length-1
          // operands[l] = [[LBRA, 'attrs'], operands[l]]
          entry = OP
        break

        // Strings

        case LQUO: // begin group: quoted string
          afterString = entry === MAIN ? OP : ATOP;
          // pushOperator ([match, '""'], 0, ++depth)
          ops.push ([match, '""'])
          arities.push (0)
          depths.push (++depth)
          entry = STR
        break

        case ESC:
          let e = input[end-1]
          if ('nrt"\\'.indexOf(e) < 0)
            throw new Error (createErrorMessage (input, 'Invalid escape sequence'))
          pushOperand (match, input.substring (anchor, end))
          arities[arities.length-1]++
          entry = STR
        break

        case DATA: // Operand // TODO WSNL in strings
          pushOperand (match, input.substring (anchor, end))
          arities[arities.length-1]++
        break

        case RQUO:
          endGroup ();
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
      delegate.write (_entry, [match, input.substring (anchor, end)])
      anchor = pos = end
    }
  }

  function endGroup () {
    log ('endGroup', self._state ())
    for (let i=ops.length-1; i>=0 && depths[i] >= depth; i--)
      _apply (ops.pop (), arities.pop (), depths.pop ())
    depth--
  }

  function pushOperand (opcode, value) {
    log ('pushOperand', [opcode, value], self._state ())
    operands.push (apply ([opcode, value]))
  }

  function pushOperator (op_b, arity=2, op_depth = depth) {
    log ('pushOperator', op_b, self._state ())
    loop: while (1) {
      let action = Right // if no operators on op stack, else

      if (ops.length > 0) {
        const op_a = ops[ops.length-1]
        const [a_rank, a_assoc] = optable [op_a[1]]
        const [b_rank, b_assoc] = optable [op_b[1]]
        const top_depth = depths[ops.length-1]

        action =
          top_depth < op_depth  ? Right :
          top_depth > op_depth  ? Left  :
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
          depths.push (op_depth)
          break loop
      }
    }
  }

  // Private

  function createErrorMessage (input, desc = 'Syntax error') {
    const col = pos - lastnl
    const before = input.substr (pos-1, 12)
    return `${desc} at line ${line}:${pos-lastnl}; before ${before} ; byte index ${pos}\n`
  }

  // AST construction
  function _apply (op, arity) {
    log ('apply', ({ operands, ops, arity, op}))
    // Assumes operands.length >= arity

    const args = []
    while (arity--) args.unshift (operands.pop ())
    const result = apply (op, ...args)
    log ('==>', result)

    operands.push (result)
    // log ('apply result', op, ({ operands, ops }))
  }

}


// AST construction &
// Bottom-up Type Assignment

const { min, max } = Math

const NodeList = Symbol ('NodeList')
const AttName = Symbol ('AttName')
const AttList = Symbol ('AttList')
const AttPair = Symbol ('AttPair')
const ElementNode = Symbol ('ElementNode')
const TextNode = Symbol ('TextNode')
const GenericNode = Symbol ('GenericNode')


function typeUnion (left, right) {
  log ('typeUnion', ...arguments)
  assert (left.type === NodeList && right.type === NodeList, 'typeUnion')
  return {
    dynamic: left.dynamic || right.dynamic,
    type: NodeList,
    subtype: left.subtype === right.subtype ? left.subtype : GenericNode,
    min: min (left.min, right.min),
    max: max (left.max, right.max),
  }
}

function apply ([opcode, opvalue], ...args) {
  const left = args[0]
  const right = args[1] // may be undefined
  switch (opcode) {

    // DOM Expressions

    case IDEN: // REVIEW
    case ELN:
      return {
        dynamic: false,
        type: NodeList,
        subtype: ElementNode,
        min:1, max:1,
        ast:[...arguments]
      }

    case KEY:
    case TVAL:
      // ok that works but change the type representation, for this should also be ok as attribute value
      return { dynamic:true, type:NodeList, subtype:TextNode, min:1, max:1, ast:[...arguments] }

    case SID:
      log ('SID', opcode, opvalue, left, right)
      // TODO
      switch (opvalue[1] === ':' ? opvalue.substr(0,2) : opvalue[0]) {
        case '#': 
        case '.':
          assert (left.subtype === ElementNode)
        // fallthrough

        case '@': {
          const r = Object.assign ({}, left)
          r.dynamic = left.dynamic || right.dynamic
          r.ast = [[opcode,opvalue], left.ast, right.ast]
          return r
        }

        case ':':
        case '::': 
          const r = Object.assign ({}, left)
          r.dynamic = true
          r.min = 0,
          r.max = left.max
          r.ast = [[opcode,opvalue], left.ast, right.ast]
          return r;

        default: log (opcode, opvalue)
      }

    case ITER: {
      log ('ITER', opcode, opvalue, left, right)
      assert (left.type === NodeList)
      return {
        dynamic:true,
        type:left.type,
        subtype:left.subtype,
        min: 0,
        max: Infinity,
        ast:[[opcode, opvalue], left.ast, right.ast]
      }
    }

    case OP:
      const ast =
        [[opcode, opvalue], left.ast, right.ast]

      switch (opvalue) {
        case '+': {
          const r = typeUnion (left ,right)
          r.min = left.min + right.min
          r.max = left.max + right.max
          r.ast = ast;
          return r
        }

        case '|': {
          const r = Object.assign ({}, args[args.length-1])
          r.ast = [[opcode, opvalue]]
          let unreachable = false
          for (const x of args) {
            assert (!unreachable, 'Unreachable alternative branch')
            r.dynamic |= x.dynamic
            if (x.min != 0) r.min = min (r.min, x.min)
            r.max = max (r.max, x.max)
            if (x.min != 0) unreachable = true
            r.ast.push (x.ast)
            r.subtype = r.subtype === x.subtype ? r.subtype : GenericNode
          }
          return r
        }

        case '>': {
          assert (left.subtype === ElementNode)
          const r = Object.assign ({}, left)
          r.dynamic = left.dynamic || right.dynamic
          r.ast = ast;
          return r
        }

        case '': {
          assert (left.subtype === ElementNode)
          // OK but then also for attribute lists
          const r = Object.assign ({}, left)
          r.dynamic = left.dynamic || right.dynamic
          r.ast = ast;
          return r
        }

        case ';': { // let in
          const r = Object.assign ({}, left)
          r.dynamic = left.dynamic || right.dynamic
          // TODO refine. Also track refs.
          r.ast = ast;
          return r
        }

      } break

    // Apply attibute list

    case LBRA: {
      assert (left.subtype == ElementNode || left.subtype == GenericNode, 'Attempt to apply attributes to NodeList that does not contain ElementNodes')
      args = args.slice (1)
      const r = Object.assign ({}, left)
      r.dynamic = args.reduce ((d, {dynamic}) => d ||dynamic , false)
      r.ast = [[opcode, opvalue], left.ast, ... args.map (_ => _.ast)];
      return r
    }


    // ### Attribute Lists

    case AATN:
    case ATOP: {
      log ('ATOP', args)
      // assert children are name=value pairs else set value to ''
      // type is AttributeListInner (irrelevant, safe by grammar)
      const r = {
        type: AttList,
        dynamic: args.reduce ((d, {dynamic}) => d ||dynamic , false)
      }
      r.ast = [[opcode, opvalue], ... args.map (_ => _.ast)];
      return r
    }

    case ATN:
      return {
        dynamic: false,
        type: AttName,
        ast: [...arguments]
      }

    // AfterAttributeName
    case AATN: {
      const r = Object.assign ({}, right)
      r.type = AttPair,
      r.ast = [[opcode, opvalue], left.ast, right.ast];
      return r
    }

    case EQ: {
      const r = Object.assign ({}, right)
      r.type = AttPair,
      r.ast = [[opcode, opvalue], left.ast, right.ast];
      return r
    }
    // ### Strings

    case LQUO: 
      // TODO adapt type for use also in attlists
      return {
        dynamic: false,
        type: NodeList,
        subtype: TextNode,
        min: 1,
        max: 1,
        ast: [[opcode, opvalue], args.join ('')]
      }

    case ESC:
      return {
        'n':'\n',
        'r':'\r',
        't':'\t',
        '"':'"',
      } [opvalue[1]] ?? opvalue[1]

    case DATA:
      return opvalue

    // case RQUO: // unreachable; LQUO used as group node
    // case RBRA: // unreachable; LBRA used as group node
    // case WSPS: // unreachable
    // case WSCR: // unreachable
    // case WSNL: // unreachable
    // case COM:  // unreachable

    default: log (opvalue)
  }
}

// Exports
// -------

export { Parser, stateNames }