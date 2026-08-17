(function(){
  'use strict';
  window.KL = window.KL || {};
  var NS = (window.KL.rocketLab = window.KL.rocketLab || {});
  var shuffle = KL.util.shuffle;

  var PARTS = {
    nose: [
      { id:'pointy', name:'Pointy', desc:'Zooms through the air!', dragMod:0.85 },
      { id:'round',  name:'Round',  desc:'Steady and smooth!',     dragMod:1.0 },
      { id:'flat',   name:'Flat',   desc:'Catches more air!',      dragMod:1.15 }
    ],
    body: [
      { id:'small',  name:'Small',  desc:'Light but less fuel!',   massMod:0.8, fuelMod:0.75 },
      { id:'medium', name:'Medium', desc:'Just right!',            massMod:1.0, fuelMod:1.0 },
      { id:'big',    name:'Big',    desc:'Heavy but lots of fuel!', massMod:1.2, fuelMod:1.3 }
    ],
    fins: [
      { id:'wide',   name:'Wide',   desc:'Super stable!',   stabilityMod:1.3, dragMod:1.1 },
      { id:'normal', name:'Normal', desc:'Good balance!',    stabilityMod:1.0, dragMod:1.0 },
      { id:'small',  name:'Small',  desc:'Fast but wobbly!', stabilityMod:0.7, dragMod:0.85 }
    ],
    engine: [
      { id:'gentle',   name:'Gentle',   desc:'Saves fuel!',   thrustMod:0.8, burnMod:0.7 },
      { id:'standard', name:'Standard', desc:'Good power!',   thrustMod:1.0, burnMod:1.0 },
      { id:'powerful', name:'Powerful', desc:'Super strong!',  thrustMod:1.3, burnMod:1.4 }
    ]
  };

  var TEMPLATES = [
    /* ═══ Tier 1 (day) — learning to fly ═══ */
    { name:'Lift Off!',  hint:'Hold the screen to fly up, then let go to land!',
      altitude:300, padWidth:120, padX:0.5, wind:0, gustChance:0, fuel:1.2, safeLand:2.0,
      prefill:{nose:'round',body:'medium',fins:'normal'}, pickSlots:['engine'],
      collectStar:null, autoStabilize:0.03 },
    { name:'Easy Rider', hint:'Tap left or right to steer!',
      altitude:350, padWidth:110, padX:0.55, wind:0, gustChance:0, fuel:1.2, safeLand:2.0,
      prefill:{nose:'pointy',body:'medium',fins:'normal'}, pickSlots:['engine'],
      collectStar:null, autoStabilize:0.025 },
    { name:'Slide Over', hint:'The pad is to the left — steer that way!',
      altitude:350, padWidth:100, padX:0.3, wind:0, gustChance:0, fuel:1.1, safeLand:2.0,
      prefill:{nose:'round',body:'small',fins:'wide'}, pickSlots:['engine'],
      collectStar:null, autoStabilize:0.02 },
    { name:'High Flyer', hint:'Fly higher this time!',
      altitude:450, padWidth:100, padX:0.5, wind:0, gustChance:0, fuel:1.1, safeLand:2.0,
      prefill:{nose:'round',body:'medium',fins:'normal'}, pickSlots:['engine'],
      collectStar:null, autoStabilize:0.02 },
    { name:'Pick & Fly', hint:'Choose your fins too!',
      altitude:400, padWidth:100, padX:0.45, wind:0, gustChance:0, fuel:1.0, safeLand:2.0,
      prefill:{nose:'pointy',body:'medium'}, pickSlots:['fins','engine'],
      collectStar:null, autoStabilize:0.015 },

    /* ═══ Tier 2 (jungle) — wind and stars ═══ */
    { name:'Breeze',     hint:'Watch out for the wind!',
      altitude:450, padWidth:90, padX:0.5, wind:0.008, gustChance:0, fuel:1.0, safeLand:1.7,
      prefill:{nose:'pointy',body:'medium'}, pickSlots:['fins','engine'],
      collectStar:{x:0.5,y:0.5}, autoStabilize:0.01 },
    { name:'Gusty',      hint:'Wind gusts push you sideways!',
      altitude:500, padWidth:85, padX:0.4, wind:0.01, gustChance:0.01, fuel:1.0, safeLand:1.7,
      prefill:{nose:'round'}, pickSlots:['body','fins','engine'],
      collectStar:{x:0.35,y:0.45}, autoStabilize:0.008 },
    { name:'Star Chase', hint:'Grab the star on your way up!',
      altitude:550, padWidth:80, padX:0.55, wind:0.012, gustChance:0.012, fuel:0.95, safeLand:1.7,
      prefill:{nose:'pointy'}, pickSlots:['body','fins','engine'],
      collectStar:{x:0.6,y:0.55}, autoStabilize:0.006 },
    { name:'Crosswind',  hint:'The wind is strong — choose wisely!',
      altitude:550, padWidth:80, padX:0.35, wind:0.015, gustChance:0.015, fuel:0.9, safeLand:1.7,
      prefill:{nose:'round'}, pickSlots:['body','fins','engine'],
      collectStar:{x:0.3,y:0.5}, autoStabilize:0.005 },
    { name:'Sky Reach',  hint:'Fly really high and grab the star!',
      altitude:650, padWidth:75, padX:0.5, wind:0.015, gustChance:0.018, fuel:0.9, safeLand:1.7,
      prefill:{}, pickSlots:['nose','body','fins','engine'],
      collectStar:{x:0.45,y:0.6}, autoStabilize:0.003 },

    /* ═══ Tier 3 (space) — expert pilot ═══ */
    { name:'Tiny Target',     hint:'The landing pad is small!',
      altitude:600, padWidth:65, padX:0.5, wind:0.018, gustChance:0.02, fuel:0.85, safeLand:1.4,
      prefill:{}, pickSlots:['nose','body','fins','engine'],
      collectStar:{x:0.55,y:0.5}, autoStabilize:0 },
    { name:'Storm Flight',    hint:'Heavy winds ahead!',
      altitude:650, padWidth:60, padX:0.4, wind:0.022, gustChance:0.025, fuel:0.8, safeLand:1.4,
      prefill:{}, pickSlots:['nose','body','fins','engine'],
      collectStar:{x:0.35,y:0.55}, autoStabilize:0 },
    { name:'Fuel Saver',      hint:'Not much fuel — be efficient!',
      altitude:550, padWidth:60, padX:0.55, wind:0.02, gustChance:0.02, fuel:0.65, safeLand:1.4,
      prefill:{}, pickSlots:['nose','body','fins','engine'],
      collectStar:{x:0.5,y:0.45}, autoStabilize:0 },
    { name:'Far Pad',         hint:'The pad is way over there!',
      altitude:650, padWidth:55, padX:0.2, wind:0.025, gustChance:0.025, fuel:0.75, safeLand:1.4,
      prefill:{}, pickSlots:['nose','body','fins','engine'],
      collectStar:{x:0.25,y:0.5}, autoStabilize:0 },
    { name:'Mission Complete', hint:'The ultimate rocket challenge!',
      altitude:700, padWidth:50, padX:0.45, wind:0.028, gustChance:0.03, fuel:0.7, safeLand:1.4,
      prefill:{}, pickSlots:['nose','body','fins','engine'],
      collectStar:{x:0.4,y:0.6}, autoStabilize:0 }
  ];

  var TIER_SCENES = ['day', 'jungle', 'space'];

  function buildLevels() {
    var t1 = shuffle(TEMPLATES.slice(0, 5));
    var t2 = shuffle(TEMPLATES.slice(5, 10));
    var t3 = shuffle(TEMPLATES.slice(10, 15));
    var all = t1.concat(t2, t3);
    NS.LEVELS = all.map(function(t, i) {
      var lv = {};
      for (var k in t) lv[k] = t[k];
      lv.scene = TIER_SCENES[Math.floor(i / 5)];
      lv.num = i + 1;
      return lv;
    });
    return NS.LEVELS;
  }

  NS.PARTS = PARTS;
  NS.buildLevels = buildLevels;
  NS.LEVELS = buildLevels();
})();
