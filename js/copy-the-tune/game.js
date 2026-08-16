// Copy the Tune — audio, state machine, pad UI.
// Expects levels.js already loaded.

(function(){
  const { PADS } = window.KL.copyTheTune;
  let LEVELS = window.KL.copyTheTune.buildLevels();   // fresh, random each play
  const { setScene } = window.KL.scene;
  const { say: wizSay } = window.KL.wiz;
  const { launchConfetti } = window.KL.confetti;
  const { el } = window.KL.util;

  // ─── Web Audio ─────────────────────────────────────────────
  // Bell-ish tone: triangle wave + fast attack + exponential decay.
  // AudioContext is created lazily on the first user gesture (LISTEN tap)
  // because browsers block auto-created contexts.
  let audioCtx = null;
  function ensureCtx(){
    if(!audioCtx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return null;
      audioCtx = new AC();
    }
    if(audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function playNote(freq, durSec = 0.5){
    const ac = ensureCtx();
    if(!ac) return;
    const now = ac.currentTime;

    // Fundamental
    const osc = ac.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    // Soft upper harmonic for a bell-like shimmer
    const osc2 = ac.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, now);

    const gain  = ac.createGain();
    const gain2 = ac.createGain();

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durSec);

    gain2.gain.setValueAtTime(0.0001, now);
    gain2.gain.linearRampToValueAtTime(0.09, now + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + durSec * 0.7);

    osc.connect(gain).connect(ac.destination);
    osc2.connect(gain2).connect(ac.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + durSec + 0.05);
    osc2.stop(now + durSec + 0.05);
  }

  // ─── State machine ─────────────────────────────────────────
  const state = {
    levelIndex: 0,
    completed: new Array(LEVELS.length).fill(false),
    sequence: [],       // the notes the player must copy
    playerStep: 0,      // how many correct taps so far this round
    lives: 3,
    phase: 'idle',      // 'idle' | 'playing' | 'input' | 'done'
    round: 0,           // endless mode round counter (legacy)
    audioUnlocked: false, // becomes true after the first user gesture
    _seqTimers: [],     // pending setTimeouts (playback + phase switch)
  };

  function currentLevel(){ return LEVELS[state.levelIndex]; }
  function isEndless(){ return !!currentLevel().endless; }

  function clearTimers(){
    state._seqTimers.forEach(t => clearTimeout(t));
    state._seqTimers = [];
  }

  // ─── Rendering ────────────────────────────────────────────
  function renderPads(){
    const host = document.getElementById('ctPads');
    host.innerHTML = '';
    for(const pad of PADS){
      const b = el('button', 'ct-pad');
      b.type = 'button';
      b.dataset.key = pad.key;
      b.style.setProperty('--pad-on',  pad.colorOn);
      b.style.setProperty('--pad-off', pad.colorOff);
      b.setAttribute('aria-label', pad.key);
      b.onclick = () => onPadTap(pad.key);
      host.appendChild(b);
    }
  }

  function renderHearts(){
    const host = document.getElementById('ctHearts');
    host.innerHTML = '';
    for(let i=0; i<3; i++){
      const h = el('span', 'ct-heart', '❤️');
      if(i >= state.lives) h.classList.add('lost');
      host.appendChild(h);
    }
  }

  function renderDots(){
    const dots = document.getElementById('ctLevelDots');
    dots.innerHTML = '';
    for(let i=0; i<LEVELS.length; i++){
      const d = el('div', 'level-dot');
      if(state.completed[i]) d.classList.add('done');
      if(i === state.levelIndex) d.classList.add('current');
      dots.appendChild(d);
    }
  }

  function setPhaseText(txt, cls=''){
    const p = document.getElementById('ctPhase');
    p.textContent = txt;
    p.className = 'ct-phase' + (cls ? ' ' + cls : '');
  }

  function setOutcome(txt, cls=''){
    const o = document.getElementById('ctOutcome');
    o.textContent = txt;
    o.className = 'ct-outcome' + (cls ? ' ' + cls : '');
  }

  function disablePads(disabled){
    document.querySelectorAll('.ct-pad').forEach(p => { p.disabled = disabled; });
  }

  // ─── Level lifecycle ──────────────────────────────────────
  function mountLevel(){
    clearTimers();
    const level = currentLevel();
    setScene(level.scene || 'day');

    document.getElementById('ctLevelLabel').textContent = `Level ${level.id} / ${LEVELS.length}`;
    document.getElementById('ctLevelName').textContent  = level.name;
    document.getElementById('ctHint').textContent       = level.hint || 'Listen and copy the tune!';

    const roundLabel = document.getElementById('ctRoundLabel');
    if(isEndless()){
      state.round = 0;
      state.sequence = [];
      roundLabel.classList.remove('hidden');
      roundLabel.textContent = 'Round 1';
    } else {
      state.sequence = [...level.sequence];
      roundLabel.classList.add('hidden');
    }

    state.lives = 3;
    state.playerStep = 0;
    state.phase = 'idle';

    renderDots();
    renderHearts();
    setPhaseText('');
    setOutcome('');

    const listenBtn = document.getElementById('ctListen');
    listenBtn.textContent = '▶ LISTEN';
    listenBtn.disabled = false;
    listenBtn.classList.remove('hidden');
    document.getElementById('ctNext').classList.add('hidden');

    disablePads(true);
    wizSay(level.hint || 'Listen and copy!', 'idle');

    // Auto-play the sequence for any level after the first once the audio
    // context has been unlocked (by the kid's first LISTEN tap). No manual
    // click needed to hear each new level.
    if(state.audioUnlocked){
      state._seqTimers.push(setTimeout(() => {
        if(state.phase === 'idle') playSequence();
      }, 700));
    }
  }

  // ─── Playback ─────────────────────────────────────────────
  function advanceEndlessRound(){
    state.round++;
    const idx = Math.floor(Math.random() * PADS.length);
    state.sequence.push(PADS[idx].key);
    document.getElementById('ctRoundLabel').textContent = `Round ${state.round}`;
  }

  function playSequence(){
    if(state.phase === 'playing') return;
    // Endless: first LISTEN of a level seeds round 1.
    if(isEndless() && state.round === 0){
      advanceEndlessRound();
    }

    state.phase = 'playing';
    state.playerStep = 0;
    document.getElementById('ctListen').disabled = true;
    setPhaseText('🎵  Listen…', 'listening');
    disablePads(true);
    setOutcome('');

    // Tempo speeds slightly with sequence length
    const noteMs = Math.max(280, 550 - state.sequence.length * 18);
    const gapMs  = Math.max(80,  200 - state.sequence.length * 10);

    clearTimers();
    let t = 350;
    for(let i=0; i<state.sequence.length; i++){
      const key = state.sequence[i];
      state._seqTimers.push(setTimeout(() => flashPad(key, noteMs / 1000), t));
      t += noteMs + gapMs;
    }
    // Wall-clock switch to input phase (do NOT rely on animation events —
    // browsers throttle background tabs). See CLAUDE gotcha.
    state._seqTimers.push(setTimeout(() => {
      state.phase = 'input';
      setPhaseText('👆  Your turn!', 'your-turn');
      disablePads(false);
      document.getElementById('ctListen').disabled = false;
    }, t + 150));
  }

  function flashPad(key, durSec){
    const padDef = PADS.find(p => p.key === key);
    if(!padDef) return;
    playNote(padDef.freq, Math.max(0.3, durSec));
    const el = document.querySelector(`.ct-pad[data-key="${key}"]`);
    if(!el) return;
    el.classList.add('lit');
    setTimeout(() => el.classList.remove('lit'), Math.max(180, durSec * 1000 * 0.85));
  }

  // ─── Input handling ───────────────────────────────────────
  function onPadTap(key){
    if(state.phase !== 'input') return;
    ensureCtx();
    state.audioUnlocked = true;

    const padDef = PADS.find(p => p.key === key);
    const padEl  = document.querySelector(`.ct-pad[data-key="${key}"]`);
    playNote(padDef.freq, 0.35);
    if(padEl){
      padEl.classList.add('lit');
      setTimeout(() => padEl.classList.remove('lit'), 220);
    }

    const expected = state.sequence[state.playerStep];
    if(key === expected){
      state.playerStep++;
      if(state.playerStep >= state.sequence.length){
        onRoundWin();
      }
    } else {
      onWrongTap(padEl);
    }
  }

  function onWrongTap(padEl){
    state.lives--;
    renderHearts();
    if(padEl){
      padEl.classList.add('wrong');
      setTimeout(() => padEl.classList.remove('wrong'), 500);
    }

    if(state.lives <= 0){
      onLevelFail();
    } else {
      state.phase = 'idle';
      disablePads(true);
      setPhaseText(`Oops! ${state.lives} ${state.lives===1?'life':'lives'} left`, 'oops');
      wizSay('Try again — listen closely! 🎧', 'sad');
      // Replay after a beat
      state._seqTimers.push(setTimeout(() => {
        if(state.phase === 'idle') {
          state.playerStep = 0;
          playSequence();
        }
      }, 1200));
    }
  }

  // ─── Round / level outcomes ───────────────────────────────
  function onRoundWin(){
    if(isEndless()){
      state.phase = 'idle';
      disablePads(true);
      setPhaseText(`⭐  Round ${state.round}!`, 'ok');
      wizSay(`Round ${state.round}! Amazing! ⭐`, 'happy');
      launchConfetti(15);
      state._seqTimers.push(setTimeout(() => {
        advanceEndlessRound();
        playSequence();
      }, 1400));
    } else {
      state.completed[state.levelIndex] = true;
      state.phase = 'done';
      disablePads(true);
      setOutcome('🎉  Perfect!', 'ok');
      setPhaseText('');
      document.getElementById('ctListen').classList.add('hidden');
      document.getElementById('ctNext').classList.remove('hidden');
      wizSay("Beautiful! You have great ears! 🎶", 'happy');
      launchConfetti(30);
      renderDots();
    }
  }

  function onLevelFail(){
    state.phase = 'done';
    disablePads(true);
    setPhaseText('');
    const listenBtn = document.getElementById('ctListen');
    listenBtn.classList.remove('hidden');
    listenBtn.textContent = '↻  TRY AGAIN';
    listenBtn.disabled = false;

    if(isEndless()){
      setOutcome(`🎵  You reached round ${state.round}!`, 'ok');
      document.getElementById('ctNext').classList.remove('hidden');
      document.getElementById('ctNext').textContent = 'FINISH ➜';
      wizSay(`Wow — round ${state.round}! 🎶`, 'happy');
      launchConfetti(30);
    } else {
      setOutcome('💔  Out of hearts — try again!', 'no');
      wizSay('So close! Give it another try! 💪', 'sad');
    }
  }

  function retryCurrent(){
    // Same as mountLevel but keeps completed/level index
    clearTimers();
    if(isEndless()){
      state.round = 0;
      state.sequence = [];
      document.getElementById('ctRoundLabel').textContent = 'Round 1';
      document.getElementById('ctNext').classList.add('hidden');
      document.getElementById('ctNext').textContent = 'NEXT ➜';
    } else {
      state.sequence = [...currentLevel().sequence];
    }
    state.lives = 3;
    state.playerStep = 0;
    state.phase = 'idle';
    renderHearts();
    setOutcome('');
    setPhaseText('');
    document.getElementById('ctListen').textContent = '▶ LISTEN';
    playSequence();
  }

  function onListenClicked(){
    ensureCtx();
    state.audioUnlocked = true;
    if(state.phase === 'idle'){
      playSequence();
    } else if(state.phase === 'done'){
      // "TRY AGAIN" path (only reachable when the level was failed)
      retryCurrent();
    }
  }

  function nextLevel(){
    if(state.levelIndex < LEVELS.length - 1){
      state.levelIndex++;
      mountLevel();
    } else {
      showEnd();
    }
  }

  function showEnd(){
    clearTimers();
    document.getElementById('ctGameScreen').classList.add('hidden');
    const end = document.getElementById('ctEndScreen');
    end.classList.remove('hidden');
    const wins = state.completed.filter(Boolean).length;
    document.getElementById('ctEndScore').textContent = `${wins} / ${LEVELS.length}`;
    launchConfetti(60);
    wizSay("You're a Copy the Tune master! 🎶🏆", 'happy');
  }

  function restart(){
    LEVELS = window.KL.copyTheTune.buildLevels();   // new random melodies
    state.levelIndex = 0;
    state.completed = new Array(LEVELS.length).fill(false);
    document.getElementById('ctEndScreen').classList.add('hidden');
    document.getElementById('ctGameScreen').classList.remove('hidden');
    mountLevel();
  }

  // ─── Boot ─────────────────────────────────────────────────
  function boot(){
    renderPads();
    document.getElementById('ctListen').onclick    = onListenClicked;
    document.getElementById('ctNext').onclick      = nextLevel;
    document.getElementById('ctPlayAgain').onclick = restart;
    mountLevel();
  }

  window.KL.copyTheTune.boot = boot;
})();
