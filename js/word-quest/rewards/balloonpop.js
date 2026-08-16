// Balloon Pop reward game. Balloons float up — tap to pop them. Pop enough
// before the timer runs out. Faster balloons + higher target on harder tiers.
//
// Registers as KL.wordQuest.rewards.games.balloonpop.

(function(){
  const rewards = window.KL.wordQuest.rewards;
  const audio = window.KL.audio;

  const W = 340, H = 420;
  const COLORS = ['#EF5350','#42A5F5','#FFB300','#66BB6A','#AB47BC','#FF7043'];
  const TIER = {
    easy:   { need: 6,  speed: 55, spawn: 620, time: 25 },
    medium: { need: 8,  speed: 78, spawn: 520, time: 24 },
    hard:   { need: 11, speed: 105, spawn: 430, time: 22 },
  };

  function play(stage, tier, api){
    stage.innerHTML = '';
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H; cv.className = 'wq-canvas';
    stage.appendChild(cv);
    const ctx = cv.getContext('2d');
    const cfg = TIER[tier] || TIER.easy;

    const need = cfg.need;
    let popped = 0, balloons = [], last = performance.now(), spawnT = 0;
    let timeLeft = cfg.time, done = false;
    api.progress(0, need);

    function toLocal(e){
      const r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
    }
    cv.addEventListener('pointerdown', e => {
      if(done) return;
      const p = toLocal(e);
      for(let i = balloons.length - 1; i >= 0; i--){
        const b = balloons[i];
        if(Math.hypot(p.x - b.x, p.y - b.y) < b.r + 6){
          balloons.splice(i, 1);
          popped++;
          api.progress(popped, need);
          if(audio) audio.playTone(400 + Math.random() * 300, 0.12, 'triangle', 0.2);
          if(popped >= need) finish(true);
          break;
        }
      }
    });

    let finished = false;
    function finish(won){
      if(finished) return;
      finished = true; done = true;
      setTimeout(() => api.finish(won), 500);
    }

    function frame(now){
      if(done){ draw(); return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      timeLeft -= dt;
      spawnT += dt * 1000;
      if(spawnT >= cfg.spawn){
        spawnT = 0;
        balloons.push({ x: 30 + Math.random() * (W - 60), y: H + 30,
          r: 20 + Math.random() * 8, color: COLORS[Math.floor(Math.random() * COLORS.length)],
          sway: Math.random() * Math.PI * 2 });
      }
      balloons.forEach(b => { b.y -= cfg.speed * dt; b.sway += dt * 2; b.x += Math.sin(b.sway) * 0.4; });
      balloons = balloons.filter(b => b.y > -40);
      if(timeLeft <= 0) finish(popped >= need);
      draw();
      requestAnimationFrame(frame);
    }

    function draw(){
      ctx.fillStyle = '#BBDEFB'; ctx.fillRect(0, 0, W, H);
      balloons.forEach(b => {
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(b.x, b.y + b.r); ctx.lineTo(b.x, b.y + b.r + 16); ctx.stroke();
        ctx.fillStyle = b.color;
        ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r, b.r + 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath(); ctx.ellipse(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.25, b.r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = '#0D47A1'; ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`Pop the balloons!  ⏱ ${Math.ceil(Math.max(0, timeLeft))}s`, W / 2, 22);
    }

    requestAnimationFrame(frame);
  }

  rewards.register('balloonpop', { name: 'Balloon Pop', emoji: '🎈', goal: 'Pop them all!', play });
})();
