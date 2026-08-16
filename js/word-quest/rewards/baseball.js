// Baseball reward game. The pitch flies toward the plate; tap the moment the
// ball crosses the SWING ZONE band. Hit 3 of 5 to win. Faster on harder tiers.
//
// Registers as KL.wordQuest.rewards.games.baseball.

(function(){
  const rewards = window.KL.wordQuest.rewards;
  const audio = window.KL.audio;

  const W = 340, H = 400;
  const START_Y = 46, END_Y = 388;
  const ZONE_LO = 300, ZONE_HI = 352;    // hit band (y)
  const DUR = { easy: 1.5, medium: 1.15, hard: 0.85 };  // seconds per pitch

  function play(stage, tier, api){
    stage.innerHTML = '';
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    cv.className = 'wq-canvas';
    stage.appendChild(cv);
    const ctx = cv.getContext('2d');
    const dur = DUR[tier] || DUR.easy;

    const need = 3, shots = 5;
    let made = 0, taken = 0;
    let phase = 'pitch';                   // pitch | result | done
    let swung = false, hit = false;
    let ballX = W / 2, ballY = START_Y, hitVX = 0, hitVY = 0;
    let msg = 'Tap when the ball is in the zone!';
    let phaseStart = performance.now();

    api.progress(made, need);

    cv.addEventListener('pointerdown', e => {
      e.preventDefault();
      if(phase !== 'pitch' || swung) return;
      swung = true;
      hit = (ballY >= ZONE_LO && ballY <= ZONE_HI);
      if(hit){ hitVX = 150; hitVY = -260; if(audio) audio.playTone(520, 0.12, 'square', 0.16); }
      resolve();
    });

    function resolve(){
      taken++;
      if(hit){ made++; msg = 'HIT! 🎉'; if(audio) audio.playChime(); }
      else { msg = swung ? 'Strike! 🙈' : 'Missed it!'; if(audio) audio.playTone(150, 0.2, 'sine', 0.15); }
      api.progress(made, need);
      phase = 'result'; phaseStart = performance.now();
    }

    function afterResult(){
      const canWin = made + (shots - taken) >= need;
      if(made >= need) return finish(true);
      if(!canWin || taken >= shots) return finish(made >= need);
      swung = false; hit = false; ballX = W / 2; ballY = START_Y;
      msg = `Tap in the zone!  (${taken + 1} of ${shots})`;
      phase = 'pitch'; phaseStart = performance.now();
    }

    let finished = false;
    function finish(won){
      if(finished) return;
      finished = true; phase = 'done';
      setTimeout(() => api.finish(won), 500);
    }

    function frame(now){
      if(phase === 'done'){ draw(); return; }
      const t = (now - phaseStart) / 1000;
      if(phase === 'pitch'){
        ballY = START_Y + (END_Y - START_Y) * (t / dur);
        if(ballY >= END_Y && !swung){ resolve(); }       // let it pass = miss
      } else if(phase === 'result'){
        if(hit){ ballX += hitVX * 0.016; ballY += hitVY * 0.016; hitVY += 9; }
        if(t > 1.1) afterResult();
      }
      draw();
      requestAnimationFrame(frame);
    }

    function draw(){
      // sky + field
      ctx.fillStyle = '#8FD3F4'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#6FBF73'; ctx.fillRect(0, 250, W, H - 250);
      // dirt around plate
      ctx.fillStyle = '#C89B6B';
      ctx.beginPath(); ctx.ellipse(W / 2, 360, 120, 44, 0, 0, Math.PI * 2); ctx.fill();
      // swing zone band
      ctx.fillStyle = 'rgba(255,213,79,0.35)'; ctx.fillRect(60, ZONE_LO, W - 120, ZONE_HI - ZONE_LO);
      ctx.strokeStyle = '#FBC02D'; ctx.lineWidth = 2; ctx.strokeRect(60, ZONE_LO, W - 120, ZONE_HI - ZONE_LO);
      ctx.fillStyle = '#F57F17'; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('SWING ZONE', W / 2, ZONE_LO - 6);
      // pitcher + batter
      ctx.font = '30px serif'; ctx.textBaseline = 'middle';
      ctx.fillText('🧑‍🌾', W / 2, 40);
      ctx.font = '34px serif'; ctx.fillText('🏏', W / 2 - 44, 356);
      // ball
      ctx.font = '24px serif'; ctx.fillText('⚾', ballX, ballY);
      // message
      ctx.fillStyle = '#0D47A1'; ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(msg, W / 2, 22);
    }

    requestAnimationFrame(frame);
  }

  rewards.register('baseball', { name: 'Baseball', emoji: '⚾', goal: 'Hit 3 of 5!', play });
})();
