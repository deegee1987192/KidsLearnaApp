// Wiz the owl mascot — reusable across games.
// Call KL.wiz.mount(hostEl) to inject the mascot + speech bubble.
// Then KL.wiz.say(msg, mood) to update.  mood ∈ 'idle' | 'happy' | 'sad'.

const OWL_SVG = `
<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" width="80" height="80">
  <ellipse cx="40" cy="52" rx="26" ry="24" fill="#7C4DFF"/>
  <ellipse cx="16" cy="56" rx="12" ry="7" fill="#5E35B1" transform="rotate(-20,16,56)"/>
  <ellipse cx="64" cy="56" rx="12" ry="7" fill="#5E35B1" transform="rotate(20,64,56)"/>
  <ellipse cx="40" cy="57" rx="16" ry="14" fill="#EDE7F6"/>
  <ellipse cx="40" cy="30" rx="22" ry="20" fill="#7C4DFF"/>
  <polygon points="24,14 20,4 30,12" fill="#5E35B1"/>
  <polygon points="56,14 60,4 50,12" fill="#5E35B1"/>
  <circle cx="30" cy="28" r="9" fill="white"/>
  <circle cx="30" cy="28" r="6" fill="#FFB300"/>
  <circle cx="30" cy="28" r="3.5" fill="#1A237E"/>
  <circle cx="31.5" cy="26.5" r="1.5" fill="white"/>
  <circle cx="50" cy="28" r="9" fill="white"/>
  <circle cx="50" cy="28" r="6" fill="#FFB300"/>
  <circle cx="50" cy="28" r="3.5" fill="#1A237E"/>
  <circle cx="51.5" cy="26.5" r="1.5" fill="white"/>
  <polygon points="40,33 36,40 44,40" fill="#FFB300"/>
  <rect x="22" y="12" width="36" height="5" rx="2" fill="#1A237E"/>
  <rect x="36" y="8" width="8" height="6" rx="1" fill="#1A237E"/>
  <line x1="55" y1="14" x2="58" y2="22" stroke="#FFB300" stroke-width="2"/>
  <circle cx="58" cy="23" r="3" fill="#FFB300"/>
  <ellipse cx="33" cy="74" rx="8" ry="4" fill="#FFB300"/>
  <ellipse cx="47" cy="74" rx="8" ry="4" fill="#FFB300"/>
</svg>`;

function mount(hostEl, initial='Ready to learn? Let\'s go! 🎉'){
  const wrap = document.createElement('div');
  wrap.className = 'wiz-wrap';
  wrap.innerHTML = `
    <div class="wiz idle" id="wiz">${OWL_SVG}</div>
    <div class="wiz-bubble" id="wizBubble">${initial}</div>
  `;
  hostEl.appendChild(wrap);
}

function say(msg, mood='idle'){
  const wiz=document.getElementById('wiz');
  const bub=document.getElementById('wizBubble');
  if(!wiz||!bub) return;
  wiz.className=`wiz ${mood}`;
  bub.textContent=msg;
  bub.classList.add('show');
  if(mood==='happy'||mood==='sad'){
    setTimeout(()=>{ wiz.className='wiz idle'; },1200);
  }
}

window.KL = window.KL || {};
window.KL.wiz = { mount, say, OWL_SVG };
