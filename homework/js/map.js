// Treasure-map strip — themes, pet position, step + chest animations. KL.hw.map
(function(){
  'use strict';
  window.KL = window.KL || {};
  const hw = (KL.hw = KL.hw || {});

  const THEMES = {
    jungle: { label: 'Jungle', icon: '🌴', scene: 'jungle', deco: ['🌴', '🐒', '🌺', '🦜', '🍌', '🌿'] },
    ocean:  { label: 'Ocean',  icon: '🐳', scene: 'ocean',  deco: ['🐠', '🐚', '🐙', '🌊', '🦀', '🐬'] },
    space:  { label: 'Space',  icon: '🚀', scene: 'space',  deco: ['🪐', '⭐', '🌙', '☄️', '🛸', '✨'] },
    castle: { label: 'Castle', icon: '🏰', scene: 'castle', deco: ['🏰', '👑', '🛡️', '🐉', '🌹', '⚔️'] },
  };

  // Node i of n sits at x% along the strip, zig-zagging up and down.
  function pos(i, n){
    return { x: 6 + (i / n) * 88, y: i % 2 ? 66 : 34 };
  }

  // child: { pet, mapTheme, mapStep, rewardStatus }; length: steps to the chest.
  function render(child, length){
    const theme = THEMES[child.mapTheme] || THEMES.jungle;
    const step = Math.min(child.mapStep || 0, length);
    const wrap = document.createElement('div');
    wrap.className = `map map-${child.mapTheme || 'jungle'}`;

    const pts = [];
    for(let i = 0; i <= length; i++){ const p = pos(i, length); pts.push(`${p.x},${p.y}`); }
    wrap.innerHTML =
      `<svg class="map-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
         <polyline points="${pts.join(' ')}" vector-effect="non-scaling-stroke"/>
       </svg>`;

    // Scenery
    for(let i = 0; i < 6; i++){
      const d = document.createElement('span');
      d.className = 'map-deco';
      d.textContent = theme.deco[i % theme.deco.length];
      const x = 10 + i * 15 + (i % 2) * 4;
      d.style.cssText = `left:${x}%;top:${i % 2 ? 4 : 78}%;animation-delay:${i * 0.4}s`;
      wrap.appendChild(d);
    }

    const nodes = [];
    for(let i = 0; i <= length; i++){
      const p = pos(i, length);
      const n = document.createElement('div');
      n.className = 'map-node' + (i === 0 ? ' start' : '') + (i === length ? ' chest' : '');
      n.style.cssText = `left:${p.x}%;top:${p.y}%`;
      if(i === length) n.textContent = child.rewardStatus === 'unlocked' ? '🎁' : '🧰';
      else if(i === 0) n.textContent = '🚩';
      if(i <= step && i !== length) n.classList.add('visited');
      wrap.appendChild(n);
      nodes.push(n);
    }

    const pet = hw.pets.render(child.pet && child.pet.type, 'idle', 'sm');
    pet.classList.add('map-pet');
    wrap.appendChild(pet);

    let cur = step;
    function place(i){
      const p = pos(i, length);
      pet.style.left = p.x + '%';
      pet.style.top = p.y + '%';
    }
    place(cur);

    // Walk to step i (one hop at a time) → Promise.
    async function setStep(i){
      i = Math.max(0, Math.min(length, i));
      while(cur !== i){
        cur += i > cur ? 1 : -1;
        hw.pets.setMood(pet, 'bounce');
        place(cur);
        if(cur !== length) nodes[cur].classList.add('visited');
        hw.util.sfx('step');
        await hw.util.wait(650);
      }
      hw.pets.setMood(pet, 'idle');
    }

    function openChest(){
      const c = nodes[length];
      c.classList.add('shake');
      setTimeout(() => { c.textContent = '🎁'; c.classList.remove('shake'); c.classList.add('open'); }, 900);
    }

    return { el: wrap, pet, setStep, openChest, chestNode: nodes[length] };
  }

  hw.map = { THEMES, render, theme: t => THEMES[t] || THEMES.jungle };
})();
