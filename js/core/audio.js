// Shared audio helpers — chime, crash, and gentle background music.
// Uses Web Audio API (no asset files, works offline).
//
// AudioContext must be unlocked by a user gesture first, so any game that
// wants sound should call KL.audio.unlock() from inside a click handler
// (or on the very first user interaction). After that, playChime/playCrash
// and startBgMusic/stopBgMusic work.

(function(){
  let ctx = null;
  let bgGain = null;
  let bgTimer = null;

  function getCtx(){
    if(!ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return null;
      ctx = new AC();
    }
    if(ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function unlock(){ return getCtx(); }

  function playTone(freq, dur = 0.3, type = 'triangle', vol = 0.25){
    const ac = getCtx();
    if(!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  }

  // Happy 3-note major arpeggio (C-E-G) when a train reaches home.
  function playChime(){
    playTone(523.25, 0.22, 'triangle', 0.28);
    setTimeout(() => playTone(659.25, 0.22, 'triangle', 0.28), 90);
    setTimeout(() => playTone(783.99, 0.4,  'triangle', 0.32), 180);
  }

  // Dissonant descending thud on crash.
  function playCrash(){
    playTone(220,    0.25, 'square', 0.18);
    setTimeout(() => playTone(146.83, 0.4,  'square', 0.22), 60);
    setTimeout(() => playTone(98,     0.55, 'sawtooth', 0.18), 140);
  }

  // Gentle looping pentatonic pad — very quiet so it doesn't drown effects.
  const BG_NOTES = [261.63, 329.63, 392.00, 440.00, 523.25, 440.00, 392.00, 329.63];
  const BG_TEMPO_MS = 780;

  function startBgMusic(){
    if(bgTimer) return;
    const ac = getCtx();
    if(!ac) return;
    bgGain = ac.createGain();
    bgGain.gain.value = 0.028;
    bgGain.connect(ac.destination);
    let step = 0;
    const tick = () => {
      if(!bgGain) return;
      const freq = BG_NOTES[step % BG_NOTES.length];
      const now = ac.currentTime;
      const osc = ac.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(1, now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.connect(g).connect(bgGain);
      osc.start(now);
      osc.stop(now + 0.8);
      step++;
    };
    tick();
    bgTimer = setInterval(tick, BG_TEMPO_MS);
  }

  function stopBgMusic(){
    if(bgTimer){ clearInterval(bgTimer); bgTimer = null; }
    if(bgGain){
      const ac = getCtx();
      if(ac) bgGain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
      const g = bgGain;
      bgGain = null;
      setTimeout(() => { try { g.disconnect(); } catch(_){} }, 600);
    }
  }

  window.KL = window.KL || {};
  window.KL.audio = { unlock, playTone, playChime, playCrash, startBgMusic, stopBgMusic };
})();
