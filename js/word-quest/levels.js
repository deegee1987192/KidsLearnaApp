// Word Quest — builds 20 levels × 10 questions, difficulty ramping with level.
//
// Band by level:  L1-4 → 1, L5-8 → 2, L9-12 → 3, L13-16 → 4, L17-20 → 5.
// Each level mixes all question types so it never gets monotonous:
//   3 fill · 1 read · 2 code · 2 math · 2 logic  = 10
//
// Question shapes (consumed by questions.js):
//   fill : { type, emoji, word, blanks:[i], answer:[letters], tiles:[letters] }
//   read : { type, word, choices:[emoji], answer:emoji }
//   code : { type, cipher:{n:L}, encoded:[n], choices:[word], answer:word, hint }
//   math : { type, q, emoji?, count?, choices:[str], answer:str }
//   logic: { type, q, patternItems?, choices, answer }

(function(){
  window.KL = window.KL || {};
  const WQ = window.KL.wordQuest = window.KL.wordQuest || {};
  const { shuffle, randInt } = window.KL.util;

  const VOWELS = 'AEIOU';
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const BLANKS_BY_BAND = { 1:1, 2:1, 3:2, 4:3, 5:4 };
  const SCENE_BY_BAND = { 1:'day', 2:'jungle', 3:'candy', 4:'night', 5:'space' };

  function bandFor(level){ return Math.min(5, Math.ceil(level / 4)); }

  // draw n distinct items from arr (returns copies)
  function draw(arr, n){ return shuffle(arr).slice(0, n); }

  // ─── FILL (tap letters into the blanks) ───────────────────
  function chooseBlanks(word, n){
    const idx = [...word].map((_, i) => i).filter(i => i > 0);  // never blank first letter
    const vow = shuffle(idx.filter(i => VOWELS.includes(word[i])));
    const con = shuffle(idx.filter(i => !VOWELS.includes(word[i])));
    return vow.concat(con).slice(0, n).sort((a, b) => a - b);
  }
  function distractorLetters(answer, k){
    const out = [];
    let guard = 0;
    while(out.length < k && guard++ < 200){
      const c = ALPHA[randInt(0, 25)];
      if(!answer.includes(c) && !out.includes(c)) out.push(c);
    }
    return out;
  }
  function makeFill(item, band){
    const word = item.w;
    const n = Math.min(BLANKS_BY_BAND[band], word.length - 1);
    const blanks = chooseBlanks(word, n);
    const answer = blanks.map(i => word[i]);
    const nDist = band <= 2 ? 3 : 2;
    const tiles = shuffle(answer.concat(distractorLetters(answer, nDist)));
    return { type:'fill', emoji:item.e, word, blanks, answer, tiles };
  }

  // ─── READ (see the word, pick the picture) ────────────────
  function makeRead(item, pool){
    const others = shuffle(pool.filter(p => p.e !== item.e)).slice(0, 3).map(p => p.e);
    const choices = shuffle([item.e, ...others]);
    return { type:'read', word:item.w, choices, answer:item.e };
  }

  // ─── CODE (crack the number cipher) ───────────────────────
  function makeCode(band){
    // short, readable words so decoding stays fun
    const src = WQ.bank.words[band <= 2 ? band : 2];
    const word = shuffle(src)[0].w;
    const letters = [...new Set(word.split(''))];
    const base = band >= 4 ? randInt(5, 9) : 1;         // bigger numbers on hard
    const cipher = {};
    shuffle(letters).forEach((L, i) => { cipher[base + i] = L; });
    const inv = {}; Object.entries(cipher).forEach(([n, L]) => inv[L] = n);
    const encoded = word.split('').map(L => +inv[L]);
    // wrong options: shuffles of the same letters
    const wrongs = new Set();
    let guard = 0;
    while(wrongs.size < 3 && guard++ < 100){
      const w = shuffle(word.split('')).join('');
      if(w !== word) wrongs.add(w);
    }
    const choices = shuffle([word, ...wrongs]);
    return { type:'code', cipher, encoded, choices, answer:word,
             hint:'Match each number to its letter!' };
  }

  // ─── MATH (generated, scales with band) ───────────────────
  function numChoices(ans, spread){
    const set = new Set([ans]);
    let guard = 0;
    while(set.size < 4 && guard++ < 100){
      const d = ans + randInt(-spread, spread);
      if(d >= 0) set.add(d);
    }
    return shuffle([...set].map(String));
  }
  function makeMath(band){
    if(band === 1){
      // counting or add within 10
      if(Math.random() < 0.5){
        const n = randInt(3, 9);
        const e = ['🍎','⭐','🍪','🎈','🐟'][randInt(0,4)];
        return { type:'math', q:'Count them! How many?', emoji:e, count:n,
                 choices:numChoices(n, 2), answer:String(n) };
      }
      const a = randInt(1,5), b = randInt(1,4);
      return { type:'math', q:`${a} + ${b} = ?`, choices:numChoices(a+b,2), answer:String(a+b) };
    }
    if(band === 2){
      const a = randInt(2,9), b = randInt(1,8);
      const plus = Math.random() < 0.6;
      const hi = Math.max(a,b), lo = Math.min(a,b);
      return plus
        ? { type:'math', q:`${a} + ${b} = ?`, choices:numChoices(a+b,3), answer:String(a+b) }
        : { type:'math', q:`${hi} − ${lo} = ?`, choices:numChoices(hi-lo,3), answer:String(hi-lo) };
    }
    if(band === 3){
      if(Math.random() < 0.5){
        const step = [2,5,10][randInt(0,2)], start = randInt(1,4)*step;
        const seq = [start, start+step, start+2*step];
        return { type:'math', q:`What comes next?  ${seq.join(', ')}, ___`,
                 choices:numChoices(start+3*step, 3), answer:String(start+3*step) };
      }
      const a = randInt(10,20), b = randInt(3,9);
      return { type:'math', q:`${a} − ${b} = ?`, choices:numChoices(a-b,3), answer:String(a-b) };
    }
    if(band === 4){
      if(Math.random() < 0.5){
        const a = randInt(10,25), b = randInt(6,15);
        return { type:'math', q:`${a} + ${b} = ?`, choices:numChoices(a+b,4), answer:String(a+b) };
      }
      const n = randInt(3,9);
      return { type:'math', q:`Double ${n} = ?`, choices:numChoices(n*2,3), answer:String(n*2) };
    }
    // band 5
    if(Math.random() < 0.5){
      const step = [3,4,10,25][randInt(0,3)], start = randInt(1,5)*step;
      const seq = [start, start+step, start+2*step];
      return { type:'math', q:`What comes next?  ${seq.join(', ')}, ___`,
               choices:numChoices(start+3*step, step), answer:String(start+3*step) };
    }
    const groups = randInt(2,5), each = randInt(2,5);
    return { type:'math', q:`${groups} groups of ${each} = ?`,
             choices:numChoices(groups*each, 4), answer:String(groups*each) };
  }

  // ─── LOGIC (pattern or riddle) ────────────────────────────
  const PAT_SYMBOLS = [
    ['🔴','🔵'], ['⭐','🌙'], ['🟥','🟩','🟦'], ['🍎','🍌'], ['🐱','🐶'],
    ['❤️','💛','💚'], ['⬆️','➡️','⬇️'], ['🔺','🔵'],
  ];
  function makePattern(band){
    const set = PAT_SYMBOLS[randInt(0, PAT_SYMBOLS.length - 1)];
    const reps = band <= 2 ? 3 : band <= 4 ? 3 : 4;
    const items = [];
    for(let r = 0; r < reps; r++) for(const s of set) items.push(s);
    // trim so the sequence ends right before a full cycle → ask for next
    const nextIdx = items.length % set.length;
    const answer = set[nextIdx];
    const shown = items.slice(0, items.length).concat(['❓']);
    const choices = shuffle([...set, ...(set.length < 4 ? ['✨'] : [])].slice(0,4));
    if(!choices.includes(answer)) choices[0] = answer;
    return { type:'logic', q:'What comes next in the pattern?',
             patternItems:shown, choices:shuffle(choices), answer };
  }
  function makeLogic(band){
    if(Math.random() < 0.5) return makePattern(band);
    const pool = WQ.bank.riddles[band];
    const r = shuffle(pool)[0];
    return { type:'logic', q:r.q, choices:shuffle([...r.choices]), answer:r.answer };
  }

  // ─── Build one level ──────────────────────────────────────
  function buildLevel(level){
    const band = bandFor(level);
    const wp = WQ.bank.words[band];
    const picks = draw(wp, 4);                 // 3 fill + 1 read
    const qs = [];
    picks.slice(0, 3).forEach(it => qs.push(makeFill(it, band)));
    qs.push(makeRead(picks[3], wp));
    qs.push(makeCode(band));
    qs.push(makeCode(band));
    qs.push(makeMath(band));
    qs.push(makeMath(band));
    qs.push(makeLogic(band));
    qs.push(makeLogic(band));
    return { level, band, scene: SCENE_BY_BAND[band], questions: shuffle(qs) };
  }

  function buildLevels(){
    const out = [];
    for(let L = 1; L <= 20; L++) out.push(buildLevel(L));
    return out;
  }

  WQ.buildLevels = buildLevels;
  WQ.bandFor = bandFor;
})();
