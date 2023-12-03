
// Fold
// ====

// Simple traversal based fold for trees as follows:
// tree := [number, string] | [tree, ...trees]
// however, leafs [number, string] at an index of 0 are 
// considered to be operator tokens and are not evaluated.

// REVIEW the location of the unfold calls

function refold (seed, unfold, apply = (...args) => args) {
  const root = [0, unfold (seed)] // 'frame': tuples [branch, node]
  const stack = [ root ]
  let RET = null
  let l = 0

  while (l = stack.length) {
    const frame = stack[l-1]
    const [branch, node] = frame
    const op = node[0]

    if (typeof op === 'number') { // bottom out
      frame[1] = [[op, node[1]]]
      RET = frame
      stack.length--
    }

    else if (RET) { // pass up; move down unless at end
      node[branch] = branch ? apply (...RET[1]) : RET[1][0]
      if (branch === node.length-1) {
        RET = frame
        stack.length--
      }
      else {
        RET = null
        const b = branch + 1
        frame[0] = b
        node[b] = unfold (node[b])
      }
    }

    else // descend
      stack[l] = [0, [...node[branch]]]
  }
  return apply (...RET[1])
}


const fold = (expr, apply) =>
  refold (expr, x => [...x], apply)


// Exports
// -------

export { refold, fold }
