const LEVELS = [
  // ─── MATCH MODE ─── L1-L13 ────────────────────────────────
  { id:1,  name:'First Weigh',    scene:'day',    mode:'match',
    hint:'Drag the "3" onto the right side!',
    fixedSide:'left', fixed:[3], tray:[1,2,3,5] },

  { id:2,  name:'Match the Two',  scene:'day',    mode:'match',
    hint:'Find the "2" and drop it on the right.',
    fixedSide:'left', fixed:[2], tray:[1,2,4,5] },

  { id:3,  name:'Find the Five',  scene:'day',    mode:'match',
    hint:'Which weight matches 5?',
    fixedSide:'left', fixed:[5], tray:[1,3,4,5] },

  { id:4,  name:'Add to Four',    scene:'day',    mode:'match',
    hint:'No 4 in the tray — combine two weights!',
    fixedSide:'left', fixed:[4], tray:[1,2,3,5] },

  { id:5,  name:'Make a Five',    scene:'jungle', mode:'match',
    hint:'Add two weights that make 5.',
    fixedSide:'left', fixed:[5], tray:[1,2,3,4] },

  { id:6,  name:'Reach Three',    scene:'jungle', mode:'match',
    hint:'No 3 in the tray — which two make 3?',
    fixedSide:'left', fixed:[3], tray:[1,2,4,5] },

  { id:7,  name:'Two on Left',    scene:'jungle', mode:'match',
    hint:'The left has 1 + 2. Match the total!',
    fixedSide:'left', fixed:[1,2], tray:[1,2,3,4,5] },

  { id:8,  name:'Pair Up',        scene:'night',  mode:'match',
    hint:'2 + 3 = 5 on the left. Balance it!',
    fixedSide:'left', fixed:[2,3], tray:[1,2,4,5] },

  { id:9,  name:'Heavy Left',     scene:'night',  mode:'match',
    hint:'3 + 4 = 7. Use two weights to match!',
    fixedSide:'left', fixed:[3,4], tray:[1,2,3,4,5] },

  { id:10, name:'Double Trouble', scene:'night',  mode:'match',
    hint:'4 + 1 = 5. Find the right combo!',
    fixedSide:'left', fixed:[4,1], tray:[1,2,3,5] },

  { id:11, name:'Big Stack',      scene:'candy',  mode:'match',
    hint:'5 + 3 = 8. You need multiple weights!',
    fixedSide:'left', fixed:[5,3], tray:[1,2,3,4,5] },

  { id:12, name:'Nine High',      scene:'candy',  mode:'match',
    hint:'4 + 5 = 9. Think carefully!',
    fixedSide:'left', fixed:[4,5], tray:[1,2,3,4,5] },

  { id:13, name:'Perfect Ten',    scene:'space',  mode:'match',
    hint:'5 + 5 = 10. Use three weights!',
    fixedSide:'left', fixed:[5,5], tray:[1,2,3,4,5] },

  // ─── TARGET MODE ─── L14-L15 ──────────────────────────────
  { id:14, name:'Split Four',     scene:'space',  mode:'target',
    hint:'Put weights on BOTH sides so each = 4.',
    target:4, tray:[1,2,3,2] },

  { id:15, name:'Grand Balance',  scene:'space',  mode:'target',
    hint:'Both sides must equal 8. Use all weights!',
    target:8, tray:[1,2,3,5,3,2] },
];

const WEIGHT_COLORS = {
  1:'#EF5350', 2:'#42A5F5', 3:'#FFB300', 4:'#66BB6A', 5:'#AB47BC',
};

window.KL = window.KL || {};
window.KL.balanceTheScale = window.KL.balanceTheScale || {};
window.KL.balanceTheScale.LEVELS        = LEVELS;
window.KL.balanceTheScale.WEIGHT_COLORS = WEIGHT_COLORS;
