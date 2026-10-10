// speechSynthesis wrapper — KL.hw.speak(text, opts) → Promise (resolves when done).
// iOS rule: the first utterance must happen inside a tap, so screens call
// KL.hw.speech.unlock() from the first click handler.
(function(){
  'use strict';
  window.KL = window.KL || {};
  const hw = (KL.hw = KL.hw || {});
  const synth = window.speechSynthesis;

  const PREFERRED = ['Samantha', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny',
                     'Karen', 'Moira', 'Google UK English Female', 'Microsoft Zira', 'Daniel'];
  let voice = null, unlocked = false, token = 0;
  // Parent's choice (Parent Corner → Wiz's voice). voiceName null = automatic.
  const prefs = { voiceName: null, rate: 0.9, pitch: 1.05 };

  function englishVoices(){
    if(!synth) return [];
    return synth.getVoices().filter(v => /^en([-_]|$)/i.test(v.lang));
  }

  function pickVoice(){
    if(!synth) return;
    const vs = englishVoices();
    if(!vs.length) return;
    if(prefs.voiceName){
      const chosen = vs.find(v => v.name === prefs.voiceName);
      if(chosen){ voice = chosen; return; }
    }
    for(const name of PREFERRED){
      const v = vs.find(v => v.name.indexOf(name) === 0);
      if(v){ voice = v; return; }
    }
    voice = vs.find(v => /en[-_]US/i.test(v.lang) && v.localService) ||
            vs.find(v => /en[-_](US|GB|AU)/i.test(v.lang)) || vs[0];
  }
  if(synth){
    pickVoice();
    if('onvoiceschanged' in synth) synth.addEventListener('voiceschanged', pickVoice);
  }

  // Emoji are read out loud literally ("red apple") — strip them.
  function clean(text){
    return String(text || '')
      .replace(/\p{Extended_Pictographic}/gu, '')
      .replace(/[\u{FE0F}\u{200D}\u{20E3}]/gu, '')
      .replace(/\s+/g, ' ').trim();
  }

  function unlock(){
    if(unlocked || !synth) return;
    unlocked = true;
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    synth.speak(u);
  }

  function cancel(){
    token++;
    if(synth) synth.cancel();
  }

  function setPrefs(p){
    if(!p) return;
    if('voiceName' in p) prefs.voiceName = p.voiceName || null;
    if(p.rate)  prefs.rate  = Math.min(1.5, Math.max(0.5, +p.rate));
    if(p.pitch) prefs.pitch = Math.min(2, Math.max(0.5, +p.pitch));
    pickVoice();
  }
  const currentVoice = () => voice;

  // opts: { rateMul, pitchMul, onboundary } — multipliers on the parent's settings.
  function speak(text, opts = {}){
    const t = clean(text);
    if(!synth || !t) return Promise.resolve();
    const my = ++token;
    synth.cancel();
    return new Promise(resolve => {
      let done = false;
      const finish = () => { if(!done){ done = true; clearTimeout(guard); resolve(); } };
      // Safari sometimes never fires onend — guard with a generous timeout.
      const rate = Math.min(2, prefs.rate * (opts.rateMul || 1));
      const guard = setTimeout(finish, 2500 + t.split(' ').length * 600 / rate);
      // Chrome drops an utterance queued in the same tick as cancel().
      setTimeout(() => {
        if(my !== token) return finish();
        const u = new SpeechSynthesisUtterance(t);
        if(voice) u.voice = voice;
        u.lang = voice ? voice.lang : 'en-US';
        u.rate = rate;
        u.pitch = Math.min(2, prefs.pitch * (opts.pitchMul || 1));
        u.onend = finish;
        u.onerror = finish;
        if(opts.onboundary) u.onboundary = opts.onboundary;
        synth.speak(u);
        if(synth.paused) synth.resume();
      }, 60);
    });
  }

  function isSpeaking(){ return !!(synth && synth.speaking); }

  hw.speech = { speak, cancel, unlock, clean, isSpeaking, setPrefs, englishVoices, currentVoice, prefs, supported: !!synth };
  hw.speak = speak;
})();
