// Pets — big emoji buddies with CSS animations (bounce, eat, wave, sleep). KL.hw.pets
(function(){
  'use strict';
  window.KL = window.KL || {};
  const hw = (KL.hw = KL.hw || {});

  const PETS = {
    dragon:  { emoji: '🐉', label: 'Dragon',  food: '🌶️', names: ['Sparky', 'Blaze', 'Ziggy', 'Ember'] },
    dino:    { emoji: '🦕', label: 'Dino',    food: '🥬', names: ['Stomp', 'Rex', 'Dotty', 'Pebbles'] },
    puppy:   { emoji: '🐶', label: 'Puppy',   food: '🦴', names: ['Biscuit', 'Max', 'Waffles', 'Buddy'] },
    robot:   { emoji: '🤖', label: 'Robot',   food: '🔋', names: ['Bolt', 'Beep', 'Gizmo', 'Sprocket'] },
    kitten:  { emoji: '🐱', label: 'Kitten',  food: '🐟', names: ['Whiskers', 'Mittens', 'Luna', 'Pounce'] },
    unicorn: { emoji: '🦄', label: 'Unicorn', food: '🧁', names: ['Sparkle', 'Rainbow', 'Star', 'Twinkle'] },
  };

  const MOODS = ['bounce', 'eat', 'wave', 'sleep', 'idle'];

  // Returns a .pet element; call setMood(el, mood) to switch animation.
  function render(type, mood = 'idle', size = 'lg'){
    const p = PETS[type] || PETS.puppy;
    const el = document.createElement('div');
    el.className = `pet pet-${size}`;
    el.innerHTML = `<span class="pet-body">${p.emoji}</span><span class="pet-zz">💤</span>`;
    setMood(el, mood);
    return el;
  }

  function setMood(el, mood){
    MOODS.forEach(m => el.classList.remove('pet-' + m));
    el.classList.add('pet-' + (MOODS.includes(mood) ? mood : 'idle'));
  }

  // Play a one-shot animation then return to idle.
  function play(el, mood, ms = 1200){
    setMood(el, mood);
    return new Promise(r => setTimeout(() => { setMood(el, 'idle'); r(); }, ms));
  }

  hw.pets = { PETS, render, setMood, play, info: t => PETS[t] || PETS.puppy };
})();
