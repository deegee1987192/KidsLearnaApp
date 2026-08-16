// Balance the Scale — per-play level generation. All weights are 1–5.
//
// buildLevels() returns 15 FRESH levels every call, so no two playthroughs
// match. Difficulty ramps and every level is solvable by construction:
//   L1-5   match, single fixed weight  (find the matching weight)
//   L6-10  match, two-weight sum        (combine weights to match)
//   L11-13 match, bigger sum            (three-ish weights)
//   L14-15 target                       (split ALL weights so each side = target)
//
// match : { mode:'match', fixedSide:'left', fixed:[..], tray:[..] }
// target: { mode:'target', target, tray:[..] }

(function(){
  const WEIGHT_COLORS = {
    1:'#EF5350', 2:'#42A5F5', 3:'#FFB300', 4:'#66BB6A', 5:'#AB47BC',
  };
  const SCENES = ['day','jungle','night','candy','space'];

  const ri = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const shuffle = a => { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=ri(0,i);[b[i],b[j]]=[b[j],b[i]];} return b; };

  // break `sum` into random parts each 1..5
  function compose(sum){
    const parts = []; let r = sum;
    while(r > 0){ const p = ri(1, Math.min(5, r)); parts.push(p); r -= p; }
    return parts;
  }
  // a few random distractor weights (1..5)
  function distractors(k){ const out=[]; for(let i=0;i<k;i++) out.push(ri(1,5)); return out; }

  function matchSingle(T){
    return { mode:'match', fixedSide:'left', fixed:[T],
             tray: shuffle([T, ...distractors(3)]) };
  }
  function matchSum(T, nDist){
    const solution = compose(T);                 // subset the kid places (sums to T)
    const fixed = compose(T);                    // left side also sums to T
    return { mode:'match', fixedSide:'left', fixed,
             tray: shuffle([...solution, ...distractors(nDist)]) };
  }
  function targetSplit(G){
    const a = compose(G), b = compose(G);        // two halves, each = G
    return { mode:'target', target:G, tray: shuffle([...a, ...b]) };
  }

  function buildLevels(){
    const out = [];
    for(let L = 1; L <= 15; L++){
      const scene = SCENES[Math.min(4, Math.floor((L - 1) / 3))];
      let lv, name, hint;
      if(L <= 5){
        const T = L <= 2 ? ri(2,3) : ri(4,5);
        lv = matchSingle(T);
        name = 'Find the ' + T; hint = `Put a ${T} on the right to balance!`;
      } else if(L <= 10){
        const T = ri(6, 9);
        lv = matchSum(T, 2);
        name = 'Make ' + T; hint = `The left is ${T}. Combine weights to match!`;
      } else if(L <= 13){
        const T = ri(9, 13);
        lv = matchSum(T, 2);
        name = 'Balance ' + T; hint = `Make ${T} on the right — you'll need a few weights!`;
      } else {
        const G = L === 14 ? ri(6, 8) : ri(8, 10);
        lv = targetSplit(G);
        name = L === 15 ? 'Grand Balance' : 'Split to ' + G;
        hint = `Use EVERY weight so both sides equal ${G}!`;
      }
      out.push({ id:L, name, scene, hint, ...lv });
    }
    return out;
  }

  window.KL = window.KL || {};
  window.KL.balanceTheScale = window.KL.balanceTheScale || {};
  window.KL.balanceTheScale.WEIGHT_COLORS = WEIGHT_COLORS;
  window.KL.balanceTheScale.buildLevels   = buildLevels;
  window.KL.balanceTheScale.LEVELS        = buildLevels();   // initial set
})();
