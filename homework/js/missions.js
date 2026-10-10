// Today's missions — cached per child per day, AI-generated with offline fallback. KL.hw.missions
(function(){
  'use strict';
  window.KL = window.KL || {};
  const hw = (KL.hw = KL.hw || {});
  const { today, addDays, uid } = hw.util;

  const API_URL = '/api/missions';
  const TIMEOUT_MS = 25000;

  // Same rules as api/missions.js — never trust what comes over the wire.
  function validVisual(v){
    if(!v || typeof v !== 'object') return false;
    switch(v.kind){
      case 'count':         return typeof v.emoji === 'string' && Number.isInteger(v.count) && v.count >= 0 && v.count <= 30;
      case 'tenFrame':      return Number.isInteger(v.filled) && v.filled >= 0 && v.filled <= 10;
      case 'trace':         return typeof v.character === 'string' && v.character.length > 0 && v.character.length <= 3;
      case 'equation':      return typeof v.text === 'string' && v.text.length > 0;
      case 'pictureChoice': return Array.isArray(v.emojis) && v.emojis.length > 0 && v.emojis.every(e => typeof e === 'string');
      case 'story':         return Array.isArray(v.sentences) && v.sentences.length > 0 && v.sentences.every(s => typeof s === 'string');
    }
    return false;
  }
  // `count` missions alternating math, reading, math, …
  function validate(arr, count = 2){
    if(!Array.isArray(arr) || arr.length !== count) return false;
    return arr.every((m, i) => {
      const subject = i % 2 ? 'reading' : 'math';
      return m && m.subject === subject &&
        ['spokenInstruction', 'shortText', 'answer', 'answerSpoken'].every(k => typeof m[k] === 'string' && m[k].trim()) &&
        validVisual(m.visual);
    });
  }

  function normalize(list, extra){
    return list.map(m => Object.assign({
      id: uid(),
      subject: m.subject,
      spokenInstruction: m.spokenInstruction,
      shortText: m.shortText,
      visual: m.visual,
      answer: m.answer,
      answerSpoken: m.answerSpoken,
      status: 'todo',
      selfCheck: null,
    }, extra));
  }

  const perDay = child => [2, 4, 6].includes(child.missionsPerDay) ? child.missionsPerDay : 2;
  const MAX_BONUS = 4;

  async function historyFor(childId, sinceDate){
    const all = await hw.db.getAll('history');
    return all.filter(r => r.childId === childId && (!sinceDate || r.date >= sinceDate));
  }

  async function fetchAI(child, recentShortTexts, count){
    if(navigator.onLine === false) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try{
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: child.level, date: today(), recentShortTexts, count }),
        signal: ctrl.signal,
      });
      if(!res.ok) return null;
      const data = await res.json();
      if(!data || data.fallback || !validate(data.missions, count)) return null;
      return data.missions;
    }catch(_){
      return null;
    }finally{
      clearTimeout(timer);
    }
  }

  const key = (childId, date) => `${childId}_${date}`;
  const inflight = {};

  // → { childId, date, missions:[math, reading, …], source }
  function getToday(child){
    const k = key(child.id, today());
    if(!inflight[k]) inflight[k] = load(child, k).finally(() => { delete inflight[k]; });
    return inflight[k];
  }

  async function recentTexts(childId, days){
    const hist = await historyFor(childId, addDays(today(), -days));
    hist.sort((a, b) => (a.date < b.date ? 1 : -1));
    return hist.map(r => r.shortText);
  }

  async function load(child, k){
    const date = today();
    const want = perDay(child);
    const saved = await hw.db.get('dailyMissions', k);
    if(saved){
      // Parent raised missions-per-day after today's set was made: top up locally.
      const regular = saved.missions.filter(m => !m.bonus);
      if(regular.length < want){
        const avoid = new Set([...(await recentTexts(child.id, 7)), ...saved.missions.map(m => m.shortText)]);
        const extra = [];
        for(let i = regular.length; i < want; i++) extra.push(hw.fallbackBank.one(child, i % 2 ? 'reading' : 'math', avoid));
        const firstBonus = saved.missions.findIndex(m => m.bonus);
        const at = firstBonus < 0 ? saved.missions.length : firstBonus;
        saved.missions.splice(at, 0, ...normalize(extra));
        await hw.db.put('dailyMissions', saved, k);
      }
      return saved;
    }

    const recent = await recentTexts(child.id, 14);
    let list = await fetchAI(child, recent.slice(0, 12), want);
    let source = 'ai';
    if(!list){
      list = hw.fallbackBank.pick(child, await recentTexts(child.id, 7), want);
      source = 'fallback';
    }
    const rec = { childId: child.id, date, missions: normalize(list), source };
    await hw.db.put('dailyMissions', rec, k);
    return rec;
  }

  // "One more?" after the day's missions — made on the device, no API call.
  // → index of the new mission, or -1 if bonus is off / today's cap is reached.
  async function addBonus(child){
    const rec = await getToday(child);
    const bonus = rec.missions.filter(m => m.bonus).length;
    if(child.bonusAllowed === false || bonus >= MAX_BONUS) return -1;
    const last = rec.missions[rec.missions.length - 1];
    const subject = last && last.subject === 'math' ? 'reading' : 'math';
    const avoid = new Set([...(await recentTexts(child.id, 7)), ...rec.missions.map(m => m.shortText)]);
    rec.missions.push(...normalize([hw.fallbackBank.one(child, subject, avoid)], { bonus: true }));
    await save(rec);
    return rec.missions.length - 1;
  }
  const canBonus = (child, rec) => child.bonusAllowed !== false && rec.missions.filter(m => m.bonus).length < MAX_BONUS;

  async function save(rec){ await hw.db.put('dailyMissions', rec, key(rec.childId, rec.date)); }
  async function regenerate(childId){ await hw.db.delete('dailyMissions', key(childId, today())); }

  hw.missions = { getToday, save, regenerate, validate, historyFor, key, perDay, addBonus, canBonus, MAX_BONUS };
})();
