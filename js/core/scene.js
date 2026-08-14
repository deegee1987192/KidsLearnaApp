// Animated background scenes shared across mini-games.
// Requires an element with id="scene" already in the DOM (see games/*.html).

function setScene(name){
  const s=document.getElementById('scene');
  if(!s) return;
  s.className=name||'day';
  s.querySelectorAll('.vine,.planet,.rocket,.lollipop').forEach(e=>e.remove());

  if(name==='jungle'){
    for(let i=0;i<4;i++){
      const v=document.createElement('div');
      v.className='vine';
      v.style.cssText=`height:${80+Math.random()*120}px;left:${Math.random()*90}%;animation-delay:${Math.random()*2}s`;
      s.appendChild(v);
    }
  }
  if(name==='space'){
    buildStars(50);
    const colors=['#CE93D8','#80CBC4','#FFB74D'];
    for(let i=0;i<2;i++){
      const p=document.createElement('div');
      p.className='planet';
      const sz=30+Math.random()*40;
      p.style.cssText=`width:${sz}px;height:${sz}px;background:${colors[i%3]};top:${10+Math.random()*30}%;left:${10+Math.random()*70}%;animation-delay:${i*2}s`;
      s.appendChild(p);
    }
    const r=document.createElement('div');
    r.className='rocket';r.textContent='🚀';
    s.appendChild(r);
  }
  if(name==='candy'){
    ['🍭','🍬','🍰'].forEach((e,i)=>{
      const l=document.createElement('div');
      l.className='lollipop';l.textContent=e;
      l.style.cssText=`bottom:${80+i*40}px;left:${10+i*30}%;font-size:2rem;position:absolute;animation-delay:${i*0.6}s`;
      s.appendChild(l);
    });
  }
  if(name==='night') buildStars(30);
}

function buildStars(n){
  const wrap=document.getElementById('starsWrap');
  if(!wrap) return;
  wrap.innerHTML='';
  for(let i=0;i<n;i++){
    const d=document.createElement('div');
    d.className='star-dot';
    const sz=2+Math.random()*3;
    d.style.cssText=`width:${sz}px;height:${sz}px;top:${Math.random()*70}%;left:${Math.random()*100}%;animation-duration:${1.5+Math.random()*2.5}s;animation-delay:${Math.random()*3}s`;
    wrap.appendChild(d);
  }
}

window.KL = window.KL || {};
window.KL.scene = { setScene, buildStars };
