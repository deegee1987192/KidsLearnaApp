// Balance the Scale — level definitions.
//
// TWO MODES:
//   'match'  — one side has a fixed weight (or weights) already on it.
//              Kid drags weights from the tray onto the other side until
//              both sides balance. Only the kid's chosen side must equal the
//              fixed side; leftover tray weights are ignored.
//
//   'target' — both pans start empty. Kid must place ALL tray weights so
//              that the two pans sum to the same `target` value.
//
// LEVEL SCHEMA
//   { id, name, scene, hint, mode, tray, ... }
//   match:  { fixedSide: 'left'|'right', fixed: [numbers], tray: [numbers] }
//   target: { target: number, tray: [numbers] }
//
// Weight numbers are the values shown on the colored blocks. Colors are
// assigned automatically per-value by the renderer (so a "3" is always the
// same color across levels).

const LEVELS = [
  // ─── MATCH MODE ─── L1-L8 ─────────────────────────────────
  // Kid balances the RIGHT pan against a fixed weight on the LEFT.
  { id:1,  name:'First Weigh',    scene:'day',    mode:'match',
    hint:'Drag the "3" onto the right side to balance!',
    fixedSide:'left', fixed:[3], tray:[1,2,3,5] },

  { id:2,  name:'Try a Five',     scene:'day',    mode:'match',
    hint:'Match the 5 on the left.',
    fixedSide:'left', fixed:[5], tray:[1,2,3,4,5] },

  { id:3,  name:'Add Them Up',    scene:'day',    mode:'match',
    hint:'You can combine two smaller weights to make 7!',
    fixedSide:'left', fixed:[7], tray:[2,3,4,5] },

  { id:4,  name:'Eight',          scene:'jungle', mode:'match',
    hint:'Make 8 on the right — many ways to do it.',
    fixedSide:'left', fixed:[8], tray:[1,2,3,4,5] },

  { id:5,  name:'Ten with Odds',  scene:'jungle', mode:'match',
    hint:'Only odd weights! Get to 10.',
    fixedSide:'left', fixed:[10], tray:[1,3,5,7] },

  { id:6,  name:'Two-Weight Left',scene:'night',  mode:'match',
    hint:'The LEFT has TWO weights! Total them and match.',
    fixedSide:'left', fixed:[10,2], tray:[1,2,3,4,5,6] },

  { id:7,  name:'Twin Fives',     scene:'night',  mode:'match',
    hint:'5 + 5 on the left. Balance the right.',
    fixedSide:'left', fixed:[5,5], tray:[1,3,5,7] },

  { id:8,  name:'Big Left',       scene:'candy',  mode:'match',
    hint:'8 + 4 on the left — how do you make that?',
    fixedSide:'left', fixed:[8,4], tray:[1,2,3,4,5,10] },

  // ─── TARGET MODE ─── L9-L15 ───────────────────────────────
  // Both pans start empty; kid must place ALL tray weights so that each
  // pan sums to `target`.
  { id:9,  name:'Split to Eight', scene:'candy',  mode:'target',
    hint:'Use every weight — both sides must equal 8.',
    target:8,  tray:[1,3,4,5,7] },

  { id:10, name:'Split to Ten',   scene:'space',  mode:'target',
    hint:'Both sides = 10. Use them all!',
    target:10, tray:[1,2,3,4,5,7,8] },

  { id:11, name:'Twelve Each',    scene:'space',  mode:'target',
    hint:'Both pans need to reach 12.',
    target:12, tray:[1,3,4,5,7,8] },

  { id:12, name:'Fifteen Each',   scene:'space',  mode:'target',
    hint:'15 on each side. Think carefully!',
    target:15, tray:[1,2,3,4,5,10,10] },

  { id:13, name:'Eighteen',       scene:'night',  mode:'target',
    hint:'18 on each pan.',
    target:18, tray:[2,3,4,5,7,8,9] },

  { id:14, name:'Twenty',         scene:'night',  mode:'target',
    hint:'20 on each side — every weight must be used.',
    target:20, tray:[1,2,3,4,5,10,15] },

  { id:15, name:'Grand Balance',  scene:'space',  mode:'target',
    hint:'GRAND FINALE — both sides equal 25!',
    target:25, tray:[1,2,3,4,5,10,10,15] },
];

// Color palette for weight blocks — indexed roughly by weight value so a
// given number looks the same across levels. Odd values warmer, evens cooler.
const WEIGHT_COLORS = {
   1:'#EF5350',  2:'#42A5F5',  3:'#FFB300',  4:'#66BB6A',
   5:'#AB47BC',  6:'#FF7043',  7:'#26A69A',  8:'#5C6BC0',
   9:'#8D6E63', 10:'#EC407A', 15:'#7E57C2', 20:'#00838F',
};

window.KL = window.KL || {};
window.KL.balanceTheScale = window.KL.balanceTheScale || {};
window.KL.balanceTheScale.LEVELS        = LEVELS;
window.KL.balanceTheScale.WEIGHT_COLORS = WEIGHT_COLORS;
