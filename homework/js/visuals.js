// Mission visuals: count / tenFrame / trace / equation / pictureChoice / story. KL.hw.visuals
// render(visual) → { el, replay?(), read?(speakFn) }
(function(){
  'use strict';
  window.KL = window.KL || {};
  const hw = (KL.hw = KL.hw || {});
  const KINDS = ['count', 'tenFrame', 'trace', 'equation', 'pictureChoice', 'story'];

  function h(tag, cls, txt){ return KL.util.el(tag, cls, txt); }

  // ── count ───────────────────────────────────────────────
  function count(v){
    const n = Math.max(0, Math.min(30, v.count | 0));
    const el = h('div', 'vis-count');
    if(n > 12) el.classList.add('many');
    for(let i = 0; i < n; i++){
      const s = h('span', 'vis-count-item', v.emoji || '⭐');
      s.style.animationDelay = (i * 0.07) + 's';
      el.appendChild(s);
    }
    return { el };
  }

  // ── tenFrame ────────────────────────────────────────────
  function tenFrame(v){
    const filled = Math.max(0, Math.min(10, v.filled | 0));
    const el = h('div', 'vis-tenframe');
    for(let i = 0; i < 10; i++){
      const c = h('div', 'tf-cell');
      if(i < filled){
        const dot = h('div', 'tf-dot');
        dot.style.animationDelay = (i * 0.08) + 's';
        c.appendChild(dot);
      }
      el.appendChild(c);
    }
    return { el };
  }

  // ── equation ────────────────────────────────────────────
  function equation(v){
    const el = h('div', 'vis-equation');
    String(v.text || '').split(/(\?|_+)/).forEach(part => {
      if(!part) return;
      if(part === '?' || /^_+$/.test(part)) el.appendChild(h('span', 'eq-blank', '?'));
      else el.appendChild(document.createTextNode(part));
    });
    return { el };
  }

  // ── pictureChoice ───────────────────────────────────────
  function pictureChoice(v){
    const el = h('div', 'vis-pics');
    (v.emojis || []).slice(0, 6).forEach((e, i) => {
      const c = h('div', 'vis-pic', e);
      if([...String(e)].length > 3) c.classList.add('wide');
      c.style.animationDelay = (i * 0.12) + 's';
      el.appendChild(c);
    });
    return { el };
  }

  // ── story (words highlighted as they're read) ──────────
  function story(v){
    const el = h('div', 'vis-story');
    const words = [];
    (v.sentences || []).forEach(s => {
      const p = h('p', 'story-line');
      String(s).split(/\s+/).filter(Boolean).forEach((w, i) => {
        if(i) p.appendChild(document.createTextNode(' '));
        const span = h('span', 'story-word', w);
        p.appendChild(span);
        words.push(span);
      });
      el.appendChild(p);
    });

    // Character offsets of each word in the text we hand to speechSynthesis.
    const spoken = words.map(w => hw.speech.clean(w.textContent));
    const starts = [];
    let off = 0;
    spoken.forEach(w => { starts.push(off); off += w.length + 1; });
    const text = spoken.join(' ');

    function mark(i){
      words.forEach((w, j) => { w.classList.toggle('on', j === i); w.classList.toggle('read', j < i); });
    }

    async function read(){
      let gotBoundary = false, timer = null, i = 0;
      mark(-1);
      const fallback = setTimeout(() => {
        if(gotBoundary) return;
        // No word-boundary events on this device → pace by time instead.
        timer = setInterval(() => { mark(i++); if(i > words.length) clearInterval(timer); }, 430);
      }, 700);
      await hw.speak(text, {
        rateMul: 0.95,
        onboundary: e => {
          if(e.name && e.name !== 'word') return;
          gotBoundary = true;
          let k = 0;
          while(k + 1 < starts.length && starts[k + 1] <= e.charIndex) k++;
          mark(k);
        },
      });
      clearTimeout(fallback);
      clearInterval(timer);
      words.forEach(w => { w.classList.remove('on'); w.classList.add('read'); });
    }

    return { el, read };
  }

  // ── trace (stroke-order animation) ──────────────────────
  // Strokes drawn in a 100×140 box, in the order a child should write them.
  const GLYPHS = {
    '0': ['M50 10 C 12 10, 12 130, 50 130 C 88 130, 88 10, 50 10'],
    '1': ['M30 32 L55 10 L55 130'],
    '2': ['M18 40 C 16 0, 86 0, 82 42 C 79 68, 40 96, 15 130 L 86 130'],
    '3': ['M20 26 C 34 0, 86 4, 78 38 C 72 62, 46 68, 42 68 C 52 68, 86 72, 82 102 C 78 138, 30 138, 18 114'],
    '4': ['M62 10 L15 95 L88 95', 'M66 55 L66 130'],
    '5': ['M28 10 L22 62 C 40 48, 86 52, 82 92 C 80 135, 30 135, 18 112', 'M28 10 L80 10'],
    '6': ['M76 16 C 40 0, 14 50, 18 92 C 20 136, 82 136, 80 94 C 78 58, 28 60, 20 90'],
    '7': ['M15 10 L85 10 L40 130'],
    '8': ['M78 32 C 72 4, 22 4, 22 34 C 22 62, 80 68, 80 100 C 80 136, 20 136, 20 100 C 20 68, 78 62, 78 32'],
    '9': ['M80 42 C 80 2, 20 2, 20 42 C 20 78, 80 78, 80 42 L 80 130'],
    A: ['M50 10 L15 130', 'M50 10 L85 130', 'M30 85 L70 85'],
    B: ['M20 10 L20 130', 'M20 10 L55 10 C 86 10, 86 68, 55 68 L20 68', 'M20 68 L60 68 C 94 68, 94 130, 60 130 L20 130'],
    C: ['M82 30 C 65 0, 15 5, 15 70 C 15 135, 65 140, 82 110'],
    D: ['M20 10 L20 130', 'M20 10 L45 10 C 96 10, 96 130, 45 130 L20 130'],
    E: ['M20 10 L20 130', 'M20 10 L80 10', 'M20 70 L70 70', 'M20 130 L80 130'],
    F: ['M20 10 L20 130', 'M20 10 L80 10', 'M20 70 L70 70'],
    G: ['M82 30 C 65 0, 15 5, 15 70 C 15 135, 80 140, 82 86 L55 86'],
    H: ['M20 10 L20 130', 'M80 10 L80 130', 'M20 70 L80 70'],
    I: ['M50 10 L50 130', 'M25 10 L75 10', 'M25 130 L75 130'],
    J: ['M70 10 L70 100 C 70 138, 22 138, 20 106', 'M42 10 L90 10'],
    K: ['M20 10 L20 130', 'M80 10 L20 82', 'M40 62 L82 130'],
    L: ['M20 10 L20 130 L80 130'],
    M: ['M15 130 L15 10 L50 82 L85 10 L85 130'],
    N: ['M20 130 L20 10 L80 130 L80 10'],
    O: ['M50 10 C 6 10, 6 130, 50 130 C 94 130, 94 10, 50 10'],
    P: ['M20 10 L20 130', 'M20 10 L55 10 C 90 10, 90 72, 55 72 L20 72'],
    Q: ['M50 10 C 6 10, 6 130, 50 130 C 94 130, 94 10, 50 10', 'M58 100 L86 136'],
    R: ['M20 10 L20 130', 'M20 10 L55 10 C 90 10, 90 72, 55 72 L20 72', 'M48 72 L82 130'],
    S: ['M80 28 C 70 2, 20 5, 22 35 C 25 65, 80 62, 80 98 C 80 138, 25 138, 18 110'],
    T: ['M15 10 L85 10', 'M50 10 L50 130'],
    U: ['M20 10 L20 95 C 20 140, 80 140, 80 95 L80 10'],
    V: ['M15 10 L50 130 L85 10'],
    W: ['M8 10 L28 130 L50 50 L72 130 L92 10'],
    X: ['M18 10 L82 130', 'M82 10 L18 130'],
    Y: ['M15 10 L50 70', 'M85 10 L50 70 L50 130'],
    Z: ['M18 10 L82 10 L18 130 L82 130'],
  };
  const SVGNS = 'http://www.w3.org/2000/svg';

  function trace(v){
    const chars = [...String(v.character || '').trim()].slice(0, 3);
    const el = h('div', 'vis-trace');
    const known = chars.length && chars.every(c => GLYPHS[c] || GLYPHS[c.toUpperCase()]);
    if(!known){
      // Unknown glyph (e.g. lowercase): show a big dotted outline to copy.
      el.appendChild(h('div', 'trace-fallback', chars.join('')));
      return { el, replay(){} };
    }

    const W = 100 * chars.length + 20;
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', `-10 0 ${W} 140`);
    svg.classList.add('trace-svg');
    // Writing guide lines
    [10, 70, 130].forEach((y, i) => {
      const ln = document.createElementNS(SVGNS, 'line');
      ln.setAttribute('x1', -10); ln.setAttribute('x2', W - 10);
      ln.setAttribute('y1', y); ln.setAttribute('y2', y);
      ln.setAttribute('class', i === 1 ? 'trace-mid' : 'trace-rule');
      svg.appendChild(ln);
    });

    const strokes = [];
    chars.forEach((c, ci) => {
      const g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('transform', `translate(${ci * 100},0)`);
      (GLYPHS[c] || GLYPHS[c.toUpperCase()]).forEach(d => {
        const guide = document.createElementNS(SVGNS, 'path');
        guide.setAttribute('d', d);
        guide.setAttribute('class', 'trace-guide');
        g.appendChild(guide);
        const ink = document.createElementNS(SVGNS, 'path');
        ink.setAttribute('d', d);
        ink.setAttribute('class', 'trace-ink');
        g.appendChild(ink);
        strokes.push({ ink, g });
      });
      svg.appendChild(g);
    });
    el.appendChild(svg);

    let run = 0;
    async function replay(){
      const my = ++run;
      svg.querySelectorAll('.trace-start').forEach(n => n.remove());
      const placed = [];
      strokes.forEach(s => {
        const len = s.ink.getTotalLength() || 300;
        s.len = len;
        s.ink.style.transition = 'none';
        s.ink.style.strokeDasharray = len;
        s.ink.style.strokeDashoffset = len;
      });
      for(let i = 0; i < strokes.length; i++){
        if(my !== run) return;
        const s = strokes[i];
        const p0 = s.ink.getPointAtLength(0);
        // Strokes that start at the same spot (B, D, P, R) get their badge nudged aside.
        const p = { x: p0.x, y: p0.y };
        while(placed.some(q => q.g === s.g && Math.hypot(q.x - p.x, q.y - p.y) < 14)) p.x += 17;
        placed.push({ g: s.g, x: p.x, y: p.y });
        const dot = document.createElementNS(SVGNS, 'g');
        dot.setAttribute('class', 'trace-start');
        dot.innerHTML = `<circle cx="${p.x}" cy="${p.y}" r="8"/><text x="${p.x}" y="${p.y + 4}">${i + 1}</text>`;
        s.g.appendChild(dot);
        const dur = Math.max(500, s.len * 6);
        s.ink.getBoundingClientRect(); // flush so the transition runs
        s.ink.style.transition = `stroke-dashoffset ${dur}ms ease-in-out`;
        s.ink.style.strokeDashoffset = 0;
        await hw.util.wait(dur + 250);
      }
    }
    setTimeout(replay, 350);
    return { el, replay };
  }

  const RENDER = { count, tenFrame, trace, equation, pictureChoice, story };

  function render(visual){
    const fn = visual && RENDER[visual.kind];
    if(!fn) return { el: h('div', 'vis-empty', '✏️') };
    const out = fn(visual);
    out.el.classList.add('vis');
    return out;
  }

  hw.visuals = { render, KINDS, GLYPHS };
})();
