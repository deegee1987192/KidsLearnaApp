// Word Quest — question renderers. Each draws a question into `host` and calls
// onAnswer(correct) once the child answers.
//   • fill  : forgiving — tap letters into the blanks; only fires onAnswer(true)
//             when the word is complete (wrong tiles just wobble).
//   • others: single attempt — onAnswer(true|false) on the first choice tap.

(function(){
  window.KL = window.KL || {};
  const WQ = window.KL.wordQuest = window.KL.wordQuest || {};
  const { el } = window.KL.util;

  function renderChoices(promptHTML, choices, answer, host, onAnswer, opts = {}){
    host.innerHTML = '';
    const wrap = el('div', 'wq-q');
    const p = el('div', 'wq-prompt'); p.innerHTML = promptHTML;
    wrap.appendChild(p);
    if(opts.extra) wrap.appendChild(opts.extra);
    const grid = el('div', 'wq-choices' + (opts.big ? ' big' : ''));
    let answered = false;
    choices.forEach((c, i) => {
      const b = el('button', 'wq-choice c' + (i % 4));
      b.textContent = c;
      b.onclick = () => {
        if(answered) return;
        answered = true;
        const correct = c === answer;
        [...grid.children].forEach(x => x.disabled = true);
        if(correct){ b.classList.add('correct'); }
        else {
          b.classList.add('wrong');
          [...grid.children].forEach(x => { if(x.textContent === answer) x.classList.add('reveal'); });
        }
        onAnswer(correct);
      };
      grid.appendChild(b);
    });
    wrap.appendChild(grid);
    host.appendChild(wrap);
  }

  // ─── FILL ─────────────────────────────────────────────────
  function renderFill(q, host, onAnswer){
    host.innerHTML = '';
    const wrap = el('div', 'wq-fill');
    wrap.appendChild(el('div', 'wq-fill-emoji', q.emoji));
    const many = q.answer.length > 1;
    wrap.appendChild(el('div', 'wq-prompt', many ? 'Fill in the missing letters!' : 'Fill in the missing letter!'));

    const row = el('div', 'wq-word');
    const slots = {};
    [...q.word].forEach((ch, i) => {
      if(q.blanks.includes(i)){ const s = el('div', 'wq-slot'); slots[i] = s; row.appendChild(s); }
      else row.appendChild(el('div', 'wq-letter', ch));
    });
    wrap.appendChild(row);

    const tiles = el('div', 'wq-tiles');
    let next = 0, solved = false;
    q.tiles.forEach(letter => {
      const t = el('button', 'wq-tile', letter);
      t.onclick = () => {
        if(solved || t.disabled) return;
        if(letter === q.answer[next]){
          const s = slots[q.blanks[next]];
          s.textContent = letter; s.classList.add('filled');
          t.disabled = true; t.classList.add('used');
          next++;
          if(next >= q.answer.length){ solved = true; onAnswer(true); }
        } else {
          t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake');
        }
      };
      tiles.appendChild(t);
    });
    wrap.appendChild(tiles);
    host.appendChild(wrap);
  }

  // ─── READ ─────────────────────────────────────────────────
  function renderRead(q, host, onAnswer){
    renderChoices(`Which one is a<br><span class="hl">${q.word}</span>?`,
      q.choices, q.answer, host, onAnswer, { big: true });
  }

  // ─── CODE ─────────────────────────────────────────────────
  function renderCode(q, host, onAnswer){
    const box = el('div', 'wq-code');
    const chips = el('div', 'wq-cipher');
    Object.entries(q.cipher).forEach(([n, L]) => chips.appendChild(el('div', 'wq-chip', `${n}=${L}`)));
    box.appendChild(chips);
    const cells = el('div', 'wq-cells');
    q.encoded.forEach(n => {
      const c = el('div', 'wq-cell');
      c.innerHTML = `<div class="n">${n}</div><div class="l">?</div>`;
      cells.appendChild(c);
    });
    box.appendChild(cells);

    renderChoices('Crack the secret code! 🔐', q.choices, q.answer, host, (correct) => {
      const ls = host.querySelectorAll('.wq-cell .l');
      q.encoded.forEach((n, idx) => { if(ls[idx]) ls[idx].textContent = q.cipher[n]; });
      onAnswer(correct);
    }, { extra: box });
  }

  // ─── MATH ─────────────────────────────────────────────────
  function renderMath(q, host, onAnswer){
    let extra = null;
    if(q.count){
      extra = el('div', 'wq-counter');
      for(let i = 0; i < q.count; i++) extra.appendChild(el('span', null, q.emoji));
    }
    renderChoices(`<span class="hl">${q.q}</span>`, q.choices, q.answer, host, onAnswer, { extra });
  }

  // ─── LOGIC ────────────────────────────────────────────────
  function renderLogic(q, host, onAnswer){
    let extra = null;
    if(q.patternItems){
      extra = el('div', 'wq-pattern');
      q.patternItems.forEach(it => {
        const c = el('div', 'wq-pcell' + (it === '❓' ? ' mystery' : ''), it);
        extra.appendChild(c);
      });
    }
    const big = q.choices.every(c => [...c][0] && c.length <= 3);   // emoji-ish
    renderChoices(`<span class="hl">${q.q}</span>`, q.choices, q.answer, host, onAnswer, { extra, big });
  }

  function renderQuestion(q, host, onAnswer){
    if(q.type === 'fill') return renderFill(q, host, onAnswer);
    if(q.type === 'read') return renderRead(q, host, onAnswer);
    if(q.type === 'code') return renderCode(q, host, onAnswer);
    if(q.type === 'math') return renderMath(q, host, onAnswer);
    if(q.type === 'logic') return renderLogic(q, host, onAnswer);
  }

  const BADGE = {
    fill:  ['✏️ SPELL IT', 'badge-fill'],
    read:  ['📖 READ IT',  'badge-read'],
    code:  ['🔐 CODE CRACKER', 'badge-code'],
    math:  ['🔢 MATH TIME', 'badge-math'],
    logic: ['🧩 THINK IT OUT', 'badge-logic'],
  };

  WQ.renderQuestion = renderQuestion;
  WQ.BADGE = BADGE;
})();
