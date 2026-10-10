// Screens: home, setup, hub, mission, feed, chest, pin, parent. KL.hw.screens
(function(){
  'use strict';
  window.KL = window.KL || {};
  const hw = (KL.hw = KL.hw || {});
  const { h, today, addDays, uid, hashPin, wait, sfx } = hw.util;
  const db = hw.db;

  const AVATARS = ['🦁', '🐯', '🐻', '🦊', '🐼', '🐸', '🐵', '🐨'];
  const REWARD_IDEAS = ["Pick Friday's dessert", 'Choose the family movie', 'Trip to the park', 'Extra bedtime story'];
  const SUBJECT = { math: { icon: '🔢', label: 'Math' }, reading: { icon: '📖', label: 'Reading' } };

  // ── shared bits ─────────────────────────────────────────
  const go = (name, params) => hw.go(name, params);
  const settings = () => hw.state.settings;
  const mapLength = () => settings().mapLength || 10;

  function say(text, mood = 'idle', opts){
    KL.wiz.say(text, mood);
    return hw.speak(text, opts);
  }
  function showWiz(on){ document.getElementById('wizHost').classList.toggle('hidden', !on); }
  function setGear(on){ document.getElementById('hwGear').classList.toggle('hidden', !on); }

  function backBtn(label, onclick){
    return h('button', { class: 'back-hub hw-back', type: 'button', onclick: () => { sfx('tap'); onclick(); } }, label);
  }
  function bigBtn(label, onclick, cls = ''){
    return h('button', { class: 'hw-btn ' + cls, type: 'button', onclick: e => { sfx('tap'); onclick(e); } }, label);
  }
  // Segmented buttons: options = [[value, label], …]
  function seg(options, current, onPick){
    return h('div', 'seg', options.map(([v, label]) => h('button', {
      class: 'seg-btn' + (current === v ? ' sel' : ''), type: 'button',
      onclick: () => { if(current !== v){ sfx('tap'); onPick(v); } },
    }, label)));
  }
  function setTheme(child){ KL.scene.setScene(child ? hw.map.theme(child.mapTheme).scene : 'day'); }

  async function getChild(id){ return id ? db.get('children', id) : null; }
  async function saveChild(c){ await db.put('children', c); }
  async function allChildren(){
    const list = await db.getAll('children');
    return list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }

  function newChild(draft){
    return {
      id: uid(), createdAt: Date.now(),
      name: draft.name, avatarEmoji: draft.avatarEmoji,
      level: draft.level,
      pet: { type: draft.petType, name: draft.petName },
      mapTheme: draft.mapTheme,
      mapStep: 0, mapsCompleted: 0, totalStars: 0, streakDays: 0,
      lastPlayedDate: null,
      currentReward: draft.reward || null,
      rewardStatus: 'locked',
      missionsPerDay: draft.missionsPerDay || 5,
      bonusAllowed: true,
    };
  }

  // Napping = didn't play yesterday or today. Never a guilt trip — just a nap.
  function isNapping(child){
    return !!child.lastPlayedDate && child.lastPlayedDate < addDays(today(), -1) && !hw.state.woke[child.id];
  }

  async function todaysRecord(childId){ return db.get('dailyMissions', hw.missions.key(childId, today())); }

  // ── PIN keypad ──────────────────────────────────────────
  function keypad(onDone){
    let pin = '';
    const dots = h('div', 'pin-dots', [0, 1, 2, 3].map(() => h('span', 'pin-dot')));
    const paint = () => [...dots.children].forEach((d, i) => d.classList.toggle('on', i < pin.length));
    const press = k => {
      sfx('tap');
      if(k === '⌫') pin = pin.slice(0, -1);
      else if(pin.length < 4) pin += k;
      paint();
      if(pin.length === 4){ const p = pin; setTimeout(() => { pin = ''; paint(); onDone(p); }, 180); }
    };
    const keys = h('div', 'pin-keys',
      ['1','2','3','4','5','6','7','8','9','','0','⌫'].map(k =>
        k ? h('button', { class: 'pin-key', type: 'button', onclick: () => press(k) }, k) : h('span')));
    return h('div', 'pin-pad', dots, keys);
  }

  // ═════════════════════════════════════════════════════════
  // HOME — "Who's doing homework?"
  // ═════════════════════════════════════════════════════════
  async function home(root){
    setTheme(null);
    showWiz(true);
    const kids = await allChildren();
    setGear(kids.length > 0);
    root.appendChild(h('a', { class: 'back-hub', href: '../index.html' }, '🏠 Back to hub'));
    root.appendChild(h('div', 'hw-title', '🗺️ Homework Quest'));

    if(!kids.length){
      say("Hi! I'm Wiz. Let's get your Homework Quest ready! Ask a grown-up to help.");
      root.appendChild(h('div', 'screen hw-welcome',
        h('div', 'big-e', '🗺️'),
        h('h1', null, 'Welcome!'),
        h('p', null, 'A grown-up sets this up once: a parent PIN, then each child picks a pet buddy and a treasure map.'),
        bigBtn("Let's set up ➜", () => go('setup', {}), 'coral')));
      return;
    }

    say("Time for missions! Who's here?");
    const recs = await Promise.all(kids.map(k => todaysRecord(k.id)));
    const grid = h('div', 'who-grid');
    kids.forEach((k, i) => {
      const rec = recs[i];
      const done = rec && rec.missions.every(m => m.status === 'done');
      const pet = hw.pets.render(k.pet.type, isNapping(k) ? 'sleep' : 'bounce', 'md');
      grid.appendChild(h('button', {
        class: 'who-card' + (done ? ' done' : ''), type: 'button',
        onclick: () => { hw.speech.unlock(); sfx('tap'); go('hub', { childId: k.id }); },
      },
        done ? h('span', 'who-check', '✅') : null,
        h('div', 'who-avatar', k.avatarEmoji),
        h('div', 'who-name', k.name),
        pet,
        h('div', 'who-step', k.rewardStatus === 'unlocked' ? '🎁 Treasure found!' : `Step ${Math.min(k.mapStep, mapLength())} of ${mapLength()}`)));
    });
    if(kids.length < 4){
      grid.appendChild(h('button', {
        class: 'who-card add', type: 'button',
        onclick: () => { sfx('tap'); go('pin', { next: 'setup' }); },
      }, h('div', 'who-avatar', '➕'), h('div', 'who-name', 'Add a child'), h('div', 'who-step', 'Grown-ups only')));
    }
    root.appendChild(grid);
  }

  // ═════════════════════════════════════════════════════════
  // SETUP — PIN (first time), child, pet, pet name, map, reward
  // ═════════════════════════════════════════════════════════
  async function setup(root, params){
    setTheme(null);
    showWiz(true);
    setGear(false);
    const needPin = !settings().parentPinHash;
    const draft = { name: '', avatarEmoji: AVATARS[0], level: 'age4', petType: null, petName: '', mapTheme: 'jungle', reward: '', missionsPerDay: 5 };
    const steps = [...(needPin ? ['pin'] : []), 'child', 'pet', 'petName', 'map', 'reward'];
    let si = 0;

    root.appendChild(backBtn('⬅ Back', () => (si > 0 ? show(si - 1) : go('home'))));
    const body = h('div', 'setup-body');
    root.appendChild(body);

    function card(...kids){ return h('div', 'screen setup-card', ...kids); }
    function next(){ show(si + 1); }

    function show(i){
      si = i;
      body.innerHTML = '';
      const step = steps[si];
      const progress = h('div', 'setup-progress', steps.map((_, j) => h('span', j <= si ? 'on' : '')));
      body.appendChild(progress);
      STEP[step]();
    }

    const STEP = {
      pin(){
        let first = null;
        const msg = h('p', null, 'Make a 4-digit PIN. It keeps the parent screen safe from little fingers.');
        say('Grown-ups: please make a secret PIN.');
        body.appendChild(card(h('div', 'grownup-tag', '👤 Grown-up'), h('h1', null, 'Parent PIN'), msg,
          keypad(async pin => {
            if(!first){ first = pin; msg.textContent = 'Type it once more to confirm.'; return; }
            if(pin !== first){ first = null; msg.textContent = "Those didn't match — let's start again."; return; }
            settings().parentPinHash = await hashPin(pin);
            await db.put('settings', settings(), 'main');
            hw.state.parentUnlocked = true;
            next();
          })));
      },

      child(){
        say("Grown-ups: who's this quest for?");
        const name = h('input', { class: 'hw-input', type: 'text', maxlength: '16', placeholder: "Child's name", value: draft.name, autocomplete: 'off' });
        const avatars = h('div', 'chip-row', AVATARS.map(a => h('button', {
          class: 'avatar-chip' + (a === draft.avatarEmoji ? ' sel' : ''), type: 'button',
          onclick: e => { sfx('tap'); draft.avatarEmoji = a; [...avatars.children].forEach(c => c.classList.remove('sel')); e.currentTarget.classList.add('sel'); },
        }, a)));
        const levels = h('div', 'level-row', [['age4', '🐣', 'Age 4', 'Pre-reader'], ['age6', '🦉', 'Age 6', 'Early reader']].map(([v, e, t, d]) =>
          h('button', {
            class: 'level-btn' + (v === draft.level ? ' sel' : ''), type: 'button',
            onclick: ev => { sfx('tap'); draft.level = v; [...levels.children].forEach(c => c.classList.remove('sel')); ev.currentTarget.classList.add('sel'); },
          }, h('span', 'level-e', e), h('b', null, t), h('small', null, d))));
        const err = h('div', 'hw-err');
        body.appendChild(card(h('div', 'grownup-tag', '👤 Grown-up'), h('h1', null, "Who's this for?"),
          name, h('div', 'setup-label', 'Pick a picture'), avatars,
          h('div', 'setup-label', 'Level'), levels, err,
          bigBtn('Next ➜', () => {
            draft.name = name.value.trim();
            if(!draft.name){ err.textContent = 'Please type a name.'; name.focus(); return; }
            next();
          }, 'coral')));
        setTimeout(() => name.focus(), 300);
      },

      pet(){
        say(`${draft.name}, pick your buddy!`, 'happy');
        const grid = h('div', 'pet-grid');
        Object.entries(hw.pets.PETS).forEach(([type, p]) => {
          const el = hw.pets.render(type, 'bounce', 'md');
          grid.appendChild(h('button', {
            class: 'pet-card' + (draft.petType === type ? ' sel' : ''), type: 'button',
            onclick: async e => {
              sfx('tap');
              draft.petType = type;
              [...grid.children].forEach(c => c.classList.remove('sel'));
              e.currentTarget.classList.add('sel');
              hw.pets.play(el, 'wave', 900);
              say(`A ${p.label.toLowerCase()}! Great pick!`, 'happy');
              await wait(1100);
              if(draft.petType === type && steps[si] === 'pet') next();
            },
          }, el, h('div', 'pet-label', p.label)));
        });
        body.appendChild(card(h('h1', null, 'Pick your buddy!'), grid));
      },

      petName(){
        const p = hw.pets.info(draft.petType);
        say(`What's your ${p.label.toLowerCase()}'s name?`);
        const name = h('input', { class: 'hw-input', type: 'text', maxlength: '14', placeholder: 'Pet name', value: draft.petName, autocomplete: 'off' });
        const chips = h('div', 'chip-row', p.names.map(n => h('button', {
          class: 'name-chip', type: 'button',
          onclick: () => { sfx('tap'); name.value = n; draft.petName = n; say(`${n}! I love it!`, 'happy'); },
        }, n)));
        body.appendChild(card(hw.pets.render(draft.petType, 'bounce', 'lg'), h('h1', null, 'Name your buddy'),
          chips, name,
          bigBtn('Next ➜', () => {
            draft.petName = name.value.trim() || p.names[0];
            next();
          }, 'coral')));
      },

      map(){
        say('Pick your treasure map!');
        const grid = h('div', 'theme-grid');
        Object.entries(hw.map.THEMES).forEach(([key, t]) => {
          grid.appendChild(h('button', {
            class: `theme-card theme-${key}` + (draft.mapTheme === key ? ' sel' : ''), type: 'button',
            onclick: e => {
              sfx('tap');
              draft.mapTheme = key;
              KL.scene.setScene(t.scene);
              [...grid.children].forEach(c => c.classList.remove('sel'));
              e.currentTarget.classList.add('sel');
              say(`The ${t.label.toLowerCase()} map!`, 'happy');
            },
          }, h('div', 'theme-icon', t.icon), h('div', 'theme-label', t.label)));
        });
        KL.scene.setScene(hw.map.theme(draft.mapTheme).scene);
        body.appendChild(card(h('h1', null, 'Pick your map!'), grid, bigBtn('Next ➜', next, 'coral')));
      },

      reward(){
        say("Grown-ups: what's the treasure at the end of the map?");
        const input = h('input', { class: 'hw-input', type: 'text', maxlength: '60', placeholder: "e.g. Pick Friday's dessert", value: draft.reward, autocomplete: 'off' });
        const ideas = h('div', 'chip-row', REWARD_IDEAS.map(r => h('button', {
          class: 'name-chip small', type: 'button', onclick: () => { sfx('tap'); input.value = r; },
        }, r)));
        async function finish(withReward){
          draft.reward = withReward ? input.value.trim() : '';
          const child = newChild(draft);
          await saveChild(child);
          go('hub', { childId: child.id });
        }
        body.appendChild(card(h('div', 'grownup-tag', '👤 Grown-up'), h('h1', null, 'Treasure chest reward'),
          h('p', null, `A real-life reward ${draft.name} earns after ${mapLength()} missions. You can change it later.`),
          input, ideas,
          h('div', 'setup-label', 'Missions per day'),
          (function perDayPicker(){
            const box = h('div');
            const paint = () => { box.innerHTML = ''; box.appendChild(seg(hw.missions.PER_DAY.map(n => [n, String(n)]), draft.missionsPerDay, v => { draft.missionsPerDay = v; paint(); })); };
            paint();
            return box;
          })(),
          bigBtn('Start the quest! 🗺️', () => finish(true), 'coral'),
          h('button', { class: 'link-btn', type: 'button', onclick: () => finish(false) }, 'Skip for now')));
      },
    };

    show(0);
  }

  // ═════════════════════════════════════════════════════════
  // CHILD HUB — pet, map, today's two missions
  // ═════════════════════════════════════════════════════════
  async function hub(root, { childId }){
    const child = await getChild(childId);
    if(!child) return go('home');
    setTheme(child);
    showWiz(true);
    setGear(false);
    const petInfo = hw.pets.info(child.pet.type);
    const L = mapLength();

    root.appendChild(backBtn('⬅ Back', () => go('home')));
    root.appendChild(h('div', 'hub-head',
      h('span', 'hub-avatar', child.avatarEmoji),
      h('span', 'hub-name', child.name),
      h('span', 'hud-pill', '⭐ ', String(child.totalStars)),
      child.streakDays > 1 ? h('span', 'hud-pill', '🔥 ', String(child.streakDays)) : null));

    // Pet + speech bubble
    const napping = isNapping(child);
    const pet = hw.pets.render(child.pet.type, napping ? 'sleep' : 'bounce', 'lg');
    const bubble = h('div', 'pet-bubble');
    const petStage = h('div', 'pet-stage', pet, bubble);
    root.appendChild(petStage);
    root.appendChild(bigBtn('✏️ My buddy', () => go('buddy', { childId }), 'ghost buddy-btn'));
    const petSay = (text, opts) => { bubble.textContent = text; bubble.classList.add('show'); return hw.speak(text, Object.assign({ pitchMul: 1.3 }, opts)); };

    // Map
    const map = hw.map.render(child, L);
    root.appendChild(map.el);
    if(child.rewardStatus === 'unlocked'){
      root.appendChild(h('button', { class: 'treasure-banner', type: 'button', onclick: () => go('chest', { childId }) },
        h('span', 'tb-icon', '🎁'),
        h('span', 'tb-text', child.currentReward ? child.currentReward : 'Ask Mom or Dad for your surprise!'),
        h('small', null, 'Show this to Mom or Dad!')));
    }

    // Missions
    const area = h('div', 'mission-area', h('div', 'loading-dots', 'Wiz is getting today\'s missions', h('span', null, '…')));
    root.appendChild(area);

    let greeted = false;
    function greet(allDone){
      greeted = true;
      KL.wiz.say(allDone ? 'All done! 🎉' : 'Pick a mission! 👇', allDone ? 'happy' : 'idle');
      if(allDone){
        hw.pets.setMood(pet, 'wave');
        petSay(`All done for today, ${child.name}! See you tomorrow!`);
      }else{
        petSay(`Hi ${child.name}! Ready for today's missions?`);
      }
    }

    if(napping){
      bubble.textContent = '💤 Zzz…';
      bubble.classList.add('show');
      KL.wiz.say(`Shh… ${child.pet.name} is napping. Tap to wake up!`);
      hw.speak(`Shh. ${child.pet.name} is napping. Tap ${child.pet.name} to wake up!`);
      pet.classList.add('tappable');
      pet.addEventListener('click', async () => {
        if(greeted) return;
        hw.state.woke[child.id] = true;
        sfx('step');
        pet.classList.remove('tappable');
        hw.pets.setMood(pet, 'wave');
        await petSay(`Yawn! Hi ${child.name}! I missed you!`);
        hw.pets.setMood(pet, 'bounce');
        greet(rec && rec.missions.every(m => m.status === 'done'));
      }, { once: true });
    }

    let rec;
    try{
      rec = await hw.missions.getToday(child);
    }catch(e){
      area.innerHTML = '';
      area.appendChild(h('div', 'hw-err', "Oops — couldn't load missions. Try again!"));
      area.appendChild(bigBtn('🔄 Try again', () => go('hub', { childId })));
      return;
    }
    if(!root.isConnected) return;
    area.innerHTML = '';
    const allDone = rec.missions.every(m => m.status === 'done');

    if(allDone){
      area.appendChild(h('div', 'screen all-done',
        h('div', 'big-e', '🎉'),
        h('h1', null, 'All done for today!'),
        h('p', null, 'See you tomorrow!'),
        h('a', { class: 'hw-btn coral', href: '../index.html' }, '🎮 Go play games!'),
        hw.missions.canBonus(child, rec) ? bigBtn('⭐ One more?', async e => {
          e.currentTarget.disabled = true;
          const idx = await hw.missions.addBonus(child);
          go(idx < 0 ? 'hub' : 'mission', { childId, idx });
        }, 'gold bonus-btn') : null));
      KL.confetti.launchConfetti(30);
    }else{
      const row = h('div', 'mission-row' + (rec.missions.length > 6 ? ' lots' : rec.missions.length > 2 ? ' many' : ''));
      const nth = { math: 0, reading: 0 };
      rec.missions.forEach((m, idx) => {
        const s = SUBJECT[m.subject];
        const done = m.status === 'done';
        const n = ++nth[m.subject];
        const label = m.bonus ? '⭐ Bonus' : s.label + (rec.missions.length > 2 ? ' ' + n : '');
        row.appendChild(h('button', {
          class: `mission-bubble ${m.subject}` + (done ? ' done' : '') + (m.bonus ? ' bonus' : ''), type: 'button', disabled: done,
          onclick: () => { sfx('tap'); go('mission', { childId, idx }); },
        }, h('span', 'mb-icon', done ? '✅' : s.icon), h('span', 'mb-label', label)));
      });
      area.appendChild(row);
    }
    if(!napping) greet(allDone);
  }

  // Record a finished mission: history, stars, streak, map step.
  async function completeMission(childId, idx, selfCheck){
    const child = await getChild(childId);
    const rec = await hw.missions.getToday(child);
    const m = rec.missions[idx];
    const L = mapLength();
    const from = child.mapStep;
    const result = { from, to: from, reachedChest: false, paused: false, allDone: false };
    if(m.status === 'done') return Object.assign(result, { allDone: rec.missions.every(x => x.status === 'done') });

    m.status = 'done';
    m.selfCheck = selfCheck;
    await hw.missions.save(rec);
    await db.put('history', { childId, date: rec.date, subject: m.subject, shortText: m.shortText, selfCheck });

    const t = today();
    if(child.lastPlayedDate !== t){
      child.streakDays = child.lastPlayedDate === addDays(t, -1) ? (child.streakDays || 0) + 1 : 1;
      child.lastPlayedDate = t;
    }
    child.totalStars = (child.totalStars || 0) + 1;

    if(child.rewardStatus === 'unlocked'){
      result.paused = true;
    }else{
      // min() covers a parent shortening the map below the pet's current step.
      child.mapStep = Math.min(child.mapStep + 1, L);
      if(child.mapStep >= L){
        child.rewardStatus = 'unlocked';
        result.reachedChest = true;
      }
    }
    result.to = child.mapStep;
    result.allDone = rec.missions.every(x => x.status === 'done');
    await saveChild(child);
    return result;
  }

  // ═════════════════════════════════════════════════════════
  // MISSION — speak, show visual, paper work, reveal, self-check
  // ═════════════════════════════════════════════════════════
  async function mission(root, { childId, idx }){
    const child = await getChild(childId);
    if(!child) return go('home');
    const rec = await hw.missions.getToday(child);
    const m = rec.missions[idx];
    if(!m) return go('hub', { childId });
    setTheme(child);
    showWiz(true);
    setGear(false);

    const s = SUBJECT[m.subject];
    let phase = 'work', triedAgain = false, timer = null;

    root.appendChild(backBtn('⬅ Back', () => go('hub', { childId })));
    const vis = hw.visuals.render(m.visual);
    const replay = bigBtn('🔊', () => speakPhase(), 'round replay');
    replay.setAttribute('aria-label', 'Say it again');
    const traceBtn = vis.replay && m.visual.kind === 'trace'
      ? bigBtn('✏️ Watch again', () => vis.replay(), 'ghost') : null;

    const doneBtn = h('button', { class: 'hw-btn done-btn', type: 'button', disabled: true },
      h('span', 'done-fill'), h('span', 'done-label', "✋ I'm done!"));
    doneBtn.addEventListener('click', () => { if(!doneBtn.disabled){ sfx('tap'); reveal(); } });

    const answerBox = h('div', 'answer-box hidden');
    const checkRow = h('div', 'check-row hidden',
      bigBtn('👍 Got it!', () => finish('got_it'), 'mint'),
      bigBtn('🔁 Try again', () => tryAgain(), 'gold'));

    root.appendChild(h('div', 'screen mission-card',
      h('div', `subject-chip ${m.subject}`, `${s.icon} ${s.label}`),
      h('div', 'mission-short', m.shortText),
      h('div', 'vis-wrap', vis.el),
      h('div', 'mission-tools', replay, traceBtn),
      doneBtn, answerBox, checkRow));

    async function speakPhase(){
      if(phase === 'work'){
        KL.wiz.say(m.shortText, 'idle');
        await hw.speak(m.spokenInstruction);
        if(vis.read && root.isConnected && phase === 'work') await vis.read();
      }else{
        KL.wiz.say(m.answerSpoken, 'happy');
        await hw.speak(m.answerSpoken);
      }
    }

    function startWork(){
      phase = 'work';
      answerBox.classList.add('hidden');
      checkRow.classList.add('hidden');
      doneBtn.classList.remove('hidden');
      doneBtn.disabled = true;
      doneBtn.classList.remove('ready');
      void doneBtn.offsetWidth; // restart the fill animation
      doneBtn.classList.add('filling');
      clearTimeout(timer);
      timer = setTimeout(() => { doneBtn.disabled = false; doneBtn.classList.remove('filling'); doneBtn.classList.add('ready'); }, 5000);
      if(vis.replay && m.visual.kind === 'trace') vis.replay();
      speakPhase();
    }

    function reveal(){
      phase = 'reveal';
      doneBtn.classList.add('hidden');
      answerBox.innerHTML = '';
      answerBox.appendChild(h('div', 'answer-label', "Let's check! 👀"));
      answerBox.appendChild(h('div', 'answer-text', m.answer));
      answerBox.classList.remove('hidden');
      checkRow.classList.remove('hidden');
      speakPhase();
    }

    async function tryAgain(){
      if(triedAgain) return finish('try_again');
      triedAgain = true;
      KL.wiz.say("Let's try again! 💪", 'happy');
      await hw.speak("Let's try again! Look at your paper.");
      if(root.isConnected) startWork();
    }

    async function finish(selfCheck){
      clearTimeout(timer);
      checkRow.querySelectorAll('button').forEach(b => { b.disabled = true; });
      const result = await completeMission(childId, idx, selfCheck);
      go('feed', { childId, result });
    }

    startWork();
  }

  // ═════════════════════════════════════════════════════════
  // FEED — food drops, pet eats, +1 star, one step on the map
  // ═════════════════════════════════════════════════════════
  async function feed(root, { childId, result }){
    const child = await getChild(childId);
    if(!child) return go('home');
    setTheme(child);
    showWiz(false);
    setGear(false);
    const info = hw.pets.info(child.pet.type);
    const L = mapLength();

    const pet = hw.pets.render(child.pet.type, 'bounce', 'xl');
    const food = h('div', 'food-drop', info.food);
    const star = h('div', 'star-pop', '+1 ⭐');
    const stage = h('div', 'feed-stage', food, pet, star);
    const caption = h('div', 'feed-caption', `Feeding ${child.pet.name}…`);
    root.appendChild(h('div', 'screen feed-card', stage, caption));

    const mapChild = Object.assign({}, child, { mapStep: result.from, rewardStatus: result.reachedChest ? 'locked' : child.rewardStatus });
    const map = hw.map.render(mapChild, L);
    map.el.classList.add('feed-map');
    root.appendChild(map.el);
    const nextWrap = h('div', 'feed-next');
    root.appendChild(nextWrap);

    await wait(900);
    food.classList.add('eaten');
    hw.pets.setMood(pet, 'eat');
    sfx('eat');
    hw.speak(`Yum yum! Thank you, ${child.name}!`, { pitchMul: 1.3 });
    caption.textContent = `Yum yum! Thank you, ${child.name}!`;
    await wait(1100);
    star.classList.add('show');
    sfx('star');
    hw.pets.setMood(pet, 'bounce');
    await wait(900);
    if(!root.isConnected) return;

    if(result.paused){
      caption.textContent = `${child.pet.name} is waiting at the treasure chest!`;
      await hw.speak(`${child.pet.name} is waiting at the treasure chest! Show Mom or Dad.`);
    }else{
      caption.textContent = `${child.pet.name} takes a step!`;
      await map.setStep(result.to);
      if(result.reachedChest){
        await wait(400);
        return go('chest', { childId });
      }
      const left = L - result.to;
      await hw.speak(left === 1 ? 'Only one more step to the treasure!' : `${left} more steps to the treasure!`);
    }
    if(!root.isConnected) return;
    nextWrap.appendChild(bigBtn(result.allDone ? 'All done! 🎉' : 'Next mission ➜', () => go('hub', { childId }), 'coral'));
  }

  // ═════════════════════════════════════════════════════════
  // CHEST — shake, open, confetti, real-life reward
  // ═════════════════════════════════════════════════════════
  async function chest(root, { childId }){
    const child = await getChild(childId);
    if(!child) return go('home');
    setTheme(child);
    showWiz(false);
    setGear(false);

    const box = h('div', 'chest-big shake', '🧰');
    const title = h('h1', null, 'Treasure!');
    const reward = h('div', 'chest-reward hidden');
    const sub = h('p', 'hidden', 'Show this to Mom or Dad! 👀');
    const pet = hw.pets.render(child.pet.type, 'bounce', 'md');
    root.appendChild(h('div', 'screen chest-card', box, title, reward, sub, pet,
      bigBtn('Back to my map 🗺️', () => go('hub', { childId }), 'coral chest-back')));

    hw.speak('You found the treasure chest!');
    await wait(1600);
    if(!root.isConnected) return;
    box.classList.remove('shake');
    box.classList.add('open');
    box.textContent = '🎁';
    sfx('chest');
    KL.confetti.launchConfetti(60);
    hw.pets.setMood(pet, 'wave');

    if(child.currentReward){
      title.textContent = 'You earned:';
      reward.textContent = child.currentReward;
      reward.classList.remove('hidden');
      sub.classList.remove('hidden');
      await hw.speak(`You earned: ${child.currentReward}!`);
      await hw.speak('Show this to Mom or Dad!');
    }else{
      title.textContent = 'You did it!';
      reward.textContent = 'Ask Mom or Dad for your surprise!';
      reward.classList.remove('hidden');
      await hw.speak('You did it! Ask Mom or Dad for your surprise!');
    }
  }

  // ═════════════════════════════════════════════════════════
  // PIN gate → parent screen (or add-a-child setup)
  // ═════════════════════════════════════════════════════════
  async function pin(root, { next = 'parent' } = {}){
    setTheme(null);
    showWiz(false);
    setGear(false);
    if(hw.state.parentUnlocked) return go(next);
    if(!settings().parentPinHash) return go('setup', {});

    root.appendChild(backBtn('⬅ Back', () => go('home')));
    const msg = h('p', null, 'Enter your parent PIN.');
    const forgot = h('button', { class: 'link-btn', type: 'button', onclick: () => resetPinGate(card) }, 'Forgot PIN?');
    const card = h('div', 'screen pin-card', h('div', 'grownup-tag', '👤 Grown-ups only'), h('h1', null, '🔒 Parent PIN'), msg,
      keypad(async p => {
        if(await hashPin(p) === settings().parentPinHash){
          hw.state.parentUnlocked = true;
          go(next);
        }else{
          msg.textContent = 'Not quite — try again.';
          card.classList.remove('nope'); void card.offsetWidth; card.classList.add('nope');
        }
      }), forgot);
    root.appendChild(card);
  }

  // A grown-up question instead of the PIN, then set a new one.
  function resetPinGate(card){
    const a = 6 + Math.floor(Math.random() * 4), b = 6 + Math.floor(Math.random() * 4);
    const input = h('input', { class: 'hw-input', type: 'number', inputmode: 'numeric', placeholder: `${a} × ${b} = ?` });
    const msg = h('p', null, `Grown-up check: what is ${a} × ${b}?`);
    card.innerHTML = '';
    card.append(h('div', 'grownup-tag', '👤 Grown-ups only'), h('h1', null, 'Reset PIN'), msg, input,
      bigBtn('Check', () => {
        if(Number(input.value) !== a * b){ msg.textContent = `Hmm, not quite. What is ${a} × ${b}?`; return; }
        let first = null;
        const m2 = h('p', null, 'Make a new 4-digit PIN.');
        card.innerHTML = '';
        card.append(h('h1', null, 'New PIN'), m2, keypad(async p => {
          if(!first){ first = p; m2.textContent = 'Type it once more.'; return; }
          if(p !== first){ first = null; m2.textContent = "Didn't match — start again."; return; }
          settings().parentPinHash = await hashPin(p);
          await db.put('settings', settings(), 'main');
          hw.state.parentUnlocked = true;
          go('parent');
        }));
      }, 'coral'));
    input.focus();
  }

  // ═════════════════════════════════════════════════════════
  // PARENT — per-child progress, rewards, history, backup
  // ═════════════════════════════════════════════════════════
  async function parent(root){
    if(!hw.state.parentUnlocked) return go('pin', { next: 'parent' });
    setTheme(null);
    showWiz(false);
    setGear(false);
    const L = mapLength();
    const kids = await allChildren();
    const since = addDays(today(), -13);
    const hist = (await db.getAll('history')).filter(r => r.date >= since);

    root.appendChild(backBtn('🔒 Done', () => { hw.state.parentUnlocked = false; go('home'); }));
    root.appendChild(h('div', 'hw-title', '👤 Parent Corner'));

    const refresh = () => go('parent');

    for(const child of kids){
      const rec = await todaysRecord(child.id);
      const p = hw.pets.info(child.pet.type);
      const rewardInput = h('input', { class: 'hw-input', type: 'text', maxlength: '60', placeholder: "e.g. Pick Friday's dessert", value: child.currentReward || '' });
      const rewardMsg = h('span', 'pc-note');

      if(hw.state.focusReward === child.id) setTimeout(() => rewardInput.focus(), 300);
      const unlocked = child.rewardStatus === 'unlocked';
      const rows = hist.filter(r => r.childId === child.id).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));

      root.appendChild(h('div', 'screen parent-card',
        h('div', 'pc-head', h('span', 'pc-avatar', child.avatarEmoji),
          h('div', null, h('div', 'pc-name', child.name), h('div', 'pc-pet', `${p.emoji} ${child.pet.name} · ${hw.map.theme(child.mapTheme).label} map`))),
        h('div', 'pc-stats',
          h('span', 'hud-pill', `🗺️ Step ${Math.min(child.mapStep, L)}/${L}`),
          h('span', 'hud-pill', `⭐ ${child.totalStars}`),
          h('span', 'hud-pill', `🔥 ${child.streakDays} day${child.streakDays === 1 ? '' : 's'}`),
          h('span', 'hud-pill', `🏆 ${child.mapsCompleted} map${child.mapsCompleted === 1 ? '' : 's'}`)),

        h('div', 'pc-section', h('b', null, 'Level'),
          seg([['age4', 'Age 4 · pre-reader'], ['age6', 'Age 6 · early reader']], child.level, async v => {
            child.level = v;
            await saveChild(child);
            // Swap today's missions if none are started yet.
            if(rec && rec.missions.every(m => m.status === 'todo')) await hw.missions.regenerate(child.id);
            refresh();
          })),

        h('div', 'pc-section', h('b', null, '“One more?” bonus missions'),
          seg([[true, 'Allowed'], [false, 'Off']], child.bonusAllowed !== false, async v => {
            child.bonusAllowed = v;
            await saveChild(child);
            refresh();
          }),
          h('div', 'pc-note', `After the day's missions, up to ${hw.missions.MAX_BONUS} extra. Made on the tablet, no internet needed.`)),

        h('div', 'pc-section' + (unlocked ? ' unlocked' : ''), h('b', null, 'Treasure reward'),
          unlocked ? h('div', 'pc-alert', `🎁 ${child.name} reached the chest! Give the reward, then tap “Given ✓”.`) : null,
          h('div', 'pc-inline', rewardInput,
            h('button', { class: 'hw-btn small', type: 'button', onclick: async () => {
              child.currentReward = rewardInput.value.trim() || null;
              await saveChild(child);
              rewardMsg.textContent = 'Saved ✓';
            } }, 'Save')),
          rewardMsg,
          unlocked ? h('button', { class: 'hw-btn mint', type: 'button', onclick: async () => {
            child.mapStep = 0;
            child.mapsCompleted = (child.mapsCompleted || 0) + 1;
            child.rewardStatus = 'locked';
            child.currentReward = null;
            await saveChild(child);
            hw.state.focusReward = child.id;
            refresh();
          } }, 'Given ✓ — start a new map') : null,
          hw.state.focusReward === child.id ? h('div', 'pc-alert', 'New map started! What’s the next reward?') : null),

        h('div', 'pc-section', h('b', null, "Today's missions"),
          rec ? h('ul', 'pc-today', rec.missions.map(m => h('li', null,
            `${SUBJECT[m.subject].icon} ${m.shortText} `,
            h('span', 'pc-note', m.status === 'done' ? (m.selfCheck === 'got_it' ? '👍 got it' : '🔁 tried again') : 'to do')))) : h('div', 'pc-note', 'Not opened yet today.'),
          rec ? h('div', 'pc-note', rec.source === 'ai' ? 'Made by AI today' : 'Made on this tablet (offline missions)') : null,
          h('button', { class: 'hw-btn small ghost', type: 'button', onclick: async () => {
            await hw.missions.regenerate(child.id);
            refresh();
          } }, "🔄 Regenerate today's missions")),

        h('details', 'pc-section',
          h('summary', null, h('b', null, `History · last 14 days (${rows.length})`)),
          rows.length ? h('table', 'pc-hist',
            h('tr', null, h('th', null, 'Date'), h('th', null, 'Mission'), h('th', null, 'Result')),
            rows.map(r => h('tr', null,
              h('td', null, r.date.slice(5)),
              h('td', null, `${SUBJECT[r.subject] ? SUBJECT[r.subject].icon : ''} ${r.shortText}`),
              h('td', null, r.selfCheck === 'got_it' ? '👍' : '🔁')))) : h('div', 'pc-note', 'No missions yet.')),

        h('div', 'pc-danger',
          h('button', { class: 'link-btn', type: 'button', onclick: async () => {
            if(!confirm(`Reset ${child.name}'s map, stars and streak? (History is kept.)`)) return;
            Object.assign(child, { mapStep: 0, mapsCompleted: 0, totalStars: 0, streakDays: 0, lastPlayedDate: null, rewardStatus: 'locked' });
            await saveChild(child);
            refresh();
          } }, 'Reset progress'),
          h('button', { class: 'link-btn danger', type: 'button', onclick: async () => {
            if(!confirm(`Remove ${child.name} and all their history? This can't be undone (export a backup first).`)) return;
            await db.delete('children', child.id);
            for(const k of await db.keys('dailyMissions')) if(String(k).startsWith(child.id + '_')) await db.delete('dailyMissions', k);
            for(const r of await db.getAll('history')) if(r.childId === child.id) await db.delete('history', r.id);
            refresh();
          } }, 'Remove child'))));
    }
    hw.state.focusReward = null;

    // Global settings
    const fileIn = h('input', { type: 'file', accept: 'application/json,.json', class: 'hidden' });
    fileIn.addEventListener('change', async () => {
      const f = fileIn.files[0];
      if(!f) return;
      try{
        const data = JSON.parse(await f.text());
        if(!confirm('Replace everything on this tablet with this backup?')) return;
        await hw.backup.importAll(data);
        alert('Backup restored ✓');
        refresh();
      }catch(e){
        alert('That file is not a Homework Quest backup.');
      }
    });
    const muted = !!settings().muted;
    root.appendChild(h('div', 'screen parent-card',
      h('div', 'pc-name', '⚙️ Settings'),
      h('div', 'pc-buttons',
        kids.length < 4 ? bigBtn('➕ Add a child', () => go('setup', {}), 'small') : null,
        bigBtn(muted ? '🔇 Sounds off' : '🔊 Sounds on', async () => {
          settings().muted = !muted;
          await db.put('settings', settings(), 'main');
          refresh();
        }, 'small ghost'),
        bigBtn('💾 Export backup', () => hw.backup.download(), 'small ghost'),
        bigBtn('📂 Import backup', () => fileIn.click(), 'small ghost'),
        bigBtn('🔑 Change PIN', () => {
          // Reuses the forgot-PIN flow (grown-up check, then new PIN).
          pinBox.classList.remove('hidden');
          resetPinGate(pinBox);
          pinBox.scrollIntoView({ behavior: 'smooth' });
        }, 'small ghost')),
      h('div', 'pc-section', h('b', null, 'Missions per day'),
        kids.length ? kids.map(k => h('div', 'pc-row',
          h('span', 'pc-row-name', `${k.avatarEmoji} ${k.name}`),
          seg(hw.missions.PER_DAY.map(n => [n, String(n)]), hw.missions.perDay(k), async v => {
            await setMissionsPerDay(k, v);
            refresh();
          }))) : h('div', 'pc-note', 'Add a child first.'),
        h('div', 'pc-note', 'Alternates math and reading. Each mission is one step on the map. Changes apply right away; today’s list is topped up.')),
      h('div', 'pc-section', h('b', null, 'Map length (steps to the treasure)'),
        seg([[5, '5'], [10, '10'], [15, '15'], [20, '20']], mapLength(), async v => {
          settings().mapLength = v;
          await db.put('settings', settings(), 'main');
          refresh();
        }),
        h('div', 'pc-note', 'Applies to every child. A pet already past the new end reaches the chest on its next mission.')),
      voiceSection(),
      fileIn,
      h('p', 'pc-note', 'Mute affects sound effects only — Wiz always reads instructions aloud. Progress is stored on this tablet; export a backup now and then.')));
    const pinBox = h('div', 'screen pin-card hidden');
    root.appendChild(pinBox);
  }

  async function setMissionsPerDay(child, v){
    child.missionsPerDay = v;
    await saveChild(child);
    // Fewer: swap today's set if nothing is started. More: today's set is topped up on the next visit.
    const rec = await todaysRecord(child.id);
    if(rec && v < rec.missions.length && rec.missions.every(m => m.status === 'todo')) await hw.missions.regenerate(child.id);
  }

  // Wiz's voice: pick from the tablet's English voices, set speed and pitch.
  function voiceSection(){
    const v = settings().voice || (settings().voice = { voiceName: null, rate: 0.9, pitch: 1.05 });
    const select = h('select', { class: 'hw-select' });
    const fill = () => {
      const voices = hw.speech.englishVoices();
      select.innerHTML = '';
      select.appendChild(h('option', { value: '' }, 'Automatic (best available)'));
      voices.forEach(x => select.appendChild(h('option', { value: x.name },
        `${x.name} · ${x.lang}${x.localService ? '' : ' · online'}`)));
      select.value = voices.some(x => x.name === v.voiceName) ? v.voiceName : '';
    };
    fill();
    // Voices often load late; refill once they arrive, and stop listening after leaving the screen.
    const onVoices = () => (select.isConnected ? fill() : speechSynthesis.removeEventListener('voiceschanged', onVoices));
    if(window.speechSynthesis) speechSynthesis.addEventListener('voiceschanged', onVoices);

    const save = async () => {
      hw.speech.setPrefs(v);
      await db.put('settings', settings(), 'main');
    };
    const test = () => { sfx('tap'); KL.audio.unlock(); hw.speech.unlock(); hw.speak("Hi! I'm Wiz. Let's do today's missions together!"); };
    select.addEventListener('change', async () => { v.voiceName = select.value || null; await save(); test(); });

    function slider(label, key, min, max, step){
      const out = h('span', 'pc-note', v[key].toFixed(2));
      const input = h('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(v[key]), class: 'hw-range' });
      input.addEventListener('input', () => { out.textContent = (+input.value).toFixed(2); });
      input.addEventListener('change', async () => { v[key] = +input.value; await save(); test(); });
      return h('label', 'pc-slider', h('span', null, label), input, out);
    }

    return h('div', 'pc-section', h('b', null, "🗣️ Wiz's voice"),
      select,
      slider('Speed', 'rate', 0.6, 1.2, 0.05),
      slider('Pitch', 'pitch', 0.7, 1.5, 0.05),
      h('button', { class: 'hw-btn small ghost', type: 'button', onclick: test }, '▶️ Test voice'),
      h('div', 'pc-note', hw.speech.supported
        ? 'Voices come from this tablet. For a nicer one — iPad: Settings → Accessibility → Spoken Content → Voices → English, download an “Enhanced” or “Premium” voice. Android: Settings → Text-to-speech → install voice data. Then pick it here.'
        : "This browser can't speak. Try Safari or Chrome."));
  }

  // ── backup ──────────────────────────────────────────────
  hw.backup = {
    async exportAll(){
      const dm = await db.keys('dailyMissions');
      const out = { app: 'homeworkQuest', version: 1, exportedAt: new Date().toISOString(),
        children: await db.getAll('children'),
        dailyMissions: await Promise.all(dm.map(async k => ({ key: k, value: await db.get('dailyMissions', k) }))),
        settings: await db.get('settings', 'main'),
        history: await db.getAll('history') };
      return out;
    },
    async download(){
      const data = await this.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = h('a', { href: URL.createObjectURL(blob), download: `homework-quest-backup-${today()}.json` });
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    },
    async importAll(data){
      if(!data || data.app !== 'homeworkQuest' || !Array.isArray(data.children)) throw new Error('bad backup');
      for(const s of db.STORES) await db.clear(s);
      for(const c of data.children) await db.put('children', c);
      for(const d of data.dailyMissions || []) await db.put('dailyMissions', d.value, d.key);
      for(const r of data.history || []) await db.put('history', r);
      if(data.settings) await db.put('settings', data.settings, 'main');
      hw.state.settings = Object.assign({ mapLength: 10, muted: false, voice: { voiceName: null, rate: 0.9, pitch: 1.05 } }, data.settings || {});
      hw.speech.setPrefs(hw.state.settings.voice);
    },
  };

  // ═════════════════════════════════════════════════════════
  // BUDDY — the child swaps pet and/or renames it, any time
  // ═════════════════════════════════════════════════════════
  async function buddy(root, { childId }){
    const child = await getChild(childId);
    if(!child) return go('home');
    setTheme(child);
    showWiz(true);
    setGear(false);
    let type = child.pet.type;

    root.appendChild(backBtn('⬅ Back', () => go('hub', { childId })));
    say(`Pick your buddy, ${child.name}!`);

    const grid = h('div', 'pet-grid');
    const preview = h('div', 'buddy-preview');
    const chips = h('div', 'chip-row');
    const name = h('input', { class: 'hw-input', type: 'text', maxlength: '14', placeholder: 'Buddy name', value: child.pet.name, autocomplete: 'off' });

    function showPreview(){
      preview.innerHTML = '';
      preview.appendChild(hw.pets.render(type, 'bounce', 'lg'));
    }
    function showChips(){
      chips.innerHTML = '';
      hw.pets.info(type).names.forEach(n => chips.appendChild(h('button', {
        class: 'name-chip', type: 'button',
        onclick: () => { sfx('tap'); name.value = n; say(`${n}! I love it!`, 'happy'); },
      }, n)));
    }

    Object.entries(hw.pets.PETS).forEach(([t, p]) => {
      const el = hw.pets.render(t, 'bounce', 'md');
      grid.appendChild(h('button', {
        class: 'pet-card' + (t === type ? ' sel' : ''), type: 'button',
        onclick: e => {
          sfx('tap');
          type = t;
          [...grid.children].forEach(c => c.classList.remove('sel'));
          e.currentTarget.classList.add('sel');
          hw.pets.play(el, 'wave', 900);
          showPreview();
          showChips();
          say(`A ${p.label.toLowerCase()}! What's your buddy's name?`, 'happy');
        },
      }, el, h('div', 'pet-label', p.label)));
    });
    showPreview();
    showChips();

    root.appendChild(h('div', 'screen setup-card',
      h('h1', null, 'My buddy'),
      grid,
      preview,
      h('div', 'setup-label', 'Buddy name'),
      chips,
      name,
      bigBtn('Save ✓', async () => {
        child.pet = { type, name: name.value.trim() || child.pet.name || hw.pets.info(type).names[0] };
        await saveChild(child);
        go('hub', { childId });
      }, 'coral')));
  }

  hw.screens = { home, setup, hub, mission, feed, chest, pin, parent, buddy };
})();
