(function () {
  'use strict';
  const NS = (window.KL.marbleRun = window.KL.marbleRun || {});
  const { shuffle } = KL.util;

  const COLS = 6, ROWS = 8;

  const TEMPLATES = [
    /* ═══ Tier 1 (day) — ramps only ═══ */
    {
      name: 'First Roll',
      hint: 'Tap the ramp, then tap the board!',
      marble: [2, 0], bucket: [4, 7],
      walls: [],
      stars: [[3, 4]],
      tray: ['ramp-right'],
      solution: [[2, 3, 'ramp-right']]
    },
    {
      name: 'Other Way',
      hint: 'This time slide it to the left!',
      marble: [4, 0], bucket: [2, 7],
      walls: [],
      stars: [[3, 4]],
      tray: ['ramp-left'],
      solution: [[4, 3, 'ramp-left']]
    },
    {
      name: 'Two Steps',
      hint: 'Use both ramps to cross the board!',
      marble: [0, 0], bucket: [3, 7],
      walls: [],
      stars: [[1, 3]],
      tray: ['ramp-right', 'ramp-right'],
      solution: [[0, 2, 'ramp-right'], [2, 5, 'ramp-right']]
    },
    {
      name: 'Zig Zag',
      hint: 'Go right, then go left!',
      marble: [1, 0], bucket: [1, 7],
      walls: [],
      stars: [[2, 2]],
      tray: ['ramp-right', 'ramp-left'],
      solution: [[1, 1, 'ramp-right'], [3, 4, 'ramp-left']]
    },
    {
      name: 'Switchback',
      hint: 'Go left twice to reach the bucket!',
      marble: [5, 0], bucket: [2, 7],
      walls: [],
      stars: [[4, 2], [2, 6]],
      tray: ['ramp-left', 'ramp-left', 'ramp-right'],
      solution: [[5, 1, 'ramp-left'], [3, 5, 'ramp-left']]
    },

    /* ═══ Tier 2 (jungle) — add bouncer & funnel ═══ */
    {
      name: 'Boing!',
      hint: 'The bouncer launches the marble UP!',
      marble: [2, 0], bucket: [4, 7],
      walls: [],
      stars: [[3, 5]],
      tray: ['bouncer', 'ramp-right'],
      solution: [[2, 7, 'bouncer'], [2, 4, 'ramp-right']]
    },
    {
      name: 'Bounce House',
      hint: 'Bounce high and slide across!',
      marble: [1, 0], bucket: [4, 7],
      walls: [],
      stars: [[2, 4]],
      tray: ['bouncer', 'ramp-right', 'ramp-right'],
      solution: [[1, 7, 'bouncer'], [1, 3, 'ramp-right'], [3, 6, 'ramp-right']]
    },
    {
      name: 'Sky High',
      hint: 'Two bouncers, double the fun!',
      marble: [0, 0], bucket: [3, 7],
      walls: [],
      stars: [[1, 4], [3, 6]],
      tray: ['bouncer', 'bouncer', 'ramp-right'],
      solution: [[0, 7, 'bouncer'], [0, 3, 'ramp-right'], [2, 7, 'bouncer']]
    },
    {
      name: 'Catch & Drop',
      hint: 'The funnel catches the marble!',
      marble: [1, 0], bucket: [3, 7],
      walls: [],
      stars: [[3, 5]],
      tray: ['ramp-right', 'funnel'],
      solution: [[1, 1, 'ramp-right'], [3, 4, 'funnel']]
    },
    {
      name: 'Funnel Run',
      hint: 'Funnels are great catchers!',
      marble: [0, 0], bucket: [3, 7],
      walls: [],
      stars: [[1, 2], [2, 5]],
      tray: ['ramp-right', 'funnel', 'ramp-right'],
      solution: [[0, 1, 'ramp-right'], [2, 4, 'funnel'], [2, 6, 'ramp-right']]
    },

    /* ═══ Tier 3 (space) — harder combos with walls ═══ */
    {
      name: 'Labyrinth',
      hint: 'Find a path around the walls!',
      marble: [0, 0], bucket: [4, 7],
      walls: [[2, 2], [3, 2]],
      stars: [[1, 2], [4, 6]],
      tray: ['ramp-right', 'ramp-right', 'ramp-right'],
      solution: [[0, 1, 'ramp-right'], [2, 4, 'ramp-right'], [3, 5, 'ramp-right']]
    },
    {
      name: 'Bounce Back',
      hint: 'Bounce up and slide left!',
      marble: [3, 0], bucket: [1, 7],
      walls: [],
      stars: [[2, 4]],
      tray: ['bouncer', 'ramp-left', 'ramp-left'],
      solution: [[3, 7, 'bouncer'], [3, 3, 'ramp-left'], [2, 6, 'ramp-left']]
    },
    {
      name: 'The Works',
      hint: 'Use every piece you need!',
      marble: [0, 0], bucket: [3, 7],
      walls: [[3, 3], [4, 3]],
      stars: [[1, 2], [2, 5]],
      tray: ['ramp-right', 'funnel', 'ramp-right', 'ramp-left'],
      solution: [[0, 1, 'ramp-right'], [2, 4, 'funnel'], [2, 6, 'ramp-right']]
    },
    {
      name: 'Cosmic Run',
      hint: 'Think before you place!',
      marble: [5, 0], bucket: [2, 7],
      walls: [[2, 2], [2, 3]],
      stars: [[4, 2], [2, 6]],
      tray: ['ramp-left', 'ramp-left', 'bouncer', 'ramp-right'],
      solution: [[5, 1, 'ramp-left'], [3, 5, 'ramp-left']]
    },
    {
      name: 'Grand Finale',
      hint: 'The ultimate marble run!',
      marble: [0, 0], bucket: [5, 7],
      walls: [[4, 2], [5, 2]],
      stars: [[1, 3], [4, 4]],
      tray: ['ramp-right', 'bouncer', 'ramp-right', 'funnel', 'ramp-left'],
      solution: [[0, 2, 'ramp-right'], [2, 7, 'bouncer'], [3, 3, 'ramp-right']]
    }
  ];

  const TIER_SCENES = ['day', 'jungle', 'space'];

  function buildLevels() {
    const t1 = shuffle(TEMPLATES.slice(0, 5));
    const t2 = shuffle(TEMPLATES.slice(5, 10));
    const t3 = shuffle(TEMPLATES.slice(10, 15));
    const all = [...t1, ...t2, ...t3];
    NS.LEVELS = all.map((t, i) => ({
      ...t,
      scene: TIER_SCENES[Math.floor(i / 5)],
      num: i + 1
    }));
    return NS.LEVELS;
  }

  NS.COLS = COLS;
  NS.ROWS = ROWS;
  NS.buildLevels = buildLevels;
  NS.LEVELS = buildLevels();
})();
