// Shared audio — chime, crash, tones, and gentle background music.
// Web Audio API (no asset files, works offline).
//
// Mobile notes:
//  • unlock() resumes the context AND plays a 1-sample silent buffer inside the
//    user gesture — iOS needs that to actually start audio.
//  • On load this module auto-arms: the FIRST tap/keypress anywhere unlocks
//    audio and (unless muted) starts background music, and a floating 🔊/🔇
//    toggle is mounted so kids/parents can control + confirm sound.
//    A page can opt out of background music with `window.KL_BG_MUSIC = false`
//    set before this script runs. (iOS hardware mute switch still silences
//    Web Audio — that's an OS limitation, not something we can override.)

(function(){
  let ctx = null, bgGain = null, bgTimer = null;
  let armed = false, installed = false, toggleBtn = null;

  const LS_KEY = 'kl-muted';
  let muted = false;
  try { muted = localStorage.getItem(LS_KEY) === '1'; } catch(_){}

  function getCtx(){
    if(!ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return null;
      ctx = new AC();
    }
    if(ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function unlock(){
    const ac = getCtx();
    if(!ac) return null;
    // iOS: play a silent 1-sample buffer inside the gesture to fully unlock.
    try {
      const buf = ac.createBuffer(1, 1, 22050);
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.connect(ac.destination);
      src.start(0);
    } catch(_){}
    return ac;
  }

  function playTone(freq, dur = 0.3, type = 'triangle', vol = 0.25){
    if(muted) return;
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

  function playChime(){
    playTone(523.25, 0.22, 'triangle', 0.28);
    setTimeout(() => playTone(659.25, 0.22, 'triangle', 0.28), 90);
    setTimeout(() => playTone(783.99, 0.4,  'triangle', 0.32), 180);
  }

  function playCrash(){
    playTone(220,    0.25, 'square', 0.18);
    setTimeout(() => playTone(146.83, 0.4,  'square', 0.22), 60);
    setTimeout(() => playTone(98,     0.55, 'sawtooth', 0.18), 140);
  }

  // Gentle looping pentatonic pad.
  const BG_NOTES = [261.63, 329.63, 392.00, 440.00, 523.25, 440.00, 392.00, 329.63];
  const BG_TEMPO_MS = 780;

  function startBgMusic(){
    if(muted || bgTimer) return;
    const ac = getCtx();
    if(!ac) return;
    bgGain = ac.createGain();
    bgGain.gain.value = 0.05;
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

  // ─── Mute + toggle ────────────────────────────────────────
  function isMuted(){ return muted; }
  function setMuted(m){
    muted = !!m;
    try { localStorage.setItem(LS_KEY, muted ? '1' : '0'); } catch(_){}
    if(muted) stopBgMusic();
    else if(armed && window.KL_BG_MUSIC !== false) startBgMusic();
    updateToggle();
  }
  function toggleMuted(){ setMuted(!muted); }

  function updateToggle(){ if(toggleBtn) toggleBtn.textContent = muted ? '🔇' : '🔊'; }

  function mountToggle(){
    if(toggleBtn || !document.body) return;
    toggleBtn = document.createElement('button');
    toggleBtn.id = 'klSoundToggle';
    toggleBtn.type = 'button';
    toggleBtn.setAttribute('aria-label', 'Toggle sound');
    Object.assign(toggleBtn.style, {
      position:'fixed', top:'12px', right:'12px', zIndex:'2000',
      width:'44px', height:'44px', borderRadius:'50%', border:'none',
      cursor:'pointer', background:'rgba(255,255,255,0.92)',
      boxShadow:'0 3px 0 rgba(0,0,0,0.15)', fontSize:'20px', padding:'0',
      display:'flex', alignItems:'center', justifyContent:'center',
    });
    toggleBtn.onclick = (e) => { e.stopPropagation(); unlock(); toggleMuted(); };
    document.body.appendChild(toggleBtn);
    updateToggle();
  }

  // First gesture anywhere → unlock + (optionally) start music.
  function armAutoUnlock(){
    const onFirst = () => {
      armed = true;
      unlock();
      if(!muted && window.KL_BG_MUSIC !== false) startBgMusic();
      ['pointerdown','touchstart','keydown'].forEach(ev =>
        document.removeEventListener(ev, onFirst, true));
    };
    ['pointerdown','touchstart','keydown'].forEach(ev =>
      document.addEventListener(ev, onFirst, true));
  }

  function install(){
    if(installed) return;
    installed = true;
    mountToggle();
    armAutoUnlock();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();

  window.KL = window.KL || {};
  window.KL.audio = {
    unlock, playTone, playChime, playCrash, startBgMusic, stopBgMusic,
    isMuted, setMuted, toggleMuted, mountToggle, armAutoUnlock,
    debugState: () => (ctx ? ctx.state : 'none'),
  };
})();
