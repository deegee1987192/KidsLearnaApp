// Basketball reward game. Hold to charge an oscillating power meter (a dotted
// arc previews the shot); release to shoot. Make 3 of 5 to win.
// Harder tiers = smaller rim + a hoop that drifts side to side.
//
// Registers as KL.wordQuest.rewards.games.basketball.

(function(){
  const rewards = window.KL.wordQuest.rewards;
  const audio = window.KL.audio;

  const W = 340, H = 420;
  const X0 = 58, Y0 = 366;         // launch point
  const ANG = 65 * Math.PI / 180;  // launch angle
  const COS = Math.cos(ANG), SIN = Math.sin(ANG);
  const G = 1000;                  // gravity px/s^2
  const VMIN = 500, VMAX = 950;    // power 0..1 → speed

  // Make-windows tuned so ideal power sits mid-meter (~0.5). Hoop stays inside
  // the reachable 250–320px band even when the hard hoop drifts.
  const TIER = {
    easy:   { rim: 27, osc: 1.3, move: 0,  hoopX: 272 },
    medium: { rim: 22, osc: 1.9, move: 0,  hoopX: 278 },
    hard:   { rim: 19, osc: 2.5, move: 34, hoopX: 284 },
  };

  function play(stage, tier, api){
    stage.innerHTML = '';
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    cv.className = 'wq-canvas';
    stage.appendChild(cv);
    const ctx = cv.getContext('2d');
    const cfg = TIER[tier] || TIER.easy;

    const need = 3, shots = 5;
    let made = 0, taken = 0;
    let phase = 'ready';           // ready | charge | shoot | result | done
    let power = 0, chargeT = 0;
    let hoopY = 150, hoopX = cfg.hoopX;
    let lockV = 0, shotT = 0, ballX = X0, ballY = Y0, scored = false;
    let msg = 'Hold to aim, release to shoot! 🏀';
    let phaseStart = performance.now();

    api.progress(made, need);

    function toLocal(e){
      const r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (W / r.width),
               y: (e.clientY - r.top)  * (H / r.height) };
    }
    cv.addEventListener('pointerdown', e => {
      e.preventDefault();
      if(phase !== 'ready') return;
      phase = 'charge'; chargeT = 0; phaseStart = performance.now();
    });
    function release(){
      if(phase !== 'charge') return;
      lockV = VMIN + power * (VMAX - VMIN);
      phase = 'shoot'; shotT = 0; phaseStart = performance.now(); scored = false;
      if(audio) audio.playTone(300, 0.1, 'square', 0.13);
    }
    cv.addEventListener('pointerup', e => { e.preventDefault(); release(); });
    cv.addEventListener('pointerleave', release);

    // position on the shot arc at time t (seconds), for locked or preview speed
    function arcPoint(v, t){
      return { x: X0 + v * COS * t, y: Y0 - v * SIN * t + 0.5 * G * t * t };
    }
    // closest approach of the arc to the rim → make test
    function isMake(v){
      let best = 1e9, descending = false;
      for(let t = 0; t < 2.2; t += 0.016){
        const p = arcPoint(v, t);
        if(p.y > Y0 + 30) break;
        const vy = -v * SIN + G * t;
        const d = Math.hypot(p.x - hoopX, p.y - hoopY);
        if(d < best && vy > 0){ best = d; descending = true; }
      }
      return descending && best < cfg.rim;
    }

    function resolve(){
      taken++;
      if(scored){ made++; msg = 'Swish! 🎉'; if(audio) audio.playChime(); }
      else { msg = 'So close! 🏀'; if(audio) audio.playTone(150, 0.2, 'sine', 0.15); }
      api.progress(made, need);
      phase = 'result'; phaseStart = performance.now();
    }

    function afterResult(){
      const canWin = made + (shots - taken) >= need;
      if(made >= need) finish(true);
      else if(!canWin || taken >= shots) finish(made >= need);
      else {
        power = 0; ballX = X0; ballY = Y0;
        msg = `Hold to aim!  (${taken + 1} of ${shots})`;
        phase = 'ready';
      }
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

      if(phase !== 'shoot' && cfg.move){
        hoopX = cfg.hoopX + cfg.move * Math.sin(now / 600);
      }
      if(phase === 'charge'){
        chargeT += 0.016;
        power = 0.5 - 0.5 * Math.cos(chargeT * cfg.osc * Math.PI); // 0→1→0
      } else if(phase === 'shoot'){
        shotT = t;
        const p = arcPoint(lockV, shotT);
        ballX = p.x; ballY = p.y;
        if(!scored && isMakeAt(p)) scored = true;
        if(p.y > Y0 + 30 || p.x > W + 20){
          // final make decision uses full-arc test for reliability
          scored = isMake(lockV);
          resolve();
        }
      } else if(phase === 'result'){
        if(t > 1.0) afterResult();
      }
      draw();
      requestAnimationFrame(frame);
    }

    // quick per-frame proximity (cosmetic swish timing); authoritative test is isMake
    function isMakeAt(p){ return Math.hypot(p.x - hoopX, p.y - hoopY) < cfg.rim; }

    function draw(){
      // court
      ctx.fillStyle = '#F3B36B'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#E59B4A'; ctx.fillRect(0, Y0 + 18, W, H);
      // pole + backboard
      ctx.strokeStyle = '#8D6E63'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(hoopX + 34, hoopY - 30); ctx.lineTo(hoopX + 34, Y0 + 18); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(hoopX + 20, hoopY - 46, 26, 44);
      ctx.strokeStyle = '#EF5350'; ctx.lineWidth = 3; ctx.strokeRect(hoopX + 26, hoopY - 26, 14, 14);
      // rim
      ctx.strokeStyle = '#E64A19'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(hoopX, hoopY, cfg.rim, 7, 0, 0, Math.PI * 2); ctx.stroke();
      // net
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1;
      for(let i = -3; i <= 3; i++){
        ctx.beginPath(); ctx.moveTo(hoopX + i * (cfg.rim / 3), hoopY);
        ctx.lineTo(hoopX + i * (cfg.rim / 5), hoopY + 26); ctx.stroke();
      }
      // dotted arc preview while charging
      if(phase === 'charge'){
        const v = VMIN + power * (VMAX - VMIN);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for(let t = 0.05; t < 1.6; t += 0.055){
          const p = arcPoint(v, t);
          if(p.y > Y0 + 30) break;
          ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2); ctx.fill();
        }
      }
      // power bar
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(16, 150, 16, 200);
      ctx.fillStyle = '#FF6B4A'; ctx.fillRect(16, 350 - power * 200, 16, power * 200);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(16, 150, 16, 200);
      // ball
      ctx.font = '30px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🏀', ballX, ballY);
      // message
      ctx.fillStyle = '#3E2723'; ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(msg, W / 2, 28);
    }

    requestAnimationFrame(frame);
  }

  rewards.register('basketball', { name: 'Basketball', emoji: '🏀', goal: 'Make 3 of 5!', play });
})();
