// Switch Track — level definitions.
//
// Grid tokens (each cell in the grid):
//   '.'      empty (grass)
//   'G'      start marker (must match `start.r,c`)
//   'h','v'  horizontal / vertical straight
//   'ne','nw','se','sw'  curve — the letters name the two sides that connect
//                        e.g. 'ne' connects N + E (an └ elbow)
//   '+'      cross (straight-through on both axes)
//   'S:A'    switch, key 'A' — states live in `switches.A`
//   'T:red'  station colored red (accepts train from any side)
//
// Switch spec:
//   { states: [ ['W','N'], ['W','S'] ],  // 2 or more toggle options
//     defaultState: 0 }
//
// The kid taps a switch to cycle its state, then presses GO.
// Simulator runs the train from `start` in direction `start.dir` and follows
// track connections until it reaches a station, derails, or loops.

const TRACK_CONNS = {
  h:  ['W','E'],
  v:  ['N','S'],
  ne: ['N','E'],
  nw: ['N','W'],
  se: ['S','E'],
  sw: ['S','W'],
  '+':['N','S','E','W'],
};

const STATION_COLORS = {
  red:   '#EF5350',
  blue:  '#42A5F5',
  green: '#66BB6A',
  yellow:'#FFB300',
  purple:'#AB47BC',
};

// L1 — pure tutorial: no switches, just press GO.
const L1 = {
  id:1, name:'First Track', scene:'day',
  cellSize:60, rows:5, cols:7,
  hint:"Press GO ▶ to send the train home!",
  start:{ r:2, c:0, dir:'E' },
  targetColor:'red',
  grid:[
    ['.','.','.','.','.','.','.'],
    ['.','.','.','.','.','.','.'],
    ['G','h','h','h','h','h','T:red'],
    ['.','.','.','.','.','.','.'],
    ['.','.','.','.','.','.','.'],
  ],
  switches:{},
};

// L2 — one switch, pick UP (red) or DOWN (blue). Target: red.
const L2 = {
  id:2, name:'Pick a Path', scene:'day',
  cellSize:60, rows:5, cols:6,
  hint:"Tap the switch to point ⬆ or ⬇, then GO. Reach RED.",
  start:{ r:2, c:0, dir:'E' },
  targetColor:'red',
  grid:[
    ['.','.','.','.','T:red','.'],
    ['.','.','.','se','nw','.'],
    ['G','h','h','S:A','.','.'],
    ['.','.','.','ne','sw','.'],
    ['.','.','.','.','T:blue','.'],
  ],
  switches:{
    A:{ states:[ ['W','N'], ['W','S'] ], defaultState:0 },
  },
};

// L3 — same layout, target changed to BLUE. Teaches "same switch, different goal".
const L3 = {
  id:3, name:'Blue Bound', scene:'day',
  cellSize:60, rows:5, cols:6,
  hint:"Same track — but this time deliver to BLUE.",
  start:{ r:2, c:0, dir:'E' },
  targetColor:'blue',
  grid:[
    ['.','.','.','.','T:red','.'],
    ['.','.','.','se','nw','.'],
    ['G','h','h','S:A','.','.'],
    ['.','.','.','ne','sw','.'],
    ['.','.','.','.','T:blue','.'],
  ],
  switches:{
    A:{ states:[ ['W','N'], ['W','S'] ], defaultState:0 },
  },
};

// L4 — two switches, three-way branch reunites at GREEN
//
// Switch A picks up / straight / down.
// Switch B accepts train from N / W / S depending on how A routed it,
// always exiting E into the green station.
//
//    row 0: . . . . . . . .
//    row 1: . . . se h sw . .
//    row 2: G h h SA . SB h Tg
//    row 3: . . . ne h nw . .
//    row 4: . . . . . . . .
const L4 = {
  id:4, name:'Two Choices', scene:'jungle',
  cellSize:58, rows:5, cols:8,
  hint:"Set BOTH switches so the train reaches GREEN.",
  start:{ r:2, c:0, dir:'E' },
  targetColor:'green',
  grid:[
    ['.','.','.','.',   '.', '.',   '.','.'],
    ['.','.','.','se',  'h', 'sw',  '.','.'],
    ['G','h','h','S:A', '.', 'S:B', 'h','T:green'],
    ['.','.','.','ne',  'h', 'nw',  '.','.'],
    ['.','.','.','.',   '.', '.',   '.','.'],
  ],
  switches:{
    A:{ states:[ ['W','N'], ['W','E'], ['W','S'] ], defaultState:1 },
    B:{ states:[ ['N','E'], ['W','E'], ['S','E'] ], defaultState:1 },
  },
};

// L5 — two switches, upper vs lower loop, both reach YELLOW
const L5 = {
  id:5, name:'Roundabout', scene:'jungle',
  cellSize:58, rows:5, cols:8,
  hint:"Both loops reach YELLOW — but both switches must agree.",
  start:{ r:2, c:0, dir:'E' },
  targetColor:'yellow',
  grid:[
    ['.','.','se','h','h','h','sw','.'],
    ['.','.','v','.','.','.','v','.'],
    ['G','h','S:A','.','.','.','S:B','T:yellow'],
    ['.','.','v','.','.','.','v','.'],
    ['.','.','ne','h','h','h','nw','.'],
  ],
  switches:{
    A:{ states:[ ['W','N'], ['W','S'] ], defaultState:0 },
    B:{ states:[ ['N','E'], ['S','E'] ], defaultState:0 },
  },
};

// L6 — 3-way switch, 3 stations, target PURPLE (middle)
const L6 = {
  id:6, name:'Three Stations', scene:'day',
  cellSize:56, rows:7, cols:7,
  hint:"Three stations! Pick PURPLE.",
  start:{ r:3, c:0, dir:'E' },
  targetColor:'purple',
  grid:[
    ['.','.','.','.','.','.','T:red'],
    ['.','.','.','se','h','h','nw'],
    ['.','.','.','v','.','.','.'],
    ['G','h','h','S:A','h','h','T:purple'],
    ['.','.','.','v','.','.','.'],
    ['.','.','.','ne','h','h','sw'],
    ['.','.','.','.','.','.','T:blue'],
  ],
  switches:{
    A:{ states:[ ['W','N'], ['W','E'], ['W','S'] ], defaultState:1 },
  },
};

// L7 — two 3-way switches, cleaner topology reaching BLUE
const L7 = {
  id:7, name:'Crossroads', scene:'night',
  cellSize:52, rows:5, cols:9,
  hint:"Both switches must line up — reach BLUE.",
  start:{ r:2, c:0, dir:'E' },
  targetColor:'blue',
  grid:[
    ['.','.','se','h','h','h','h','sw','.'],
    ['.','.','v','.','.','.','.','v','.'],
    ['G','h','S:A','h','h','h','h','S:B','T:blue'],
    ['.','.','v','.','.','.','.','v','.'],
    ['.','.','ne','h','h','h','h','nw','.'],
  ],
  switches:{
    A:{ states:[ ['W','N'], ['W','E'], ['W','S'] ], defaultState:1 },
    B:{ states:[ ['N','E'], ['W','E'], ['S','E'] ], defaultState:1 },
  },
};

// L8 — train starts heading SOUTH; single switch to pick straight-down (green) or turn right (red)
const L8 = {
  id:8, name:'Head South', scene:'candy',
  cellSize:56, rows:6, cols:6,
  hint:"Train starts heading DOWN! Reach GREEN.",
  start:{ r:0, c:1, dir:'S' },
  targetColor:'green',
  grid:[
    ['.','G','.','.','.','.'],
    ['.','v','.','.','.','.'],
    ['.','S:A','h','h','h','T:red'],
    ['.','v','.','.','.','.'],
    ['.','v','.','.','.','.'],
    ['.','T:green','.','.','.','.'],
  ],
  switches:{
    A:{ states:[ ['N','S'], ['N','E'] ], defaultState:0 },
  },
};

// L9 — three switches, target PURPLE. Middle switch B routes N or S,
// then C on the right column picks N/straight/S.
const L9 = {
  id:9, name:'Three Switches', scene:'space',
  cellSize:50, rows:5, cols:9,
  hint:"Three switches to align — aim for PURPLE.",
  start:{ r:2, c:0, dir:'E' },
  targetColor:'purple',
  grid:[
    ['.','.','.','.','se','h','h','sw','.'],
    ['.','.','.','.','v','.','.','v','.'],
    ['G','h','S:A','h','S:B','h','h','S:C','T:purple'],
    ['.','.','.','.','v','.','.','v','.'],
    ['.','.','.','.','ne','h','h','nw','.'],
  ],
  switches:{
    // A: only straight (state 1 pure straight-through, state 0 same as straight)
    // A is a 2-state where both go E — makes it a "warm-up" switch (either works).
    A:{ states:[ ['W','E'], ['W','E'] ], defaultState:0 },
    // B: pick N / straight / S
    B:{ states:[ ['W','N'], ['W','E'], ['W','S'] ], defaultState:1 },
    // C: accept from N / W / S, always exit E
    C:{ states:[ ['N','E'], ['W','E'], ['S','E'] ], defaultState:1 },
  },
};

// L9 refined — A is useless as-is. Give A a real choice: bypass or go through B/C.
// Make A pick E (straight into B) or S (short-cut down and around to red decoy).
// Simpler: revert to a straight-only A but with meaningful B and C. Actually
// let's just make L9 punchy: 3 real 3-way switches, only one combination wins.
L9.switches = {
  A:{ states:[ ['W','N'], ['W','E'], ['W','S'] ], defaultState:1 },
  B:{ states:[ ['W','N'], ['W','E'], ['W','S'] ], defaultState:1 },
  C:{ states:[ ['N','E'], ['W','E'], ['S','E'] ], defaultState:1 },
};
// Adjust grid: A now can send train N/E/S. Add small curves so N/S go somewhere
// reasonable (both dead-end for now — kid learns "straight is right for A").
L9.grid = [
  ['.','.','.','.','se','h','h','sw','.'],
  ['.','.','.','.','v','.','.','v','.'],
  ['G','h','S:A','h','S:B','h','h','S:C','T:purple'],
  ['.','.','.','.','v','.','.','v','.'],
  ['.','.','.','.','ne','h','h','nw','.'],
];

// L10 — grand finale: 3 switches, 3 stations, target YELLOW (middle)
// Two identical "H" shapes side by side; kid must route through both.
const L10 = {
  id:10, name:"Wiz's Grand Route", scene:'space',
  cellSize:50, rows:5, cols:10,
  hint:"Grand finale! Route all the way to YELLOW.",
  start:{ r:2, c:0, dir:'E' },
  targetColor:'yellow',
  grid:[
    ['.','.','se','h','sw','.','se','h','sw','.'],
    ['.','.','v','.','v','.','v','.','v','.'],
    ['G','h','S:A','.','S:B','h','S:C','.','S:D','T:yellow'],
    ['.','.','v','.','v','.','v','.','v','.'],
    ['.','.','ne','h','nw','.','ne','h','nw','.'],
  ],
  switches:{
    A:{ states:[ ['W','N'], ['W','S'] ], defaultState:0 },
    B:{ states:[ ['N','E'], ['S','E'] ], defaultState:0 },
    C:{ states:[ ['W','N'], ['W','S'] ], defaultState:0 },
    D:{ states:[ ['N','E'], ['S','E'] ], defaultState:0 },
  },
};

const LEVELS = [L1, L2, L3, L4, L5, L6, L7, L8, L9, L10];

window.KL = window.KL || {};
window.KL.switchTrack = window.KL.switchTrack || {};
window.KL.switchTrack.TRACK_CONNS   = TRACK_CONNS;
window.KL.switchTrack.STATION_COLORS = STATION_COLORS;
window.KL.switchTrack.LEVELS         = LEVELS;
