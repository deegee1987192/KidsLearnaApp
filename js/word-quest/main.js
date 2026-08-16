// Word Quest — game loop: 20 levels × 10 questions, HUD, and reward wiring.
// A sports mini-game launches automatically after every 10 CORRECT answers
// (handled inside rewards.noteCorrect).

(function(){
  const WQ = window.KL.wordQuest;
  const { setScene } = window.KL.scene;
  const { say: wizSay } = window.KL.wiz;
  const { launchConfetti } = window.KL.confetti;
  const audio = window.KL.audio;
  const rewards = WQ.rewards;

  const LEVELS_N = 20, PER = 10, TOTAL = LEVELS_N * PER;
  const OK = ['Great job! ⭐','You nailed it! 🎉','Brilliant! 🌟','Super smart! 💪','Amazing! 🦄'];
  const NO = ['Good try! 😊','Almost — see the green one! 💚','Keep going, you\'re learning! 🌈'];
  const IDLE = ['You\'ve got this! ✨','Ready? 🦉','Let\'s go! 🚀','I believe in you! 💫'];

  let levels = [], levelIdx = 0, qIdx = 0, stars = 0;

  const $ = id => document.getElementById(id);
  const rnd = a => a[Math.floor(Math.random() * a.length)];

  function start(){
    if(audio) audio.unlock();
    rewards.resetProgress();
    levels = WQ.buildLevels();
    levelIdx = 0; qIdx = 0; stars = 0;
    $('wqStart').classList.add('hidden');
    $('wqEnd').classList.add('hidden');
    $('wqGame').classList.remove('hidden');
    mountQuestion(true);
  }

  function curLevel(){ return levels[levelIdx]; }
  function curQ(){ return curLevel().questions[qIdx]; }

  function mountQuestion(levelJustChanged){
    const lvl = curLevel();
    const q = curQ();
    setScene(lvl.scene);

    const [label, cls] = WQ.BADGE[q.type];
    const badge = $('wqBadge');
    badge.textContent = label; badge.className = 'wq-badge ' + cls;

    $('wqLevel').textContent = `Level ${lvl.level}`;
    $('wqQnum').textContent = `${qIdx + 1}/${PER}`;
    $('wqStars').textContent = stars;
    $('wqProg').style.width = ((levelIdx * PER + qIdx) / TOTAL * 100) + '%';

    $('wqFeedback').textContent = '';
    $('wqFeedback').className = 'wq-feedback';
    $('wqNext').classList.add('hidden');

    WQ.renderQuestion(q, $('wqCardBody'), onAnswer);

    if(levelJustChanged && lvl.level > 1)
      wizSay(`Level ${lvl.level}! Getting trickier! 🦉`, 'idle');
    else
      wizSay(rnd(IDLE), 'idle');
  }

  function onAnswer(correct){
    const fb = $('wqFeedback');
    if(correct){
      stars++;
      $('wqStars').textContent = stars;
      fb.textContent = rnd(OK); fb.className = 'wq-feedback ok';
      wizSay(rnd(OK), 'happy');
      if(audio) audio.playChime();
      launchConfetti(20);
      // count the correct answer; may launch a reward game before continuing
      rewards.noteCorrect(bonus => {
        if(bonus){ stars += bonus; $('wqStars').textContent = stars; }
        showNext();
      });
    } else {
      fb.textContent = rnd(NO); fb.className = 'wq-feedback no';
      wizSay(rnd(NO), 'sad');
      if(audio) audio.playTone(160, 0.25, 'sine', 0.16);
      setTimeout(showNext, 500);
    }
  }

  function showNext(){ $('wqNext').classList.remove('hidden'); }

  function next(){
    qIdx++;
    let levelChanged = false;
    if(qIdx >= PER){
      qIdx = 0; levelIdx++; levelChanged = true;
      if(levelIdx >= LEVELS_N) return showEnd();
    }
    mountQuestion(levelChanged);
  }

  function showEnd(){
    $('wqGame').classList.add('hidden');
    const end = $('wqEnd');
    end.classList.remove('hidden');
    setScene('candy');
    $('wqEndStars').textContent = `${stars} / ${TOTAL}`;
    const pct = stars / TOTAL;
    let emoji, title;
    if(pct >= 0.9){ emoji = '🏆'; title = 'WORD QUEST MASTER!'; }
    else if(pct >= 0.7){ emoji = '🎉'; title = 'Amazing Work!'; }
    else if(pct >= 0.5){ emoji = '😊'; title = 'Great Effort!'; }
    else { emoji = '🌈'; title = 'Keep Practicing!'; }
    $('wqEndEmoji').textContent = emoji;
    $('wqEndTitle').textContent = title;
    launchConfetti(70);
    wizSay('You finished all 20 levels! I\'m so proud! 🦉❤️', 'happy');
  }

  function boot(){
    $('wqStartBtn').onclick = start;
    $('wqNext').onclick = next;
    $('wqAgain').onclick = start;
  }

  WQ.boot = boot;
  WQ._current = () => (levels[levelIdx] ? levels[levelIdx].questions[qIdx] : null);  // test hook
})();
