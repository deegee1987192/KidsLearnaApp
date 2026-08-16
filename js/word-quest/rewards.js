// Word Quest — reward-game controller.
//
// After every 10 questions the quiz calls KL.wordQuest.rewards.trigger(round, onDone).
// A sports mini-game is picked from a shuffled deck (all 6 shown before any
// repeat), played inside a full-screen overlay, and on finish the quiz resumes.
//
//   round → difficulty tier:  1 = easy, 2 = medium, 3+ = hard
//   win  → confetti + 3 bonus stars + "Amazing! Back to learning!"
//   lose → "Nice try! Keep going!"  (no penalty)
//
// Each sport file registers itself via KL.wordQuest.rewards.register(key, module).
// A sport module is:  { name, emoji, goal, play(stage, tier, api) }
//   api = { progress(made, need), finish(won) }

(function(){
  window.KL = window.KL || {};
  const WQ = window.KL.wordQuest = window.KL.wordQuest || {};
  const audio = window.KL.audio;
  const { shuffle } = window.KL.util;

  const games = {};   // key → module
  let deck = [];      // shuffled remaining keys
  let correctCount = 0;   // total correct answers so far this run
  const EVERY = 10;       // reward game after every N correct answers

  function register(key, module){ games[key] = module; }

  // Quiz calls this once per CORRECT answer. Every 10th correct answer
  // launches the next reward game (difficulty ramps with each reward).
  // onReward(bonusStars) fires when the reward finishes; if no reward was
  // due this answer it is called immediately with 0 so the quiz can just
  // resume in one code path.
  function noteCorrect(onReward){
    correctCount++;
    if(correctCount % EVERY === 0){
      trigger(correctCount / EVERY, onReward || (()=>{}));
      return true;
    }
    if(onReward) onReward(0);
    return false;
  }

  // Reset counters + reshuffle the deck for a fresh play-through.
  function resetProgress(){ correctCount = 0; deck = []; }
  function correctSoFar(){ return correctCount; }

  function tierForRound(round){
    if(round <= 1) return 'easy';
    if(round === 2) return 'medium';
    return 'hard';
  }

  function nextSport(){
    if(deck.length === 0) deck = shuffle(Object.keys(games));
    return deck.shift();
  }

  // ─── Overlay chrome ───────────────────────────────────────
  function buildOverlay(sport){
    const ov = document.createElement('div');
    ov.className = 'wq-reward-overlay';
    ov.innerHTML = `
      <div class="wq-reward-card">
        <div class="wq-reward-head">
          <span class="wq-reward-emoji">${sport.emoji}</span>
          <span class="wq-reward-name">${sport.name}</span>
        </div>
        <div class="wq-reward-goal">${sport.goal}</div>
        <div class="wq-reward-hud" id="wqRewardHud"></div>
        <div class="wq-reward-stage" id="wqRewardStage"></div>
        <div class="wq-reward-banner" id="wqRewardBanner"></div>
      </div>`;
    document.body.appendChild(ov);
    return ov;
  }

  function setHud(made, need){
    const hud = document.getElementById('wqRewardHud');
    if(!hud) return;
    let dots = '';
    for(let i = 0; i < need; i++) dots += (i < made ? '⭐' : '⚪');
    hud.innerHTML = `<span class="wq-hud-score">${dots}</span>`;
  }

  // ─── Main flow ────────────────────────────────────────────
  function trigger(round, onDone){
    const key = nextSport();
    const sport = games[key];
    const tier = tierForRound(round);

    if(audio) audio.unlock();
    const ov = buildOverlay(sport);
    // brief "get ready" intro, then start the mechanic
    requestAnimationFrame(() => ov.classList.add('show'));

    const stage = ov.querySelector('#wqRewardStage');
    const api = {
      progress: (made, need) => setHud(made, need),
      finish: (won) => endGame(ov, won, onDone),
    };

    setTimeout(() => {
      if(sport.play) sport.play(stage, tier, api);
    }, 1100);
  }

  function endGame(ov, won, onDone){
    const banner = ov.querySelector('#wqRewardBanner');
    const stage = ov.querySelector('#wqRewardStage');
    if(stage) stage.classList.add('wq-stage-done');

    if(won){
      banner.className = 'wq-reward-banner win show';
      banner.innerHTML = `<div class="wq-banner-big">🎉 Amazing!</div>
        <div class="wq-banner-sub">+⭐⭐⭐ &nbsp;Back to learning!</div>
        <button class="wq-reward-btn" id="wqRewardCont">Continue ➜</button>`;
      if(window.launchConfetti) window.launchConfetti(60);
      if(audio) audio.playChime();
    } else {
      banner.className = 'wq-reward-banner lose show';
      banner.innerHTML = `<div class="wq-banner-big">Nice try!</div>
        <div class="wq-banner-sub">Keep going — you've got this! 🌟</div>
        <button class="wq-reward-btn" id="wqRewardCont">Continue ➜</button>`;
      if(audio) audio.playTone(220, 0.3, 'sine', 0.18);
    }

    ov.querySelector('#wqRewardCont').onclick = () => {
      ov.classList.remove('show');
      setTimeout(() => {
        ov.remove();
        if(onDone) onDone(won ? 3 : 0);
      }, 260);
    };
  }

  // Dev/test hook: force a specific sport to be the next one played.
  function _forceNext(key){ if(games[key]) deck.unshift(key); }

  WQ.rewards = { register, trigger, noteCorrect, resetProgress, correctSoFar,
                 tierForRound, games, _forceNext };
})();
