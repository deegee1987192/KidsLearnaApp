// Confetti burst. Requires a #confetti element in the DOM.

function launchConfetti(n=20){
  const wrap=document.getElementById('confetti');
  if(!wrap) return;
  const colors=['#FFD54F','#FF7043','#4FC3F7','#66BB6A','#CE93D8','#7C4DFF','#FF6B4A'];
  for(let i=0;i<n;i++){
    const el=document.createElement('div');
    el.className='cbit';
    el.style.cssText=`left:${Math.random()*100}vw;width:${8+Math.random()*10}px;height:${8+Math.random()*10}px;background:${colors[Math.floor(Math.random()*colors.length)]};animation-duration:${0.9+Math.random()*1.5}s;animation-delay:${Math.random()*0.5}s`;
    wrap.appendChild(el);
    el.addEventListener('animationend',()=>el.remove());
  }
}

window.KL = window.KL || {};
window.KL.confetti = { launchConfetti };
