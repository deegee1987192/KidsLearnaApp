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
      tray: ['ramp-right']
    },
    {
      name: 'Other Way',
      hint: 'This time slide it to the left!',
      marble: [4, 0], bucket: [2, 7],
      walls: [],
      stars: [[3, 3]],
      tray: ['ramp-left']
    },
    {
      name: 'Two Steps',
      hint: 'Use both ramps to cross the board!',
      marble: [0, 0], bucket: [4, 7],
      walls: [],
      stars: [[2, 4]],
      tray: ['ramp-right', 'ramp-right']
    },
    {
      name: 'Zig Zag',
      hint: 'Go right, then go left!',
      marble: [1, 0], bucket: [2, 7],
      walls: [[1, 3], [1, 4]],
      stars: [[4, 3]],
      tray: ['ramp-right', 'ramp-left']
    },
    {
      name: 'Switchback',
      hint: 'Find a way around the walls!',
      marble: [0, 0], bucket: [5, 7],
      walls: [[2, 2], [3, 2], [3, 5], [4, 5]],
      stars: [[1, 1], [4, 4]],
      tray: ['ramp-right', 'ramp-right', 'ramp-left']
    },

    /* ═══ Tier 2 (jungle) — add bouncer & funnel ═══ */
    {
      name: 'Spring!',
      hint: 'The bouncer launches the marble UP!',
      marble: [3, 0], bucket: [5, 3],
      walls: [[4, 4], [5, 4]],
      stars: [[3, 5]],
      tray: ['bouncer', 'ramp-right']
    },
    {
      name: 'Bounce House',
      hint: 'Bounce high and slide across!',
      marble: [1, 0], bucket: [5, 7],
      walls: [[2, 4], [3, 4]],
      stars: [[1, 6]],
      tray: ['bouncer', 'ramp-right', 'ramp-right']
    },
    {
      name: 'Sky High',
      hint: 'Two bouncers, one big jump!',
      marble: [0, 0], bucket: [5, 7],
      walls: [[2, 3], [3, 3]],
      stars: [[0, 5], [5, 5]],
      tray: ['bouncer', 'bouncer', 'ramp-right']
    },
    {
      name: 'Catch & Drop',
      hint: 'The funnel catches the marble!',
      marble: [1, 0], bucket: [3, 7],
      walls: [],
      stars: [[2, 2]],
      tray: ['ramp-right', 'funnel']
    },
    {
      name: 'Funnel Run',
      hint: 'Funnels are great catchers!',
      marble: [0, 0], bucket: [4, 7],
      walls: [[2, 3], [3, 3]],
      stars: [[1, 1], [4, 5]],
      tray: ['ramp-right', 'funnel', 'ramp-right']
    },

    /* ═══ Tier 3 (space) — add bumper, mix all ═══ */
    {
      name: 'Pinball',
      hint: 'Bumpers bounce the marble away!',
      marble: [2, 0], bucket: [5, 7],
      walls: [[3, 2]],
      stars: [[4, 4]],
      tray: ['bumper', 'ramp-right']
    },
    {
      name: 'Bumper Cars',
      hint: 'Use bumpers to change direction!',
      marble: [1, 0], bucket: [5, 7],
      walls: [[3, 3], [4, 3]],
      stars: [[2, 2], [5, 5]],
      tray: ['bumper', 'ramp-right', 'ramp-right']
    },
    {
      name: 'The Works',
      hint: 'Use every piece you have!',
      marble: [0, 0], bucket: [5, 7],
      walls: [[2, 2], [3, 2], [4, 5], [5, 5]],
      stars: [[1, 1], [4, 4]],
      tray: ['ramp-right', 'ramp-left', 'bouncer', 'funnel']
    },
    {
      name: 'Cosmic Run',
      hint: 'Think before you place!',
      marble: [5, 0], bucket: [0, 7],
      walls: [[2, 3], [3, 3], [1, 5], [2, 5]],
      stars: [[4, 2], [1, 6]],
      tray: ['ramp-left', 'ramp-left', 'bouncer', 'ramp-right']
    },
    {
      name: 'Grand Finale',
      hint: 'The ultimate marble run!',
      marble: [0, 0], bucket: [5, 7],
      walls: [[1, 2], [2, 2], [3, 4], [4, 4], [1, 6], [2, 6]],
      stars: [[3, 3], [5, 5]],
      tray: ['ramp-right', 'ramp-left', 'bouncer', 'funnel', 'bumper']
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
