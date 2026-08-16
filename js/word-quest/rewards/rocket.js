// Rocket Launch reward game. A fuel gauge sweeps up and down — tap when it's
// in the green zone to add fuel. Fill the tank to blast off. Narrower zone +
// more fuel on harder tiers.
//
// Registers as KL.wordQuest.rewards.games.rocket.

(function(){
  const rewards = window.KL.wordQuest.rewards;
  const audio = window.KL.audio;

  const W = 340, H = 420;
  const GAUGE_X = 250, GAUGE_Y = 70, GAUGE_H = 250, GAUGE_W = 34;
  const TIER = {
    easy:   { need: 3, zone: 0.22, osc: 1.3, time: 24 },
    medium: { need: 4, zone: 0.16, osc: 1.8, time: 23 },
    hard:   { need: 5, zone: 0.12, osc: 2.3, time: 22 },
  };

  function play(stage, tier, api){
    stage.innerHTML = '';
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H; cv.className = 'wq-canvas';
    stage.appendChild(cv);
    const ctx = cv.getContext('2d');
    const cfg = TIER[tier] || TIER.easy;

    const need = cfg.need;
    const zoneLo = 0.5 - cfg.zone / 2, zoneHi = 0.5 + cfg.zone / 2;
    let fuel = 0, t0 = performance.now(), power = 0;
    let phase = 'fuel', launchT = 0, rocketY = 0, done = false, msg = 'Tap in the green zone!';
    let timeLeft = cfg.time, last = performance.now();
    api.progress(0, need);

    cv.addEventListener('pointerdown', () => {
      if(done || phase !== 'fuel') return;
      if(power >= zoneLo && power <= zoneHi){
        fuel++; api.progress(fuel, need);
        if(audio) audio.playTone(300 + fuel * 80, 0.12, 'square', 0.2);
        msg = 'Great! Keep fueling!';
        if(fuel >= need){ phase = 'launch'; launchT = performance.now(); msg = 'BLAST OFF! 🚀'; if(audio) audio.playChime(); }
      } else {
        msg = 'Missed — try again!';
        if(audio) audio.playTone(140, 0.15, 'sine', 0.14);
      }
    });

    let finished = false;
    function finish(won){
      if(finished) return;
      finished = true; done = true;
      setTimeout(() => api.finish(won), 400);
    }

    function frame(now){
      if(done){ draw(); return; }
      timeLeft -= Math.min(0.05, (now - last) / 1000); last = now;
      if(phase === 'fuel'){
        const t = (now - t0) / 1000;
        power = 0.5 - 0.5 * Math.cos(t * cfg.osc * Math.PI);
        if(timeLeft <= 0) finish(false);
      } else {
        rocketY = (now - launchT) / 1000 * 320;
        if(rocketY > H + 80) finish(true);
      }
      draw();
      requestAnimationFrame(frame);
    }

    function draw(){
      // sky → space gradient
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0D1B4B'); g.addColorStop(1, '#5C6BC0');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // pad
      ctx.fillStyle = '#455A64'; ctx.fillRect(40, H - 40, 120, 24);
      // rocket
      const rx = 100, ry = H - 60 - rocketY;
      ctx.font = '54px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if(phase === 'launch'){
        ctx.fillStyle = '#FF7043';
        ctx.beginPath(); ctx.ellipse(rx, ry + 40, 12, 22 + Math.random() * 10, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillText('🚀', rx, ry);
      // gauge
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(GAUGE_X, GAUGE_Y, GAUGE_W, GAUGE_H);
      // green zone
      ctx.fillStyle = 'rgba(102,187,106,0.55)';
      ctx.fillRect(GAUGE_X, GAUGE_Y + (1 - zoneHi) * GAUGE_H, GAUGE_W, (zoneHi - zoneLo) * GAUGE_H);
      // level marker
      ctx.fillStyle = '#FFB300';
      const py = GAUGE_Y + (1 - power) * GAUGE_H;
      ctx.fillRect(GAUGE_X - 4, py - 4, GAUGE_W + 8, 8);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(GAUGE_X, GAUGE_Y, GAUGE_W, GAUGE_H);
      // fuel pips
      for(let i = 0; i < need; i++){
        ctx.fillStyle = i < fuel ? '#FFD54F' : 'rgba(255,255,255,0.3)';
        ctx.beginPath(); ctx.arc(GAUGE_X + GAUGE_W / 2, GAUGE_Y + GAUGE_H + 22 + i * 16, 5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#fff'; ctx.font = 'bold 17px system-ui, sans-serif';
      ctx.fillText(msg, W / 2, 26);
    }

    requestAnimationFrame(frame);
  }

  rewards.register('rocket', { name: 'Rocket Launch', emoji: '🚀', goal: 'Fuel up & blast off!', play });
})();
