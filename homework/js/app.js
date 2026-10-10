// Homework Quest — boot + simple screen router. KL.hw.go(name, params)
(function(){
  'use strict';
  const hw = KL.hw;

  hw.state = { settings: null, woke: {}, parentUnlocked: false, focusReward: null };

  let navId = 0;
  async function go(name, params = {}){
    const screen = hw.screens[name];
    if(!screen) return go('home');
    const my = ++navId;
    hw.speech.cancel();
    const root = document.getElementById('hwRoot');
    root.innerHTML = '';
    root.dataset.screen = name;
    window.scrollTo(0, 0);
    // Each screen gets its own container so late async work from the previous
    // screen can check `root.isConnected` and bail out.
    const box = document.createElement('div');
    box.className = 'hw-screen hw-screen-' + name;
    root.appendChild(box);
    try{
      await screen(box, params);
    }catch(err){
      console.error('[homework]', err);
      if(my === navId){
        box.innerHTML = '';
        box.appendChild(hw.util.h('div', 'screen', hw.util.h('div', 'big-e', '🙈'),
          hw.util.h('p', null, 'Oops, something went wrong.'),
          hw.util.h('button', { class: 'hw-btn coral', type: 'button', onclick: () => go('home') }, 'Start over')));
      }
    }
  }
  hw.go = go;

  async function boot(){
    // Any tap unlocks speech on iOS (must be inside a user gesture).
    ['click', 'touchend'].forEach(ev => document.addEventListener(ev, () => hw.speech.unlock(), true));

    KL.wiz.mount(document.getElementById('wizHost'), 'Hoo-hoo! 🦉');
    document.getElementById('hwGear').addEventListener('click', () => { hw.util.sfx('tap'); go('pin', { next: 'parent' }); });

    try{
      const s = await hw.db.get('settings', 'main');
      hw.state.settings = Object.assign({ parentPinHash: null, mapLength: 10, muted: false,
        voice: { voiceName: null, rate: 0.9, pitch: 1.05 } }, s || {});
      if(!s) await hw.db.put('settings', hw.state.settings, 'main');
      hw.speech.setPrefs(hw.state.settings.voice);
    }catch(err){
      console.error('[homework] IndexedDB unavailable', err);
      document.getElementById('hwRoot').innerHTML =
        '<div class="screen"><div class="big-e">🙈</div><p>This browser can\'t save progress (private mode?). Try a normal browser window.</p><a class="hw-btn coral" href="../index.html">🏠 Back to hub</a></div>';
      return;
    }
    go('home');
  }

  if('serviceWorker' in navigator){
    window.addEventListener('load', () => navigator.serviceWorker.register('../sw.js').catch(() => {}));
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
