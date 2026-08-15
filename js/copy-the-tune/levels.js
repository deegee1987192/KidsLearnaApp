// Copy the Tune — pad + level definitions.
//
// PADS[]: 4 pads in a fixed 2×2 grid order (top-left, top-right, bottom-left, bottom-right).
// Each pad has a key, a display color, and a frequency (Hz) for its bell tone.
// Notes chosen from the C major triad + octave — every combination sounds pleasant.
//
// LEVELS[]: 30 curated melodies. L1–L9 are hand-crafted memorable shapes;
// L10–L30 are generated deterministically with a seeded PRNG so the same
// tune plays on every visit. Sequence length ramps from 2 notes (L1) to 20
// notes (L30).

const PADS = [
  { key:'green',  colorOn:'#66BB6A', colorOff:'#2E7D32', freq: 261.63 }, // C4
  { key:'red',    colorOn:'#EF5350', colorOff:'#B71C1C', freq: 329.63 }, // E4
  { key:'yellow', colorOn:'#FFB300', colorOff:'#F57C00', freq: 392.00 }, // G4
  { key:'blue',   colorOn:'#42A5F5', colorOff:'#1565C0', freq: 523.25 }, // C5
];

const CURATED = [
  { name:'First Tune',    scene:'day',
    hint:'Watch and listen — then tap the same pads back!',
    sequence:['green','red'] },
  { name:'Going Up',      scene:'day',
    hint:'Three notes climbing higher — copy the tune!',
    sequence:['green','red','yellow'] },
  { name:'Coming Down',   scene:'day',
    hint:'Now the tune drops down. Listen carefully!',
    sequence:['blue','yellow','green'] },
  { name:'Bounce Along',  scene:'jungle',
    hint:'A little bounce — up, down, up!',
    sequence:['green','yellow','red','yellow'] },
  { name:'Zig Zag',       scene:'jungle',
    hint:'Zig-zag between two pads, then finish!',
    sequence:['red','yellow','red','green'] },
  { name:'Twinkle Shape', scene:'candy',
    hint:'Doubles! Same-same, then a jump up top.',
    sequence:['green','green','yellow','yellow','blue'] },
  { name:'Rainbow Run',   scene:'candy',
    hint:'All four colors in one melody — go!',
    sequence:['blue','yellow','red','green','red'] },
  { name:'Six-Step',      scene:'night',
    hint:'Six notes now. Ears wide open!',
    sequence:['green','red','yellow','blue','yellow','red'] },
  { name:'Long Melody',   scene:'night',
    hint:'The longest one yet — seven notes to copy!',
    sequence:['green','red','yellow','red','green','red','green'] },
];

// Note-count ramp for L10 through L30 (21 values) — grows to 20 at L30.
const RAMP = [8,8,9,9,10,10,11,11,12,12,13,13,14,14,15,16,17,17,18,19,20];
// RAMP[0] = L10, RAMP[20] = L30.

const SCENES = ['day','jungle','candy','night','space'];

// Small deterministic PRNG so the same level plays the same melody every visit.
function mulberry32(seed){
  return function(){
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function genSequence(len, seed){
  const rng = mulberry32(seed);
  const keys = PADS.map(p => p.key);
  const seq = [];
  let prev = -1;
  for(let i=0; i<len; i++){
    // Avoid runs of 3-of-the-same for musical variety
    let idx;
    do { idx = Math.floor(rng() * keys.length); } while(i >= 2 && idx === prev && seq[i-1] === keys[prev]);
    seq.push(keys[idx]);
    prev = idx;
  }
  return seq;
}

const LEVELS = [];
for(let i=0; i<30; i++){
  const id = i+1;
  if(i < CURATED.length){
    LEVELS.push({ id, ...CURATED[i] });
  } else {
    const noteCount = RAMP[i - CURATED.length];
    const isFinal = id === 30;
    LEVELS.push({
      id,
      name: isFinal ? 'Grand Finale' : `Round ${id}`,
      scene: SCENES[i % SCENES.length],
      hint: isFinal
        ? '🎼 The grand finale — 20 notes!'
        : `${noteCount} notes — listen carefully!`,
      sequence: genSequence(noteCount, id * 977 + 13),
    });
  }
}

window.KL = window.KL || {};
window.KL.copyTheTune = window.KL.copyTheTune || {};
window.KL.copyTheTune.PADS   = PADS;
window.KL.copyTheTune.LEVELS = LEVELS;
