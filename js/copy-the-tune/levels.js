// Copy the Tune — pads + per-play level generation.
//
// PADS[]: 4 pads in a fixed 2×2 grid order. Each has a key, colors, and a
// bell-tone frequency (C major triad + octave — every combination sounds nice).
//
// buildLevels(): returns 30 FRESH levels every call, so no two playthroughs are
// the same. Sequence length ramps 2 → 20 (easy → hard); melodies are random.

(function(){
  const PADS = [
    { key:'green',  colorOn:'#66BB6A', colorOff:'#2E7D32', freq: 261.63 }, // C4
    { key:'red',    colorOn:'#EF5350', colorOff:'#B71C1C', freq: 329.63 }, // E4
    { key:'yellow', colorOn:'#FFB300', colorOff:'#F57C00', freq: 392.00 }, // G4
    { key:'blue',   colorOn:'#42A5F5', colorOff:'#1565C0', freq: 523.25 }, // C5
  ];

  // Length per level (30 values) — grows from 2 to 20.
  const LEN_RAMP = [
    2,3,3,4,4,5,5,6,7,8,
    8,9,9,10,10,11,11,12,12,13,
    13,14,14,15,16,17,17,18,19,20,
  ];

  const EARLY_NAMES = ['First Tune','Going Up','Coming Down','Bounce Along','Zig Zag',
                       'Twinkle Shape','Rainbow Run','Six-Step','Long Melody'];
  const SCENES = ['day','jungle','candy','night','space'];

  // Random melody of `len` notes, avoiding 3 of the same pad in a row.
  function genSequence(len){
    const keys = PADS.map(p => p.key);
    const seq = [];
    for(let i = 0; i < len; i++){
      let idx;
      do { idx = Math.floor(Math.random() * keys.length); }
      while(i >= 2 && keys[idx] === seq[i-1] && seq[i-1] === seq[i-2]);
      seq.push(keys[idx]);
    }
    return seq;
  }

  function buildLevels(){
    const out = [];
    for(let i = 0; i < 30; i++){
      const id = i + 1;
      const len = LEN_RAMP[i];
      const isFinal = id === 30;
      out.push({
        id,
        name: i < EARLY_NAMES.length ? EARLY_NAMES[i]
             : isFinal ? 'Grand Finale' : `Round ${id}`,
        scene: SCENES[Math.min(4, Math.floor(i / 6))],
        hint: i === 0 ? 'Watch and listen — then tap the same pads back!'
             : isFinal ? '🎼 The grand finale — 20 notes!'
             : `${len} notes — listen carefully!`,
        sequence: genSequence(len),
      });
    }
    return out;
  }

  window.KL = window.KL || {};
  window.KL.copyTheTune = window.KL.copyTheTune || {};
  window.KL.copyTheTune.PADS        = PADS;
  window.KL.copyTheTune.buildLevels = buildLevels;
  window.KL.copyTheTune.LEVELS      = buildLevels();   // initial set
})();
