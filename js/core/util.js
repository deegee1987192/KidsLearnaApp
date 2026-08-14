// Shared utilities across mini-games.

function shuffle(a){
  const b=[...a];
  for(let i=b.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [b[i],b[j]]=[b[j],b[i]];
  }
  return b;
}

function el(tag, cls, txt){
  const e=document.createElement(tag);
  if(cls) e.className=cls;
  if(txt!=null) e.textContent=txt;
  return e;
}

function $(sel, root=document){ return root.querySelector(sel); }
function $$(sel, root=document){ return [...root.querySelectorAll(sel)]; }

function clamp(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); }
function randInt(lo,hi){ return lo+Math.floor(Math.random()*(hi-lo+1)); }

window.KL = window.KL || {};
window.KL.util = { shuffle, el, $, $$, clamp, randInt };
