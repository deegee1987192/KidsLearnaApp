// Homework Quest — small shared helpers (DOM builder, dates, PIN hash, sounds).
(function(){
  'use strict';
  window.KL = window.KL || {};
  const hw = (KL.hw = KL.hw || {});

  // h('div', {class:'x', onclick:fn}, child, 'text', [more]) → element
  // h('div', 'x', ...) is shorthand for {class:'x'}.
  function h(tag, props, ...kids){
    const e = document.createElement(tag);
    if(typeof props === 'string') props = { class: props };
    if(props){
      for(const k in props){
        const v = props[k];
        if(v == null || v === false) continue;
        if(k === 'class') e.className = v;
        else if(k === 'text') e.textContent = v;
        else if(k === 'html') e.innerHTML = v;
        else if(k === 'style') e.style.cssText = v;
        else if(k.startsWith('on')) e.addEventListener(k.slice(2), v);
        else if(k in e && typeof v !== 'string') e[k] = v;
        else e.setAttribute(k, v === true ? '' : v);
      }
    }
    append(e, kids);
    return e;
  }
  function append(e, kids){
    kids.forEach(k => {
      if(k == null || k === false) return;
      if(Array.isArray(k)) return append(e, k);
      e.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
    });
  }

  // Local-time dates as YYYY-MM-DD.
  function fmt(d){
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function today(){ return fmt(new Date()); }
  function addDays(dateStr, n){
    const [y,m,d] = dateStr.split('-').map(Number);
    return fmt(new Date(y, m-1, d+n));
  }

  function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

  async function hashPin(pin){
    const data = new TextEncoder().encode('hq-salt:' + pin);
    if(window.crypto && crypto.subtle){
      const buf = await crypto.subtle.digest('SHA-256', data);
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join('');
    }
    // Non-secure context fallback (e.g. LAN IP during testing).
    let x = 5381;
    for(const b of data) x = ((x << 5) + x + b) >>> 0;
    return 'djb2-' + x.toString(16);
  }

  const wait = ms => new Promise(r => setTimeout(r, ms));

  // Sound effects via KL.audio; silenced by the parent's mute setting.
  function sfx(name){
    if(!KL.audio || (hw.state && hw.state.settings && hw.state.settings.muted)) return;
    const A = KL.audio;
    switch(name){
      case 'tap':   A.playTone(660, 0.08, 'triangle', 0.18); break;
      case 'eat':   [0,120,240].forEach((t,i) => setTimeout(() => A.playTone(392 + i*98, 0.12, 'square', 0.12), t)); break;
      case 'step':  A.playTone(523.25, 0.12, 'triangle', 0.22); setTimeout(() => A.playTone(784, 0.18, 'triangle', 0.22), 110); break;
      case 'star':  A.playTone(1046.5, 0.25, 'sine', 0.22); break;
      case 'chest': A.playChime(); setTimeout(() => A.playChime(), 450); break;
      case 'done':  A.playChime(); break;
    }
  }

  hw.util = { h, today, addDays, uid, hashPin, wait, sfx };
})();
