// Vercel serverless function: POST /api/missions
// Body: { level: "age4" | "age6", date: "YYYY-MM-DD", recentShortTexts: [...], count: 2 | 4 | 6 }
// → { missions: [math, reading, math, …] }  or  { fallback: true }
// Needs the ANTHROPIC_API_KEY env var in Vercel. No npm packages; uses Node 18+ fetch.

const MODEL = 'claude-haiku-5-5';
const KINDS = ['count', 'tenFrame', 'trace', 'equation', 'pictureChoice', 'story'];

const SHAPE = `Return ONLY a JSON array of mission objects, alternating subjects: math, reading, math, reading, … No prose, no markdown fences.
Each mission:
{
  "subject": "math" | "reading",
  "spokenInstruction": string,   // what Wiz the owl reads aloud
  "shortText": string,           // at most 8 words, shown on screen
  "visual": one of
     { "kind": "count", "emoji": "🍎", "count": 7 }               // count 0-20
     { "kind": "tenFrame", "filled": 6 }                         // 0-10
     { "kind": "trace", "character": "7" }                       // a digit 0-9, "10", or ONE uppercase letter A-Z
     { "kind": "equation", "text": "7 + 5 = ?" }                 // big text; use ? or __ for blanks
     { "kind": "pictureChoice", "emojis": ["🐝","🍌","🐱"] }      // 1-6 emoji
     { "kind": "story", "sentences": ["Sam has a red hat.", "The wind took it!"] }  // 2-4 short sentences
  "answer": string,              // shown on reveal, short (a number, word, or emoji)
  "answerSpoken": string         // read aloud on reveal, warm and encouraging
}`;

const LEVELS = {
  age4: `The child is 4 years old and CANNOT READ. Every instruction is spoken aloud.
Math ideas: count objects up to 10 and write the number (use "count"); trace then write a number 0-10 (use "trace"); "draw X circles"; which group has more (use "pictureChoice" with two emoji groups like "🍌🍌🍌"); AB patterns like red, blue, red, ___ (use "pictureChoice" ending in "❓").
Reading ideas: letter sounds, e.g. "Which picture starts with B? Draw it and write a B" (use "pictureChoice"); trace then write an uppercase letter (use "trace"); draw a picture for a spoken word.
Instructions: ONE step only, at most 15 words, warm. Never require reading on-screen text.`,
  age6: `The child is 6 years old and is an early reader.
Math ideas: adding and subtracting within 20 (use "equation"); ten-frame "how many more to make 10" (use "tenFrame"); word problems with objects (use "count"); skip-counting by 2s, 5s, 10s (use "equation" with blanks); writing numbers up to 50.
Reading ideas: CVC words and sight words to copy and say (use "equation" with the word); a 2-4 sentence story read aloud, then one question answered by writing a word or drawing (use "story"); rhyming (use "pictureChoice"); sequencing - draw what happened first (use "story").
Instructions: up to two steps, at most 25 words.`,
};

const RULES = `Rules for both levels:
- Everything must be doable with pencil and paper only. The child works on paper, then taps "I'm done" to see the answer.
- Answers must be clear enough for a child to self-check. For drawing tasks the answer is an example, e.g. "Your picture should show 3 apples".
- Friendly and encouraging. No timers. Never use the word "wrong".
- shortText must be 8 words or fewer.
- The visual must match the instruction (if you say "count the apples", show apples with the right count).`;

function validVisual(v){
  if(!v || typeof v !== 'object' || !KINDS.includes(v.kind)) return false;
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

function validate(arr, count){
  if(!Array.isArray(arr) || arr.length !== count) return false;
  return arr.every((m, i) => {
    const subject = i % 2 ? 'reading' : 'math';
    return m && m.subject === subject &&
      ['spokenInstruction', 'shortText', 'answer', 'answerSpoken'].every(k => typeof m[k] === 'string' && m[k].trim()) &&
      validVisual(m.visual);
  });
}

function parseArray(text){
  const start = text.indexOf('['), end = text.lastIndexOf(']');
  if(start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch(_){ return null; }
}

async function askClaude(apiKey, level, date, recent, count){
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: 'low' },
      system: `You write short daily homework missions for a child using a tablet app called Homework Quest.\n\n${LEVELS[level]}\n\n${RULES}\n\n${SHAPE}`,
      messages: [{
        role: 'user',
        content: `Today is ${date}. Write today's ${count} missions for level ${level}: exactly ${count} items, alternating math, reading, math, reading. Make each one different.` +
          (recent.length ? `\nAvoid repeating these recent missions:\n- ${recent.join('\n- ')}` : ''),
      }],
    }),
    signal: AbortSignal.timeout(11000),
  });
  if(!res.ok){
    console.error('Claude API error', res.status, (await res.text()).slice(0, 300));
    return null;
  }
  const data = await res.json();
  if(data.stop_reason === 'refusal') return null;
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  return parseArray(text);
}

module.exports = async function handler(req, res){
  res.setHeader('Cache-Control', 'no-store');
  if(req.method !== 'POST'){
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST only' });
  }

  let body = req.body;
  if(typeof body === 'string'){ try { body = JSON.parse(body); } catch(_){ body = {}; } }
  body = body || {};
  const level = body.level === 'age6' ? 'age6' : 'age4';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : new Date().toISOString().slice(0, 10);
  const recent = (Array.isArray(body.recentShortTexts) ? body.recentShortTexts : [])
    .filter(s => typeof s === 'string').slice(0, 12).map(s => s.slice(0, 80));

  const count = [2, 4, 6].includes(body.count) ? body.count : 2;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if(!apiKey) return res.status(200).json({ fallback: true });

  // Try twice, then let the client use its offline bank.
  for(let attempt = 0; attempt < 2; attempt++){
    try{
      const missions = await askClaude(apiKey, level, date, recent, count);
      if(validate(missions, count)) return res.status(200).json({ missions });
    }catch(err){
      console.error('missions attempt failed', err && err.message);
    }
  }
  return res.status(200).json({ fallback: true });
};
