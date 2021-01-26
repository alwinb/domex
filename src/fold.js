
// Fold
// ====

// Simple traversal based fold for trees as follows:
// tree := [number, string] | [tree, ...trees]
// however, leafs [number, string, ...annotations] at an index of 0 are 
// considered to be operator tokens and are not evaluated.

// REVIEW the location of the unfold calls

function refold (seed, unfold, apply = (...args) => args) {
  const root = [0, unfold (seed)]
  const stack = [ root ]
  let RET, l

  while (l = stack.length) {
    const frame = stack[l-1]
    const [branch, coterm] = frame
    const op = coterm[0]

    if (typeof op === 'number') { // bottom out
      RET = frame
      frame[1] = [[op, coterm[1]]]
      stack.length--
    }

    else if (RET) { // pass up; move down unless at end
      coterm[branch] = branch ? apply (...RET[1]) : RET[1][0]
      if (branch === coterm.length-1) {
        RET = frame
        stack.length--
      }
      else {
        RET = null
        const b = branch + 1
        frame[0] = b
        coterm[b] = unfold (coterm[b])
      }
    }

    else // descend
      stack[l] = [0, [...coterm[branch]]]
  }
  return apply (...RET[1])
}


const fold = (expr, apply) =>
  refold (expr, x => [...x], apply)


// Exports
// -------

module.exports = { refold, fold }
