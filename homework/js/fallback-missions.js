// Offline missions — generated on the device, no API needed. KL.hw.fallbackBank
// Math is built from random numbers and objects; reading draws from word, rhyme
// and story lists. Together that's thousands of distinct missions per level.
(function(){
  'use strict';
  window.KL = window.KL || {};
  const hw = (KL.hw = KL.hw || {});

  // ── helpers ─────────────────────────────────────────────
  const rand  = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const pickR = arr => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = arr => KL.util.shuffle(arr);
  const sample = (arr, n) => shuffle(arr).slice(0, n);

  function m(subject, shortText, spokenInstruction, visual, answer, answerSpoken){
    return { subject, shortText, spokenInstruction, visual, answer: String(answer), answerSpoken: answerSpoken || String(answer) };
  }
  const count = (emoji, n) => ({ kind: 'count', emoji, count: n });
  const tf    = n => ({ kind: 'tenFrame', filled: n });
  const tr    = c => ({ kind: 'trace', character: c });
  const eq    = t => ({ kind: 'equation', text: t });
  const pics  = (...e) => ({ kind: 'pictureChoice', emojis: e });
  const story = s => ({ kind: 'story', sentences: s });

  const ONES = ['zero','one','two','three','four','five','six','seven','eight','nine','ten',
                'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const TENS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  function nw(n){
    if(n < 20) return ONES[n];
    if(n === 100) return 'one hundred';
    return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  }

  // Things to count: [emoji, plural]
  const THINGS = [
    ['🍎','apples'],['🐟','fish'],['⭐','stars'],['🚗','cars'],['🦆','ducks'],['🍓','strawberries'],
    ['🎈','balloons'],['🍪','cookies'],['🐝','bees'],['🐸','frogs'],['🌸','flowers'],['🚚','trucks'],
    ['🦋','butterflies'],['🍌','bananas'],['🐢','turtles'],['🚀','rockets'],['❤️','hearts'],['🥚','eggs'],
    ['🐶','puppies'],['🐱','kittens'],['🐞','ladybugs'],['🍩','donuts'],['⚽','balls'],['🐧','penguins'],
  ];
  const SHAPES = [['⭕','circles'],['🟦','squares'],['🔺','triangles'],['⭐','stars'],['❤️','hearts']];
  const PATTERNS = [['🔴','🔵','red','blue'],['☀️','🌙','sun','moon'],['🐶','🐱','dog','cat'],
    ['🍎','🍌','apple','banana'],['⭐','❤️','star','heart'],['🟢','🟡','green','yellow'],
    ['🚗','🚌','car','bus'],['🐸','🐟','frog','fish']];

  // Picture words by first letter (clear, early sounds only).
  const WORDS = {
    A: [['🍎','apple'],['🐜','ant']],   B: [['🐝','bee'],['⚽','ball'],['🍌','banana'],['🚌','bus']],
    C: [['🐱','cat'],['🎂','cake'],['🚗','car'],['🐮','cow']], D: [['🐶','dog'],['🦆','duck'],['🥁','drum']],
    E: [['🥚','egg'],['🐘','elephant']], F: [['🐟','fish'],['🐸','frog'],['🦊','fox']],
    G: [['🐐','goat'],['🎁','gift'],['🍇','grapes']], H: [['🎩','hat'],['🐴','horse'],['🏠','house']],
    J: [['🧃','juice'],['🕹️','joystick']], K: [['🪁','kite'],['🔑','key'],['🦘','kangaroo']],
    L: [['🦁','lion'],['🍃','leaf'],['🍋','lemon']], M: [['🌙','moon'],['🐒','monkey'],['🐭','mouse']],
    N: [['👃','nose'],['🪺','nest']], O: [['🐙','octopus']], P: [['🐷','pig'],['🍕','pizza'],['🍐','pear']],
    R: [['🐰','rabbit'],['🌈','rainbow'],['🚀','rocket']], S: [['☀️','sun'],['🐍','snake'],['🧦','sock']],
    T: [['🌳','tree'],['🐢','turtle'],['🐯','tiger']], U: [['☂️','umbrella']], V: [['🚐','van'],['🎻','violin']],
    W: [['🐳','whale'],['🪱','worm'],['⌚','watch']], Y: [['🪀','yo-yo']], Z: [['🦓','zebra']],
  };
  const LETTERS = Object.keys(WORDS);
  const SAME_SOUND = { C: 'K', K: 'C' };
  const DRAW_WORDS = Object.values(WORDS).flat();

  const CVC = [['cat','🐱'],['dog','🐶'],['sun','☀️'],['bed','🛏️'],['pig','🐷'],['hat','🎩'],['bus','🚌'],
    ['cup','🥤'],['fox','🦊'],['bat','🦇'],['map','🗺️'],['pen','🖊️'],['net','🥅'],['web','🕸️'],['box','📦'],
    ['bug','🐛'],['mug','☕'],['jam','🍓'],['van','🚐'],['ten','🔟'],['hen','🐔'],['log','🪵'],['pot','🍲'],
    ['fan','🪭'],['bag','👜'],['nut','🥜'],['bun','🍔'],['red','🔴'],['six','6️⃣'],['zip','🤐'],['kit','🧰'],
    ['rat','🐀'],['pin','📌'],['cap','🧢'],['leg','🦵'],['lip','👄'],['mop','🧹'],['rug','🟫'],['tub','🛁'],
    ['wig','💇'],['yak','🐃'],['jet','✈️'],['gum','🍬'],['hut','🛖'],['dig','⛏️'],['hop','🐇'],['sit','🪑'],
    ['run','🏃'],['wet','💧'],['hot','🔥']];
  const SIGHT = ['the','and','see','you','is','it','can','we','me','my','go','to','he','she','look','like',
    'said','here','come','play','big','little','up','down','in','on','was','are','for','with','one','two',
    'yes','no','what','this','have','they','all','am'];
  const RHYMES = [
    [['🐱','cat'],['🎩','hat'],['🦇','bat'],['🐀','rat']], [['🐶','dog'],['🐸','frog'],['🪵','log']],
    [['☀️','sun'],['🍔','bun'],['🏃','run']], [['🐝','bee'],['🌳','tree'],['3️⃣','three']],
    [['🎂','cake'],['🐍','snake'],['🌊','lake']], [['💍','ring'],['🤴','king'],['🪽','wing']],
    [['🐐','goat'],['⛵','boat'],['🧥','coat']], [['🐟','fish'],['🍽️','dish']],
    [['🧦','sock'],['🕰️','clock'],['🪨','rock']], [['🚗','car'],['⭐','star'],['🫙','jar']],
    [['🦊','fox'],['📦','box']], [['🐛','bug'],['☕','mug'],['🤗','hug']],
    [['🐭','mouse'],['🏠','house']], [['🌙','moon'],['🥄','spoon']], [['🐻','bear'],['🍐','pear'],['🪑','chair']],
  ];
  // [sentences, question shortText, spoken question, answer, answerSpoken]
  const STORIES = [
    [['Sam has a red hat.','The wind took it!'], 'What did the wind take?', 'What did the wind take? Write the word or draw it.', 'hat 🎩', "The wind took Sam's red hat!"],
    [['The cat is fat.','The cat sat on a mat.','The cat had a nap.'], 'Where did the cat sit?', 'Where did the cat sit? Draw it.', 'on a mat', 'The cat sat on a mat!'],
    [['Pip is a big dog.','Pip can dig.','Pip dug up a bone!'], 'What did Pip dig up?', 'What did Pip find? Write the word.', 'bone 🦴', 'Pip dug up a bone!'],
    [['I see a bus.','The bus is red.','It goes fast!'], 'What colour is the bus?', 'What colour is the bus? Colour a bus on your paper.', 'red 🚌', 'The bus is red!'],
    [['I have a box.','The box can hop!','A frog is in the box.'], 'Who is in the box?', 'Who is in the box? Draw it and write the word.', 'frog 🐸', 'A frog is in the box!'],
    [['Mia planted a seed.','The rain came.','A big flower grew!'], 'What did Mia do first?', 'What happened first? Draw it.', '🌱 Mia planted a seed', 'First, Mia planted a seed!'],
    [['Ben got a big egg.','The egg went crack!','Out came a chick!'], 'What came out of the egg?', 'What came out of the egg? Draw it.', 'a chick 🐣', 'Out came a chick!'],
    [['Dad has a van.','The van is tan.','We sit in the van.'], 'What does Dad have?', 'What does Dad have? Write the word.', 'van 🚐', 'Dad has a van!'],
    [['The sun is hot.','Kim gets a cup.','The cup has ice in it.'], 'What is in the cup?', 'What is in the cup? Draw it.', 'ice 🧊', 'The cup has ice in it!'],
    [['A bug is on a log.','The bug is red.','The bug can fly!'], 'Where is the bug?', 'Where is the bug? Draw it.', 'on a log 🪵', 'The bug is on a log!'],
    [['Tom has six pens.','He gives one to Liv.','Now Liv can draw!'], 'What did Tom give Liv?', 'What did Tom give to Liv? Write the word.', 'a pen 🖊️', 'Tom gave Liv a pen!'],
    [['The hen sat on a nest.','She sat and sat.','Ten chicks came out!'], 'How many chicks came out?', 'How many chicks came out? Write the number.', '10', 'Ten chicks came out!'],
    [['It is wet.','Max gets his boots.','He jumps in the mud!'], 'What did Max jump in?', 'What did Max jump in? Draw it.', 'mud 💦', 'Max jumped in the mud!'],
    [['Jess has a kite.','The kite is up, up, up!','It is in the sky.'], 'Where is the kite?', 'Where is the kite? Draw it.', 'in the sky 🪁', 'The kite is in the sky!'],
    [['The fox ran fast.','It ran to its den.','The fox had a nap.'], 'Where did the fox run?', 'Where did the fox run? Write the word.', 'den', 'The fox ran to its den!'],
    [['I got a gift.','I can not wait!','It is a toy duck!'], 'What was in the gift?', 'What was in the gift? Draw it.', 'a toy duck 🦆', 'It was a toy duck!'],
    [['Nan makes a cake.','We add the jam.','Yum, yum, yum!'], 'What did Nan make?', 'What did Nan make? Draw it.', 'a cake 🎂', 'Nan made a cake!'],
    [['The pig is in the mud.','The pig is pink.','The pig is glad!'], 'What colour is the pig?', 'What colour is the pig? Write the word.', 'pink 🐷', 'The pig is pink!'],
    [['Ned has a bat.','Ned hits the ball.','The ball goes far!'], 'What did Ned hit?', 'What did Ned hit? Draw it.', 'the ball ⚾', 'Ned hit the ball!'],
    [['Zoe got up.','She ate her egg.','Then she went to school.'], 'What did Zoe do first?', 'What happened first? Draw it.', 'Zoe got up ☀️', 'First, Zoe got up!'],
    [['A ship is on the sea.','A big wave hits it.','The ship rocks!'], 'What hit the ship?', 'What hit the ship? Draw it.', 'a wave 🌊', 'A big wave hit the ship!'],
    [['Lin has a cat.','The cat is in a tree.','Lin gets a ladder.'], 'Where is the cat?', 'Where is the cat? Draw it.', 'in a tree 🌳', 'The cat is in a tree!'],
    [['We go to the park.','I go on the swing.','I go up high!'], 'What did I go on?', 'What did I go on at the park? Draw it.', 'the swing', 'I went on the swing!'],
    [['The snow fell.','Ali made a snowman.','He gave it a hat.'], 'What did Ali make?', 'What did Ali make? Draw it.', 'a snowman ⛄', 'Ali made a snowman!'],
    [['Gus is a pup.','Gus sees a ball.','Gus runs to get it!'], 'What did Gus see?', 'What did Gus see? Write the word.', 'ball', 'Gus saw a ball!'],
    [['The moon is up.','It is time for bed.','Good night, Sam!'], 'Is it day or night?', 'Is it day or night? Draw the sky.', 'night 🌙', "It's night time!"],
  ];

  // ── age 4 · math ────────────────────────────────────────
  const age4math = [
    () => { const [e, w] = pickR(THINGS), n = rand(1, 10);
      return m('math', `Count the ${w}. Write the number.`, `Count the ${w}. Then write the number on your paper.`,
        count(e, n), n, `There are ${nw(n)} ${w}!`); },
    () => { const n = rand(0, 9);
      return m('math', `Write the number ${n}.`, `Watch me write ${nw(n)}. Now write ${nw(n)} three times on your paper.`,
        tr(String(n)), `${n} ${n} ${n}`, `${nw(n)}, ${nw(n)}, ${nw(n)}. Great writing!`); },
    () => m('math', 'Write the number 10.', 'Watch me write ten. A one, then a zero. Now you write ten.', tr('10'), '10', 'Ten! A one and a zero.'),
    () => { const [e, w] = pickR(SHAPES), n = rand(2, 6);
      return m('math', `Draw ${n} ${w}.`, `Draw ${nw(n)} ${w} on your paper. Count them as you go!`,
        eq(`${n} = ?`), e.repeat(n), `Your paper should show ${nw(n)} ${w}.`); },
    () => { const n = rand(1, 10);
      return m('math', `Count the dots. Write the number.`,
        'How many dots are in the boxes? Count them, then write the number.', tf(n), n, `${nw(n)} dots!`); },
    () => { const [[e1, w1], [e2, w2]] = sample(THINGS, 2); let a = rand(1, 6), b = rand(1, 6);
      while(a === b) b = rand(1, 6);
      const more = a > b ? [e1, w1, a] : [e2, w2, b], less = a > b ? b : a;
      return m('math', `${w1} or ${w2}: which has more?`, `Which group has more, the ${w1} or the ${w2}? Draw the bigger group.`,
        pics(e1.repeat(a), e2.repeat(b)), more[0].repeat(more[2]), `The ${more[1]}! ${nw(more[2])} is more than ${nw(less)}.`); },
    () => { const [a, b, wa, wb] = pickR(PATTERNS), len = rand(4, 6);
      const seq = Array.from({ length: len }, (_, i) => (i % 2 ? b : a)), next = len % 2 ? b : a;
      return m('math', `${wa}, ${wb}… what comes next?`, `${seq.map((_, i) => (i % 2 ? wb : wa)).join(', ')}. What comes next? Draw it!`,
        pics(...seq, '❓'), next, `${next === a ? wa : wb} comes next!`); },
    () => { const [a, b, wa, wb] = pickR(PATTERNS);
      const seq = [a, a, b, a, a, b, a, a];
      return m('math', `${wa}, ${wa}, ${wb}… what's next?`, `${wa}, ${wa}, ${wb}, ${wa}, ${wa}, ${wb}, ${wa}, ${wa}. What comes next? Draw it!`,
        pics(...seq, '❓'), b, `${wb} comes next!`); },
    () => { const [e, w] = pickR(THINGS), n = rand(1, 8);
      return m('math', `${n} ${w}. Draw one more!`, `Count the ${w}. Draw them on your paper, then draw one more. How many now?`,
        count(e, n), n + 1, `${nw(n)} and one more makes ${nw(n + 1)}!`); },
    () => { const n = rand(1, 9);
      return m('math', `What comes after ${n}?`, `Count with me. What number comes after ${nw(n)}? Write it.`,
        eq(`${n}, ?`), n + 1, `${nw(n + 1)} comes after ${nw(n)}!`); },
  ];

  // ── age 4 · reading ─────────────────────────────────────
  const age4reading = [
    () => { const L = pickR(LETTERS), [e, w] = pickR(WORDS[L]);
      return m('reading', `Write the letter ${L}.`, `Watch me write ${L}. ${L} is for ${w}! Now write three ${L}s on your paper.`,
        tr(L), `${L} ${L} ${L}`, `${L}, ${L}, ${L}. ${L} is for ${w}!`); },
    () => { const L = pickR(LETTERS), [e, w] = pickR(WORDS[L]);
      const others = LETTERS.filter(x => x !== L && x !== SAME_SOUND[L]);
      const wrong = sample(others, 2).map(x => pickR(WORDS[x])[0]);
      return m('reading', `Which one starts with ${L}?`, `Which picture starts with the ${L} sound? Draw it, and write a ${L} next to it.`,
        pics(...shuffle([e, ...wrong])), `${e} ${L}`, `${w}! ${w} starts with ${L}.`); },
    () => { const L = pickR(LETTERS), [e, w] = pickR(WORDS[L]);
      return m('reading', `${w}: what letter does it start with?`, `${w}. What sound does ${w} start with? Write that letter.`,
        pics(e), L, `${w} starts with ${L}!`); },
    () => { const [e, w] = pickR(DRAW_WORDS);
      return m('reading', `Draw a ${w}!`, `Draw a ${w} on your paper. Say ${w} out loud!`, pics(e), e, `Your picture should show a ${w}.`); },
    () => m('reading', 'Write your first letter!', 'Your name starts with {initial}. Watch me write it, then write it big on your paper!',
      tr('{initial}'), '{initial}', '{name} starts with {initial}!'),
  ];

  // ── age 6 · math ────────────────────────────────────────
  const age6math = [
    () => { const a = rand(2, 12), b = rand(2, Math.min(9, 20 - a));
      return m('math', `${a} + ${b} = ?`, `What is ${a} plus ${b}? Write the whole number sentence on your paper.`,
        eq(`${a} + ${b} = ?`), `${a} + ${b} = ${a + b}`, `${nw(a)} plus ${nw(b)} is ${nw(a + b)}!`); },
    () => { const a = rand(8, 20), b = rand(2, Math.min(9, a - 1));
      return m('math', `${a} − ${b} = ?`, `What is ${a} take away ${b}? Write the number sentence on your paper.`,
        eq(`${a} − ${b} = ?`), `${a} − ${b} = ${a - b}`, `${nw(a)} take away ${nw(b)} is ${nw(a - b)}!`); },
    () => { const n = rand(1, 9);
      return m('math', `${n} dots. How many more make 10?`, 'Count the dots. How many more do you need to make ten? Write the number.',
        tf(n), 10 - n, `${nw(10 - n)} more! ${nw(n)} and ${nw(10 - n)} make ten.`); },
    () => { const [e, w] = pickR(THINGS), a = rand(2, 9), b = rand(1, 6), name = pickR(['Sam','Mia','Leo','Ava','Max','Zoe']);
      return m('math', `${name} has ${a} ${w}. ${b} more come!`, `${name} has ${a} ${w}. ${b} more come. How many ${w} now? Write the number sentence.`,
        count(e, a), `${a} + ${b} = ${a + b}`, `${nw(a)} plus ${nw(b)} is ${nw(a + b)} ${w}!`); },
    () => { const [e, w] = pickR(THINGS), a = rand(4, 12), b = rand(1, a - 1);
      return m('math', `${a} ${w}. ${b} go away.`, `There are ${a} ${w}. ${b} go away. How many are left? Write the number sentence.`,
        count(e, a), `${a} − ${b} = ${a - b}`, `${nw(a)} take away ${nw(b)} is ${nw(a - b)} ${w}!`); },
    () => { const step = pickR([2, 5, 10]), start = step * rand(1, step === 10 ? 4 : 5);
      const seq = [0, 1, 2].map(i => start + i * step), next = [3, 4, 5].map(i => start + i * step);
      return m('math', `Count by ${step}s from ${start}!`, `Count by ${nw(step)}s. Write the next three numbers on your paper.`,
        eq(`${seq.join(', ')}, __, __, __`), next.join(', '), next.map(nw).join(', ') + '!'); },
    () => { const s = rand(10, 40);
      return m('math', `Write ${s} to ${s + 10}.`, `Write all the numbers from ${nw(s)} to ${nw(s + 10)} on your paper.`,
        eq(`${s}, ${s + 1}, __ … ${s + 10}`), Array.from({ length: 11 }, (_, i) => s + i).join(' '), `${nw(s)} all the way to ${nw(s + 10)}!`); },
    () => { const a = rand(2, 9), c = rand(a + 2, Math.min(18, a + 9));
      return m('math', `${a} + ? = ${c}`, `${a} plus what makes ${c}? Write the missing number.`,
        eq(`${a} + ? = ${c}`), c - a, `${nw(a)} plus ${nw(c - a)} makes ${nw(c)}!`); },
    () => { const a = rand(10, 50); let b = rand(10, 50); while(b === a) b = rand(10, 50);
      return m('math', `Which is bigger: ${a} or ${b}?`, `Which number is bigger, ${nw(a)} or ${nw(b)}? Write the bigger number.`,
        eq(`${a}  or  ${b}`), Math.max(a, b), `${nw(Math.max(a, b))} is bigger!`); },
    () => { const a = rand(2, 10);
      return m('math', `Double ${a}: ${a} + ${a} = ?`, `Doubles! What is ${a} plus ${a}? Write the number sentence.`,
        eq(`${a} + ${a} = ?`), `${a} + ${a} = ${2 * a}`, `${nw(a)} plus ${nw(a)} is ${nw(2 * a)}!`); },
    () => { const n = rand(11, 49), before = Math.random() < 0.5;
      return m('math', `What comes ${before ? 'before' : 'after'} ${n}?`, `What number comes ${before ? 'just before' : 'just after'} ${nw(n)}? Write it.`,
        eq(before ? `?, ${n}` : `${n}, ?`), before ? n - 1 : n + 1, `${nw(before ? n - 1 : n + 1)}!`); },
  ];

  // ── age 6 · reading ─────────────────────────────────────
  const age6reading = [
    () => { const [w, e] = pickR(CVC);
      return m('reading', `Copy the word: ${w}`, `This word is ${w}. ${w.split('').join(', ')}. Write ${w} three times and draw a little picture.`,
        eq(`${w}  ${e}`), `${w} ${w} ${w}`, `${w}, ${w}, ${w}!`); },
    () => { const w = pickR(SIGHT);
      return m('reading', `Sight word: ${w}`, `This word is ${w}. Say it, then write ${w} three times on your paper.`,
        eq(w), `${w} ${w} ${w}`, `${w}, ${w}, ${w}!`); },
    () => { const [w, e] = pickR(CVC), i = rand(0, 2), blank = w.slice(0, i) + '_' + w.slice(i + 1);
      return m('reading', `Fill in the missing letter: ${blank}`, `What letter is missing? Write the whole word on your paper.`,
        eq(`${blank}  ${e}`), w, `The word is ${w}! ${w.split('').join(', ')}.`); },
    () => { const [w, e] = pickR(CVC);
      return m('reading', `Copy: I see a ${w}.`, `Read with me: I see a ${w}. Copy the sentence, then draw a ${w}.`,
        eq(`I see a ${w}.`), `I see a ${w}. ${e}`, `I see a ${w}!`); },
    () => { const fam = pickR(RHYMES), [x, y] = sample(fam, 2);
      const other = pickR(pickR(RHYMES.filter(f => f !== fam)));
      return m('reading', `${x[1]}, ${y[1]}, ${other[1]}: which rhyme?`.replace(/^./, c => c.toUpperCase()),
        `${x[1]}, ${y[1]}, ${other[1]}. Which two words rhyme? Write them on your paper.`,
        pics(...shuffle([x[0], y[0], other[0]])), `${x[1]}, ${y[1]}`, `${x[1]} and ${y[1]} rhyme!`); },
    () => { const fam = pickR(RHYMES), [e, w] = pickR(fam);
      return m('reading', `Rhyme with "${w}"!`, `${w}. Can you think of a word that rhymes with ${w}? Write it and draw it.`,
        pics(e), fam.filter(x => x[1] !== w).map(x => x[1]).join(', '), `${fam.map(x => x[1]).join(', ')} all rhyme!`); },
    storyMission,
    storyMission, // listed twice: stories come up about a quarter of the time
  ];
  function storyMission(){
    const [s, short, q, a, as] = pickR(STORIES);
    return m('reading', short, `Listen to the story. ${q}`, story(s), a, as);
  }

  const GEN = {
    age4: { math: age4math, reading: age4reading },
    age6: { math: age6math, reading: age6reading },
  };

  function fill(str, child){
    const name = (child && child.name) || 'you';
    const initial = name.charAt(0).toUpperCase() || 'A';
    return typeof str === 'string' ? str.replace(/\{name\}/g, name).replace(/\{initial\}/g, initial) : str;
  }
  function personalize(mission, child){
    ['shortText', 'spokenInstruction', 'answer', 'answerSpoken'].forEach(k => { mission[k] = fill(mission[k], child); });
    if(mission.visual && mission.visual.character) mission.visual.character = fill(mission.visual.character, child);
    return mission;
  }

  // One mission for a subject, avoiding any shortText in `avoid` (a Set).
  function one(child, subject, avoid){
    const level = GEN[child.level] ? child.level : 'age4';
    const gens = GEN[level][subject];
    let best = null;
    for(let i = 0; i < 30; i++){
      const msn = personalize(pickR(gens)(), child);
      best = msn;
      if(!avoid || !avoid.has(msn.shortText)) break;
    }
    if(avoid) avoid.add(best.shortText);
    return best;
  }

  // `count` missions alternating math, reading, … — no repeats from `recentShortTexts`.
  function pick(child, recentShortTexts, count = 2){
    const avoid = new Set(recentShortTexts || []);
    return Array.from({ length: count }, (_, i) => one(child, i % 2 ? 'reading' : 'math', avoid));
  }

  hw.fallbackBank = { GEN, pick, one };
})();
