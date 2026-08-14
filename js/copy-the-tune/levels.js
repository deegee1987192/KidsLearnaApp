// Copy the Tune — pad + level definitions.
//
// PADS[]: 4 pads in a fixed 2×2 grid order (top-left, top-right, bottom-left, bottom-right).
// Each pad has a key, a display color, and a frequency (Hz) for its bell tone.
// Notes chosen from the C major triad + octave — every combination sounds pleasant.
//
// LEVELS[]: 9 curated melodies of growing length, then L10 = endless mode
// (sequence grows by one random note each round; 3 lives across the whole run).

const PADS = [
  { key:'green',  colorOn:'#66BB6A', colorOff:'#2E7D32', freq: 261.63 }, // C4
  { key:'red',    colorOn:'#EF5350', colorOff:'#B71C1C', freq: 329.63 }, // E4
  { key:'yellow', colorOn:'#FFB300', colorOff:'#F57C00', freq: 392.00 }, // G4
  { key:'blue',   colorOn:'#42A5F5', colorOff:'#1565C0', freq: 523.25 }, // C5
];

const LEVELS = [
  { id:1, name:'First Tune',   scene:'day',
    hint:'Watch and listen — then tap the same pads back!',
    sequence:['green','red'] },

  { id:2, name:'Going Up',     scene:'day',
    hint:'Three notes climbing higher — copy the tune!',
    sequence:['green','red','yellow'] },

  { id:3, name:'Coming Down',  scene:'day',
    hint:'Now the tune drops down. Listen carefully!',
    sequence:['blue','yellow','green'] },

  { id:4, name:'Bounce Along', scene:'jungle',
    hint:'A little bounce — up, down, up!',
    sequence:['green','yellow','red','yellow'] },

  { id:5, name:'Zig Zag',      scene:'jungle',
    hint:'Zig-zag between two pads, then finish!',
    sequence:['red','yellow','red','green'] },

  { id:6, name:'Twinkle Shape',scene:'candy',
    hint:'Doubles! Same-same, then a jump up top.',
    sequence:['green','green','yellow','yellow','blue'] },

  { id:7, name:'Rainbow Run',  scene:'candy',
    hint:'All four colors in one melody — go!',
    sequence:['blue','yellow','red','green','red'] },

  { id:8, name:'Six-Step',     scene:'night',
    hint:'Six notes now. Ears wide open!',
    sequence:['green','red','yellow','blue','yellow','red'] },

  { id:9, name:'Long Melody',  scene:'night',
    hint:'The longest one yet — seven notes to copy!',
    sequence:['green','red','yellow','red','green','red','green'] },

  { id:10, name:"Wiz's Endless Tune", scene:'space',
    hint:'The tune grows and grows! How far can you go?',
    endless:true },
];

window.KL = window.KL || {};
window.KL.copyTheTune = window.KL.copyTheTune || {};
window.KL.copyTheTune.PADS   = PADS;
window.KL.copyTheTune.LEVELS = LEVELS;
