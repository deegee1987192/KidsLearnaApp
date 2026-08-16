// Switch Track — level definitions (v5: 15 levels, mixed topologies).
//
// TEMPLATES
//   A. Oval        — single rectangular loop with home spurs on the sides.
//                    Trains circulate; kid diverts them one at a time.
//   B. Theta (θ)   — oval with a central vertical spine. Two X-junctions at
//                    the top and bottom of the spine let the kid detour a
//                    train through the middle to avoid a crash on the outer.
//   C. CrossedTheta — theta + a horizontal spine crossing the vertical one.
//                    Multiple intersections; trains can be rerouted many ways.
//
// GRID TOKENS
//   '.'                 empty (grass)
//   'D'                 depot — trains spawn here, never re-enter
//   'h','v'             straight track
//   'ne','nw','se','sw' curves (letters = connected sides)
//   'J:A'               junction with key 'A' (routing in `junctions.A`)
//   'H:red'             house of that color (parks matching train, crashes others)
//
// LEVEL SCHEMA
//   depot, trains, parkOrder?, junctions, grid, cellSize, hint, name, scene.
// Trains launch from `depot` 3s apart in the order given.

const TRACK_CONNS = {
  h:  ['W','E'],
  v:  ['N','S'],
  ne: ['N','E'],
  nw: ['N','W'],
  se: ['S','E'],
  sw: ['S','W'],
  '+':['N','S','E','W'],
};

const HOUSE_COLORS = {
  red:   '#EF5350',
  blue:  '#42A5F5',
  green: '#66BB6A',
  yellow:'#FFB300',
  purple:'#AB47BC',
  orange:'#FF7043',
};

const TRAIN_COLORS = { ...HOUSE_COLORS };

// ─── Junction helpers ─────────────────────────────────────

function spurLever(exit, defaultState = 0){
  const arrow = { E:'➡', W:'⬅', N:'⬆', S:'⬇' }[exit];
  return {
    states: [
      { label:'↕',   map:{ N:'S', S:'N' } },
      { label:arrow, map:{ N:exit, S:exit } },
    ],
    defaultState,
  };
}

function fixedT(map){
  return { states:[ { label:'', map } ], defaultState:0 };
}

// A junction sitting on a horizontal track where a vertical spine branches
// off. Two states: pass horizontally (loop) or divert north/south into spine.
function spineLeverH(spineDir, defaultState = 0){
  // spineDir ∈ 'N' | 'S'  (which way the spine goes from this cell)
  const arrow = { N:'⬆', S:'⬇' }[spineDir];
  const other = { N:'S', S:'N' }[spineDir];
  return {
    states: [
      { label:'↔',   map:{ W:'E', E:'W', [other]:'W' } },       // loop
      { label:arrow, map:{ W:spineDir, E:spineDir, [other]:'W' } },
    ],
    defaultState,
  };
}

// A junction on a vertical track where a horizontal spine branches off.
function spineLeverV(spineDir, defaultState = 0){
  // spineDir ∈ 'E' | 'W'
  const arrow = { E:'➡', W:'⬅' }[spineDir];
  const other = { E:'W', W:'E' }[spineDir];
  return {
    states: [
      { label:'↕',   map:{ N:'S', S:'N', [other]:'N' } },        // pass vertical
      { label:arrow, map:{ N:spineDir, S:spineDir, [other]:'N' } },
    ],
    defaultState,
  };
}

// ═══════════════════════════════════════════════════════════
// TEMPLATE A — OVAL
// ═══════════════════════════════════════════════════════════

// ─── L1 — First Loop ──────────────────────────────────────
const L1 = {
  id:1, name:'First Loop', scene:'day', cellSize:52,
  hint:'Press GO — tap Lever A when the train is close to send it home.',
  grid:[
    ['.','se','h','h','h','sw','.'],
    ['.','v', '.','.','.','v', '.'],
    ['.','v', '.','.','.','J:A','H:red'],
    ['.','v', '.','.','.','v', '.'],
    ['.','J:D','h','h','h','nw','.'],
    ['.','v', '.','.','.','.','.'],
    ['.','D', '.','.','.','.','.'],
  ],
  depot:{ r:6, c:1, dir:'N' },
  trains:[ { color:'red' } ],
  junctions:{
    A: spurLever('E'),
    D: fixedT({ S:'E', N:'E', E:'N' }),
  },
};

// ─── L2 — Share the Loop ──────────────────────────────────
const L2 = {
  id:2, name:'Share the Loop', scene:'day', cellSize:48,
  hint:'Two trains! RED home first, then BLUE.',
  grid:[
    ['.','se','h','h','h','h','h','sw','.'],
    ['.','v', '.','.','.','.','.','v', '.'],
    ['H:red','J:A','.','.','.','.','.','J:B','H:blue'],
    ['.','v', '.','.','.','.','.','v', '.'],
    ['.','J:D','h','h','h','h','h','nw','.'],
    ['.','v', '.','.','.','.','.','.', '.'],
    ['.','D', '.','.','.','.','.','.', '.'],
  ],
  depot:{ r:6, c:1, dir:'N' },
  trains:[ { color:'red' }, { color:'blue' } ],
  parkOrder:[ 'red', 'blue' ],
  junctions:{
    A: spurLever('W'),
    B: spurLever('E'),
    D: fixedT({ S:'E', N:'E', E:'N' }),
  },
};

// ─── L3 — Three Trains ────────────────────────────────────
const L3 = {
  id:3, name:'Three Trains', scene:'jungle', cellSize:44,
  hint:'Three homes on the left — take your time with each lever!',
  grid:[
    ['.','se','h','h','h','sw','.'],
    ['.','v', '.','.','.','v', '.'],
    ['H:red','J:A','.','.','.','v', '.'],
    ['.','v', '.','.','.','v', '.'],
    ['H:blue','J:B','.','.','.','v', '.'],
    ['.','v', '.','.','.','v', '.'],
    ['H:green','J:C','.','.','.','v', '.'],
    ['.','v', '.','.','.','v', '.'],
    ['.','J:D','h','h','h','nw','.'],
    ['.','v', '.','.','.','.','.'],
    ['.','D', '.','.','.','.','.'],
  ],
  depot:{ r:10, c:1, dir:'N' },
  trains:[ { color:'red' }, { color:'blue' }, { color:'green' } ],
  junctions:{
    A: spurLever('W'), B: spurLever('W'), C: spurLever('W'),
    D: fixedT({ S:'E', N:'E', E:'N' }),
  },
};

// ─── L4 — Both Sides ──────────────────────────────────────
const L4 = {
  id:4, name:'Both Sides', scene:'jungle', cellSize:42,
  hint:'Four trains — homes on left AND right.',
  grid:[
    ['.','se','h','h','h','sw','.'],
    ['.','v', '.','.','.','v', '.'],
    ['H:red','J:A','.','.','.','J:E','H:yellow'],
    ['.','v', '.','.','.','v', '.'],
    ['H:blue','J:B','.','.','.','v', '.'],
    ['.','v', '.','.','.','v', '.'],
    ['H:green','J:C','.','.','.','v', '.'],
    ['.','v', '.','.','.','v', '.'],
    ['.','J:D','h','h','h','nw','.'],
    ['.','v', '.','.','.','.','.'],
    ['.','D', '.','.','.','.','.'],
  ],
  depot:{ r:10, c:1, dir:'N' },
  trains:[ { color:'red' }, { color:'blue' }, { color:'green' }, { color:'yellow' } ],
  junctions:{
    A: spurLever('W'), B: spurLever('W'), C: spurLever('W'), E: spurLever('E'),
    D: fixedT({ S:'E', N:'E', E:'N' }),
  },
};

// ─── L5 — Both Sides, In Order ────────────────────────────
const L5 = {
  id:5, name:'Four in Order', scene:'candy', cellSize:42,
  hint:'RED, BLUE, GREEN, YELLOW — in that order!',
  grid:[
    ['.','se','h','h','h','sw','.'],
    ['.','v', '.','.','.','v', '.'],
    ['H:red','J:A','.','.','.','J:E','H:yellow'],
    ['.','v', '.','.','.','v', '.'],
    ['H:blue','J:B','.','.','.','v', '.'],
    ['.','v', '.','.','.','v', '.'],
    ['H:green','J:C','.','.','.','v', '.'],
    ['.','v', '.','.','.','v', '.'],
    ['.','J:D','h','h','h','nw','.'],
    ['.','v', '.','.','.','.','.'],
    ['.','D', '.','.','.','.','.'],
  ],
  depot:{ r:10, c:1, dir:'N' },
  trains:[ { color:'red' }, { color:'blue' }, { color:'green' }, { color:'yellow' } ],
  parkOrder:[ 'red', 'blue', 'green', 'yellow' ],
  junctions:{
    A: spurLever('W'), B: spurLever('W'), C: spurLever('W'), E: spurLever('E'),
    D: fixedT({ S:'E', N:'E', E:'N' }),
  },
};

// ═══════════════════════════════════════════════════════════
// TEMPLATE B — THETA (oval + vertical spine)
// ═══════════════════════════════════════════════════════════
// Vertical spine down the middle column joins top and bottom via X-junctions
// (J:X at top, J:Y at bottom). Kid can flip those to detour trains via spine.

// ─── L6 — Meet the Spine ──────────────────────────────────
const L6 = {
  id:6, name:'Meet the Spine', scene:'night', cellSize:40,
  hint:'A spine down the middle! Flip J:X or J:Y to detour trains.',
  grid:[
    ['.','se','h','h','J:X','h','h','sw','.'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:red','J:A','.','.','v',  '.','.','J:E','H:blue'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:green','J:B','.','.','v', '.','.','v', '.'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['.','J:D','h','h','J:Y','h','h','nw','.'],
    ['.','v', '.','.','.','.','.','.','.'],
    ['.','D', '.','.','.','.','.','.','.'],
  ],
  depot:{ r:8, c:1, dir:'N' },
  trains:[ { color:'red' }, { color:'blue' }, { color:'green' } ],
  junctions:{
    A: spurLever('W'), B: spurLever('W'), E: spurLever('E'),
    D: fixedT({ S:'E', N:'E', E:'N' }),
    X: spineLeverH('S'),
    Y: spineLeverH('N'),
  },
};

// ─── L7 — Four with a Spine ───────────────────────────────
const L7 = {
  id:7, name:'Four with a Spine', scene:'night', cellSize:38,
  hint:'Four trains and a spine — plenty of ways to route them!',
  grid:[
    ['.','se','h','h','J:X','h','h','sw','.'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:red','J:A','.','.','v',  '.','.','J:E','H:yellow'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:blue','J:B','.','.','v', '.','.','v', '.'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:green','J:C','.','.','v', '.','.','v', '.'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['.','J:D','h','h','J:Y','h','h','nw','.'],
    ['.','v', '.','.','.','.','.','.','.'],
    ['.','D', '.','.','.','.','.','.','.'],
  ],
  depot:{ r:10, c:1, dir:'N' },
  trains:[ { color:'red' }, { color:'blue' }, { color:'green' }, { color:'yellow' } ],
  junctions:{
    A: spurLever('W'), B: spurLever('W'), C: spurLever('W'), E: spurLever('E'),
    D: fixedT({ S:'E', N:'E', E:'N' }),
    X: spineLeverH('S'),
    Y: spineLeverH('N'),
  },
};

// ─── L8 — Spine, In Order ─────────────────────────────────
const L8 = {
  id:8, name:'Spine, In Order', scene:'space', cellSize:38,
  hint:'RED → BLUE → GREEN → YELLOW. Use the spine wisely!',
  grid:[
    ['.','se','h','h','J:X','h','h','sw','.'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:red','J:A','.','.','v',  '.','.','J:E','H:yellow'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:blue','J:B','.','.','v', '.','.','v', '.'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:green','J:C','.','.','v', '.','.','v', '.'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['.','J:D','h','h','J:Y','h','h','nw','.'],
    ['.','v', '.','.','.','.','.','.','.'],
    ['.','D', '.','.','.','.','.','.','.'],
  ],
  depot:{ r:10, c:1, dir:'N' },
  trains:[ { color:'red' }, { color:'blue' }, { color:'green' }, { color:'yellow' } ],
  parkOrder:[ 'red', 'blue', 'green', 'yellow' ],
  junctions:{
    A: spurLever('W'), B: spurLever('W'), C: spurLever('W'), E: spurLever('E'),
    D: fixedT({ S:'E', N:'E', E:'N' }),
    X: spineLeverH('S'),
    Y: spineLeverH('N'),
  },
};

// ─── L9 — Five Trains ─────────────────────────────────────
const L9 = {
  id:9, name:'Five Trains', scene:'space', cellSize:36,
  hint:'Five trains! Homes on both sides — use everything you\'ve got.',
  grid:[
    ['.','se','h','h','J:X','h','h','sw','.'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:red','J:A','.','.','v',  '.','.','J:E','H:yellow'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:blue','J:B','.','.','v', '.','.','J:F','H:purple'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:green','J:C','.','.','v', '.','.','v', '.'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['.','J:D','h','h','J:Y','h','h','nw','.'],
    ['.','v', '.','.','.','.','.','.','.'],
    ['.','D', '.','.','.','.','.','.','.'],
  ],
  depot:{ r:10, c:1, dir:'N' },
  trains:[ { color:'red' }, { color:'blue' }, { color:'green' }, { color:'yellow' }, { color:'purple' } ],
  junctions:{
    A: spurLever('W'), B: spurLever('W'), C: spurLever('W'),
    E: spurLever('E'), F: spurLever('E'),
    D: fixedT({ S:'E', N:'E', E:'N' }),
    X: spineLeverH('S'),
    Y: spineLeverH('N'),
  },
};

// ─── L10 — Five in Order ──────────────────────────────────
const L10 = {
  id:10, name:'Five in Order', scene:'space', cellSize:36,
  hint:'Five trains, strict order. RED → BLUE → GREEN → YELLOW → PURPLE.',
  grid:[
    ['.','se','h','h','J:X','h','h','sw','.'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:red','J:A','.','.','v',  '.','.','J:E','H:yellow'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:blue','J:B','.','.','v', '.','.','J:F','H:purple'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:green','J:C','.','.','v', '.','.','v', '.'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['.','J:D','h','h','J:Y','h','h','nw','.'],
    ['.','v', '.','.','.','.','.','.','.'],
    ['.','D', '.','.','.','.','.','.','.'],
  ],
  depot:{ r:10, c:1, dir:'N' },
  trains:[ { color:'red' }, { color:'blue' }, { color:'green' }, { color:'yellow' }, { color:'purple' } ],
  parkOrder:[ 'red', 'blue', 'green', 'yellow', 'purple' ],
  junctions:{
    A: spurLever('W'), B: spurLever('W'), C: spurLever('W'),
    E: spurLever('E'), F: spurLever('E'),
    D: fixedT({ S:'E', N:'E', E:'N' }),
    X: spineLeverH('S'),
    Y: spineLeverH('N'),
  },
};

// ═══════════════════════════════════════════════════════════
// TEMPLATE C — CROSSED THETA (spine + horizontal shortcut)
// ═══════════════════════════════════════════════════════════
// Adds a horizontal shortcut cutting the loop in half, crossing the vertical
// spine at a '+' cell. Two extra junctions (J:P, J:Q) at the horizontal
// entry points let kids route trains through the shortcut.

// ─── L11 — Two Spines ─────────────────────────────────────
const L11 = {
  id:11, name:'Two Spines', scene:'night', cellSize:36,
  hint:'Vertical AND horizontal shortcuts. So many choices!',
  grid:[
    ['.','se','h','h','J:X','h','h','sw','.'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:red','J:A','.','.','v',  '.','.','J:E','H:yellow'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['.','J:P','h','h','+',  'h','h','J:Q','.'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:green','J:C','.','.','v', '.','.','v', '.'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['.','J:D','h','h','J:Y','h','h','nw','.'],
    ['.','v', '.','.','.','.','.','.','.'],
    ['.','D', '.','.','.','.','.','.','.'],
  ],
  depot:{ r:10, c:1, dir:'N' },
  trains:[ { color:'red' }, { color:'green' }, { color:'yellow' }, { color:'purple' } ],
  junctions:{
    A: spurLever('W'), C: spurLever('W'), E: spurLever('E'),
    D: fixedT({ S:'E', N:'E', E:'N' }),
    X: spineLeverH('S'),
    Y: spineLeverH('N'),
    P: spineLeverV('E'),
    Q: spineLeverV('W'),
  },
};
// (Purple doesn't have a matching home — will fall through to clockwise
// fallback and never park. This level is intentionally tricky — kid needs
// to route the purple train to a slot that doesn't exist. FIX: replace
// purple with an achievable colour. Setting purple → yellow so both trains
// park at yellow home... no, that would double-park. Simpler: remove purple.)
L11.trains = [ { color:'red' }, { color:'green' }, { color:'yellow' } ];

// ─── L12 — Two Spines + Blue ─────────────────────────────
const L12 = {
  id:12, name:'Two Spines + Blue', scene:'space', cellSize:34,
  hint:'Add a fourth home — four trains, two shortcuts.',
  grid:[
    ['.','se','h','h','J:X','h','h','sw','.'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:red','J:A','.','.','v',  '.','.','J:E','H:yellow'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:blue','J:P','h','h','+', 'h','h','J:Q','H:purple'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:green','J:C','.','.','v', '.','.','v', '.'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['.','J:D','h','h','J:Y','h','h','nw','.'],
    ['.','v', '.','.','.','.','.','.','.'],
    ['.','D', '.','.','.','.','.','.','.'],
  ],
  depot:{ r:10, c:1, dir:'N' },
  trains:[ { color:'red' }, { color:'blue' }, { color:'green' }, { color:'yellow' }, { color:'purple' } ],
  junctions:{
    A: spurLever('W'), C: spurLever('W'), E: spurLever('E'),
    D: fixedT({ S:'E', N:'E', E:'N' }),
    X: spineLeverH('S'),
    Y: spineLeverH('N'),
    // J:P and J:Q now also serve as home levers (spine + spur combined).
    P: {
      states:[
        { label:'↕', map:{ N:'S', S:'N', E:'N' } },     // pass vertical, ignore E
        { label:'⬅', map:{ N:'W', S:'W', E:'W' } },     // divert W into H:blue
        { label:'➡', map:{ N:'E', S:'E', E:'N' } },     // send E into the horizontal shortcut
      ],
      defaultState:0,
    },
    Q: {
      states:[
        { label:'↕', map:{ N:'S', S:'N', W:'N' } },
        { label:'➡', map:{ N:'E', S:'E', W:'E' } },     // divert E into H:purple
        { label:'⬅', map:{ N:'W', S:'W', W:'N' } },     // send W into the shortcut
      ],
      defaultState:0,
    },
  },
};

// ─── L13 — Everything, In Order ──────────────────────────
const L13 = {
  id:13, name:'Everything, In Order', scene:'space', cellSize:34,
  hint:'RED → BLUE → GREEN → YELLOW → PURPLE — with two spines!',
  grid:[
    ['.','se','h','h','J:X','h','h','sw','.'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:red','J:A','.','.','v',  '.','.','J:E','H:yellow'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:blue','J:P','h','h','+', 'h','h','J:Q','H:purple'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:green','J:C','.','.','v', '.','.','v', '.'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['.','J:D','h','h','J:Y','h','h','nw','.'],
    ['.','v', '.','.','.','.','.','.','.'],
    ['.','D', '.','.','.','.','.','.','.'],
  ],
  depot:{ r:10, c:1, dir:'N' },
  trains:[ { color:'red' }, { color:'blue' }, { color:'green' }, { color:'yellow' }, { color:'purple' } ],
  parkOrder:[ 'red', 'blue', 'green', 'yellow', 'purple' ],
  junctions:{
    A: spurLever('W'), C: spurLever('W'), E: spurLever('E'),
    D: fixedT({ S:'E', N:'E', E:'N' }),
    X: spineLeverH('S'),
    Y: spineLeverH('N'),
    P: {
      states:[
        { label:'↕', map:{ N:'S', S:'N', E:'N' } },
        { label:'⬅', map:{ N:'W', S:'W', E:'W' } },
        { label:'➡', map:{ N:'E', S:'E', E:'N' } },
      ],
      defaultState:0,
    },
    Q: {
      states:[
        { label:'↕', map:{ N:'S', S:'N', W:'N' } },
        { label:'➡', map:{ N:'E', S:'E', W:'E' } },
        { label:'⬅', map:{ N:'W', S:'W', W:'N' } },
      ],
      defaultState:0,
    },
  },
};

// ─── L14 — Big Yard ──────────────────────────────────────
// L13 layout, but the loop is taller (extra row on top) with an extra home
// (orange) on the left top.
const L14 = {
  id:14, name:'Big Yard', scene:'space', cellSize:32,
  hint:'A bigger yard — six homes, five trains, endless choices.',
  grid:[
    ['.','se','h','h','J:X','h','h','sw','.'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:red','J:A','.','.','v',  '.','.','J:E','H:yellow'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:orange','J:G','.','.','v',  '.','.','v','.'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:blue','J:P','h','h','+', 'h','h','J:Q','H:purple'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:green','J:C','.','.','v', '.','.','v', '.'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['.','J:D','h','h','J:Y','h','h','nw','.'],
    ['.','v', '.','.','.','.','.','.','.'],
    ['.','D', '.','.','.','.','.','.','.'],
  ],
  depot:{ r:12, c:1, dir:'N' },
  trains:[ { color:'red' }, { color:'blue' }, { color:'green' }, { color:'yellow' }, { color:'purple' } ],
  junctions:{
    A: spurLever('W'), G: spurLever('W'), C: spurLever('W'),
    E: spurLever('E'),
    D: fixedT({ S:'E', N:'E', E:'N' }),
    X: spineLeverH('S'),
    Y: spineLeverH('N'),
    P: {
      states:[
        { label:'↕', map:{ N:'S', S:'N', E:'N' } },
        { label:'⬅', map:{ N:'W', S:'W', E:'W' } },
        { label:'➡', map:{ N:'E', S:'E', E:'N' } },
      ],
      defaultState:0,
    },
    Q: {
      states:[
        { label:'↕', map:{ N:'S', S:'N', W:'N' } },
        { label:'➡', map:{ N:'E', S:'E', W:'E' } },
        { label:'⬅', map:{ N:'W', S:'W', W:'N' } },
      ],
      defaultState:0,
    },
  },
};

// ─── L15 — Grand Central ─────────────────────────────────
// Grand finale — L14 layout with strict parkOrder for all 5 trains.
const L15 = {
  id:15, name:'Grand Central', scene:'space', cellSize:32,
  hint:'GRAND FINALE! Every train home, in strict order. You got this!',
  grid:[
    ['.','se','h','h','J:X','h','h','sw','.'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:red','J:A','.','.','v',  '.','.','J:E','H:yellow'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:orange','J:G','.','.','v',  '.','.','v','.'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:blue','J:P','h','h','+', 'h','h','J:Q','H:purple'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['H:green','J:C','.','.','v', '.','.','v', '.'],
    ['.','v', '.','.','v',  '.','.','v', '.'],
    ['.','J:D','h','h','J:Y','h','h','nw','.'],
    ['.','v', '.','.','.','.','.','.','.'],
    ['.','D', '.','.','.','.','.','.','.'],
  ],
  depot:{ r:12, c:1, dir:'N' },
  trains:[ { color:'red' }, { color:'blue' }, { color:'green' }, { color:'yellow' }, { color:'purple' } ],
  parkOrder:[ 'red', 'blue', 'green', 'yellow', 'purple' ],
  junctions:{
    A: spurLever('W'), G: spurLever('W'), C: spurLever('W'),
    E: spurLever('E'),
    D: fixedT({ S:'E', N:'E', E:'N' }),
    X: spineLeverH('S'),
    Y: spineLeverH('N'),
    P: {
      states:[
        { label:'↕', map:{ N:'S', S:'N', E:'N' } },
        { label:'⬅', map:{ N:'W', S:'W', E:'W' } },
        { label:'➡', map:{ N:'E', S:'E', E:'N' } },
      ],
      defaultState:0,
    },
    Q: {
      states:[
        { label:'↕', map:{ N:'S', S:'N', W:'N' } },
        { label:'➡', map:{ N:'E', S:'E', W:'E' } },
        { label:'⬅', map:{ N:'W', S:'W', W:'N' } },
      ],
      defaultState:0,
    },
  },
};

// Three difficulty tiers (oval · theta · crossed-theta). Every level is a
// pre-verified, solvable layout. buildLevels() shuffles WITHIN each tier so the
// sequence differs every playthrough while staying easy → hard across tiers.
const TIERS = [
  [L1, L2, L3, L4, L5],       // oval
  [L6, L7, L8, L9, L10],      // theta
  [L11, L12, L13, L14, L15],  // crossed theta
];

function shuffleTier(a){
  const b = [...a];
  for(let i = b.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

// Fresh, tier-shuffled ordering each call. Levels are renumbered 1..15 for
// display; junction/grid data is read-only during play (live lever state lives
// in the engine's state.junctionStates), so sharing references is safe.
function buildLevels(){
  const order = TIERS.flatMap(shuffleTier);
  return order.map((lvl, i) => ({ ...lvl, id: i + 1 }));
}

window.KL = window.KL || {};
window.KL.switchTrack = window.KL.switchTrack || {};
window.KL.switchTrack.TRACK_CONNS  = TRACK_CONNS;
window.KL.switchTrack.HOUSE_COLORS = HOUSE_COLORS;
window.KL.switchTrack.TRAIN_COLORS = TRAIN_COLORS;
window.KL.switchTrack.buildLevels  = buildLevels;
window.KL.switchTrack.LEVELS       = buildLevels();   // initial shuffled set
