// Switch Track — level definitions (v4: shared depot + levers at every branch).
//
// KEY MECHANICS
//   • All trains launch from a shared `depot` cell, staggered by 3s.
//   • Trains circulate on a shared track network once launched.
//   • Every branching cell is a junction (J:X) with a lever the kid can
//     tap AT ANY TIME (including mid-play) to change routing.
//   • Same-cell / head-on collisions crash; wrong-color house crashes.
//   • Level clears when every train has parked at its matching-color house.
//
// GRID TOKENS
//   '.'                 empty (grass)
//   'h','v'             straight track
//   'ne','nw','se','sw' curves (letters = the two connected sides)
//   'J:A'               junction with key 'A' (routing in `junctions.A`)
//   'H:red'             house of that color (parks matching train, crashes others)
//
// LEVEL SCHEMA
//   depot:  { r, c, dir }             single spawn cell + direction (all trains)
//   trains: [ { color }, ... ]        launched from depot, 3s apart in order
//   junctions: { KEY: { states, defaultState } }
//
// Every junction cell must be tagged 'J:KEY' — plain '+' or curved cells
// have no lever, so use 'J:KEY' anywhere the kid should get to choose.
//
// Junction state maps are  { enteringSide: exitingSide }. Physical sides at
// a junction cell = union of every side referenced across all states. There
// is no derail: a junction always provides a valid exit for any incoming
// direction the level uses.

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

// Trains share the same color as their matching home so pairing is obvious.
const TRAIN_COLORS = { ...HOUSE_COLORS };

// A T-shaped junction on a vertical loop where a "home spur" branches off
// east or west. Loop mode passes vertical (↑/↓); the "home" mode diverts
// trains toward the given side. Labels are pure arrows.
function spurLever(exit, defaultState = 0){
  const homeArrow = { E:'➡', W:'⬅', N:'⬆', S:'⬇' }[exit];
  return {
    states: [
      { label:'↕',       map:{ N:'S', S:'N' } },        // loop straight
      { label:homeArrow, map:{ N:exit, S:exit } },      // divert into house
    ],
    defaultState,
  };
}

// A fixed-routing T-junction — no lever appears on it (single state), just
// used to plumb the depot spur into the main loop. All incoming directions
// exit toward the side given (defaults tuned per-level).
function fixedT(map){
  return { states:[ { label:'', map } ], defaultState:0 };
}

// Same but for horizontal-flowing loop (E↔W); divert N or S into home.
function spurLeverH(exit, defaultState = 0){
  return {
    states: [
      { label:'↔',   map:{ E:'W', W:'E' } },
      { label:'🏠',  map:{ E:exit, W:exit } },
    ],
    defaultState,
  };
}

// A 4-way crossing lever. State 0 = straight through both axes. State 1 =
// right-hand redirect (N→E→S→W→N cycle).
function crossLever(defaultState = 0){
  return {
    states: [
      { label:'✕',  map:{ N:'S', S:'N', E:'W', W:'E' } },
      { label:'⤴',  map:{ N:'E', E:'S', S:'W', W:'N' } },
    ],
    defaultState,
  };
}

// ─── L1 — First Loop ────────────────────────────────────────
// One train, one lever, one home. Depot is OUTSIDE the loop; the depot spur
// joins the loop at J:D (a fixed T, no visible lever). Trains can never
// return to the depot.
const L1 = {
  id:1, name:'First Loop', scene:'day', cellSize:52,
  hint:'Press GO — then tap Lever A when the train is close, to send it home.',
  grid:[
    ['.','se','h','h','h','sw','.'],
    ['.','v', '.','.','.','v', '.'],
    ['.','v', '.','.','.','J:A','H:red'],
    ['.','v', '.','.','.','v', '.'],
    ['.','J:D','h','h','h','nw','.'],
    ['.','v', '.','.','.','.','.'],
    ['.','D', '.','.','.','.','.'],
  ],
  depot: { r:6, c:1, dir:'N' },
  trains:[ { color:'red' } ],
  junctions:{
    // A: home lever — loop straight (N↔S) or divert east into H:red.
    A: spurLever('E'),
    // D: depot spur T — fixed. Depot arrivals (S) exit E onto the loop's
    //    bottom; loop arrivals from N (top) also exit E (never route back
    //    toward the depot at S); loop arrivals from E turn N (up the left
    //    column). No lever — the kid has no meaningful choice here.
    D: fixedT({ S:'E', N:'E', E:'N' }),
  },
};

// ─── L2 — Two Trains, One Loop ──────────────────────────────
// Two trains launch from the SAME depot 3s apart. They share one loop and
// two home spurs. RED must arrive home BEFORE BLUE — get them in the wrong
// order and Wiz says try again.
const L2 = {
  id:2, name:'Share the Loop', scene:'day', cellSize:48,
  hint:'Red home FIRST, then blue! Flip A for red, then B for blue.',
  grid:[
    ['.','se','h','h','h','h','h','sw','.'],
    ['.','v', '.','.','.','.','.','v', '.'],
    ['H:red','J:A','.','.','.','.','.','J:B','H:blue'],
    ['.','v', '.','.','.','.','.','v', '.'],
    ['.','J:D','h','h','h','h','h','nw','.'],
    ['.','v', '.','.','.','.','.','.', '.'],
    ['.','D', '.','.','.','.','.','.', '.'],
  ],
  depot: { r:6, c:1, dir:'N' },
  trains:[ { color:'red' }, { color:'blue' } ],
  parkOrder:[ 'red', 'blue' ],
  junctions:{
    A: spurLever('W'),   // divert west into H:red
    B: spurLever('E'),   // divert east into H:blue
    D: fixedT({ S:'E', N:'E', E:'N' }),
  },
};

// ─── L3 — Three Trains ─────────────────────────────────────
// Same depot pattern as L2 but three trains, three homes stacked on the left.
// No parkOrder yet — just teach the "one lever per train" rhythm.
const L3 = {
  id:3, name:'Three Trains', scene:'jungle', cellSize:44,
  hint:'Three trains, three homes! Flip each lever at the right moment.',
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
  depot: { r:10, c:1, dir:'N' },
  trains:[ { color:'red' }, { color:'blue' }, { color:'green' } ],
  junctions:{
    A: spurLever('W'),
    B: spurLever('W'),
    C: spurLever('W'),
    D: fixedT({ S:'E', N:'E', E:'N' }),
  },
};

// ─── L4 — Order Matters ────────────────────────────────────
// Same layout as L3 but with a strict parking order (red → blue → green).
// Divert the wrong train first and Wiz calls it out.
const L4 = {
  id:4, name:'Order Matters', scene:'jungle', cellSize:44,
  hint:'RED first, then BLUE, then GREEN. Divert them in that order!',
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
  depot: { r:10, c:1, dir:'N' },
  trains:[ { color:'red' }, { color:'blue' }, { color:'green' } ],
  parkOrder:[ 'red', 'blue', 'green' ],
  junctions:{
    A: spurLever('W'),
    B: spurLever('W'),
    C: spurLever('W'),
    D: fixedT({ S:'E', N:'E', E:'N' }),
  },
};

// ─── L5 — Four Trains ──────────────────────────────────────
// Four trains, four homes across BOTH sides of a rectangle. Right column now
// has a home too (yellow).
const L5 = {
  id:5, name:'Four Trains', scene:'night', cellSize:40,
  hint:'Four trains, four homes on both sides — flip each lever in time.',
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
  depot: { r:10, c:1, dir:'N' },
  trains:[ { color:'red' }, { color:'blue' }, { color:'green' }, { color:'yellow' } ],
  junctions:{
    A: spurLever('W'),
    B: spurLever('W'),
    C: spurLever('W'),
    E: spurLever('E'),
    D: fixedT({ S:'E', N:'E', E:'N' }),
  },
};

// ─── L6 — Four in Order ────────────────────────────────────
// L5 layout + parkOrder (red → blue → green → yellow).
const L6 = {
  id:6, name:'Four in Order', scene:'night', cellSize:40,
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
  depot: { r:10, c:1, dir:'N' },
  trains:[ { color:'red' }, { color:'blue' }, { color:'green' }, { color:'yellow' } ],
  parkOrder:[ 'red', 'blue', 'green', 'yellow' ],
  junctions:{
    A: spurLever('W'),
    B: spurLever('W'),
    C: spurLever('W'),
    E: spurLever('E'),
    D: fixedT({ S:'E', N:'E', E:'N' }),
  },
};

// ─── L7 — Both Sides ───────────────────────────────────────
// Homes on left AND right at multiple rows. 5 tappable levers.
const L7 = {
  id:7, name:'Both Sides', scene:'space', cellSize:36,
  hint:'Homes on both sides! Five levers to manage.',
  grid:[
    ['.','se','h','h','h','sw','.'],
    ['.','v', '.','.','.','v', '.'],
    ['H:red','J:A','.','.','.','J:E','H:yellow'],
    ['.','v', '.','.','.','v', '.'],
    ['H:blue','J:B','.','.','.','J:F','H:purple'],
    ['.','v', '.','.','.','v', '.'],
    ['H:green','J:C','.','.','.','v', '.'],
    ['.','v', '.','.','.','v', '.'],
    ['.','J:D','h','h','h','nw','.'],
    ['.','v', '.','.','.','.','.'],
    ['.','D', '.','.','.','.','.'],
  ],
  depot: { r:10, c:1, dir:'N' },
  trains:[ { color:'red' }, { color:'blue' }, { color:'green' }, { color:'yellow' }, { color:'purple' } ],
  junctions:{
    A: spurLever('W'),
    B: spurLever('W'),
    C: spurLever('W'),
    E: spurLever('E'),
    F: spurLever('E'),
    D: fixedT({ S:'E', N:'E', E:'N' }),
  },
};

// ─── L8 — Both Sides, In Order ─────────────────────────────
// L7 + strict order.
const L8 = {
  id:8, name:'Both Sides, In Order', scene:'space', cellSize:36,
  hint:'RED, BLUE, GREEN, YELLOW, PURPLE — in order across both sides!',
  grid:[
    ['.','se','h','h','h','sw','.'],
    ['.','v', '.','.','.','v', '.'],
    ['H:red','J:A','.','.','.','J:E','H:yellow'],
    ['.','v', '.','.','.','v', '.'],
    ['H:blue','J:B','.','.','.','J:F','H:purple'],
    ['.','v', '.','.','.','v', '.'],
    ['H:green','J:C','.','.','.','v', '.'],
    ['.','v', '.','.','.','v', '.'],
    ['.','J:D','h','h','h','nw','.'],
    ['.','v', '.','.','.','.','.'],
    ['.','D', '.','.','.','.','.'],
  ],
  depot: { r:10, c:1, dir:'N' },
  trains:[ { color:'red' }, { color:'blue' }, { color:'green' }, { color:'yellow' }, { color:'purple' } ],
  parkOrder:[ 'red', 'blue', 'green', 'yellow', 'purple' ],
  junctions:{
    A: spurLever('W'),
    B: spurLever('W'),
    C: spurLever('W'),
    E: spurLever('E'),
    F: spurLever('E'),
    D: fixedT({ S:'E', N:'E', E:'N' }),
  },
};

// ─── L9 — Big Yard ─────────────────────────────────────────
// Wider loop with a sixth home on the right side.
const L9 = {
  id:9, name:'Big Yard', scene:'space', cellSize:34,
  hint:'A bigger loop with six homes! Take your time.',
  grid:[
    ['.','se','h','h','h','sw','.'],
    ['.','v', '.','.','.','v', '.'],
    ['H:red','J:A','.','.','.','J:E','H:yellow'],
    ['.','v', '.','.','.','v', '.'],
    ['H:blue','J:B','.','.','.','J:F','H:purple'],
    ['.','v', '.','.','.','v', '.'],
    ['H:green','J:C','.','.','.','J:G','H:orange'],
    ['.','v', '.','.','.','v', '.'],
    ['.','J:D','h','h','h','nw','.'],
    ['.','v', '.','.','.','.','.'],
    ['.','D', '.','.','.','.','.'],
  ],
  depot: { r:10, c:1, dir:'N' },
  trains:[ { color:'red' }, { color:'blue' }, { color:'green' }, { color:'yellow' }, { color:'purple' }, { color:'orange' } ],
  junctions:{
    A: spurLever('W'),
    B: spurLever('W'),
    C: spurLever('W'),
    E: spurLever('E'),
    F: spurLever('E'),
    G: spurLever('E'),
    D: fixedT({ S:'E', N:'E', E:'N' }),
  },
};

// ─── L10 — Grand Central ───────────────────────────────────
// Grand finale: L9 + strict order across all six trains.
const L10 = {
  id:10, name:'Grand Central', scene:'space', cellSize:32,
  hint:'Grand Central! Six trains, six homes, in strict order. You got this!',
  grid:[
    ['.','se','h','h','h','sw','.'],
    ['.','v', '.','.','.','v', '.'],
    ['H:red','J:A','.','.','.','J:E','H:yellow'],
    ['.','v', '.','.','.','v', '.'],
    ['H:blue','J:B','.','.','.','J:F','H:purple'],
    ['.','v', '.','.','.','v', '.'],
    ['H:green','J:C','.','.','.','J:G','H:orange'],
    ['.','v', '.','.','.','v', '.'],
    ['.','J:D','h','h','h','nw','.'],
    ['.','v', '.','.','.','.','.'],
    ['.','D', '.','.','.','.','.'],
  ],
  depot: { r:10, c:1, dir:'N' },
  trains:[ { color:'red' }, { color:'blue' }, { color:'green' }, { color:'yellow' }, { color:'purple' }, { color:'orange' } ],
  parkOrder:[ 'red', 'blue', 'green', 'yellow', 'purple', 'orange' ],
  junctions:{
    A: spurLever('W'),
    B: spurLever('W'),
    C: spurLever('W'),
    E: spurLever('E'),
    F: spurLever('E'),
    G: spurLever('E'),
    D: fixedT({ S:'E', N:'E', E:'N' }),
  },
};

const LEVELS = [L1, L2, L3, L4, L5, L6, L7, L8, L9, L10];

window.KL = window.KL || {};
window.KL.switchTrack = window.KL.switchTrack || {};
window.KL.switchTrack.TRACK_CONNS  = TRACK_CONNS;
window.KL.switchTrack.HOUSE_COLORS = HOUSE_COLORS;
window.KL.switchTrack.TRAIN_COLORS = TRAIN_COLORS;
window.KL.switchTrack.LEVELS       = LEVELS;
