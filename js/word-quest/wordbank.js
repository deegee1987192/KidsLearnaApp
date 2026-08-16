// Word Quest — curated content pools, grouped by difficulty band (1 = easiest,
// 5 = hardest). levels.js draws from these to generate the 20 levels.
//
//   words[band]   → [{ w:'CAT', e:'🐱' }]  used for fill-the-letters + read
//   riddles[band] → [{ q, choices:[...], answer }]  used for logic questions

(function(){
  window.KL = window.KL || {};
  const WQ = window.KL.wordQuest = window.KL.wordQuest || {};

  const words = {
    1: [ // 3-letter
      {w:'CAT',e:'🐱'},{w:'DOG',e:'🐶'},{w:'SUN',e:'☀️'},{w:'BEE',e:'🐝'},
      {w:'PIG',e:'🐷'},{w:'COW',e:'🐮'},{w:'FOX',e:'🦊'},{w:'HEN',e:'🐔'},
      {w:'BUS',e:'🚌'},{w:'CAR',e:'🚗'},{w:'HAT',e:'🎩'},{w:'BED',e:'🛏️'},
      {w:'OWL',e:'🦉'},{w:'ANT',e:'🐜'},{w:'CUP',e:'☕'},{w:'BAT',e:'🦇'},
    ],
    2: [ // 4-letter
      {w:'FROG',e:'🐸'},{w:'TREE',e:'🌳'},{w:'MOON',e:'🌙'},{w:'STAR',e:'⭐'},
      {w:'FISH',e:'🐟'},{w:'CAKE',e:'🎂'},{w:'BOAT',e:'⛵'},{w:'DUCK',e:'🦆'},
      {w:'LION',e:'🦁'},{w:'BEAR',e:'🐻'},{w:'BIRD',e:'🐦'},{w:'CRAB',e:'🦀'},
      {w:'GOAT',e:'🐐'},{w:'CORN',e:'🌽'},{w:'KITE',e:'🪁'},{w:'DOOR',e:'🚪'},
    ],
    3: [ // 5-letter
      {w:'APPLE',e:'🍎'},{w:'HOUSE',e:'🏠'},{w:'TIGER',e:'🐯'},{w:'TRAIN',e:'🚂'},
      {w:'SNAKE',e:'🐍'},{w:'HORSE',e:'🐴'},{w:'ROBOT',e:'🤖'},{w:'CLOUD',e:'☁️'},
      {w:'SHEEP',e:'🐑'},{w:'MOUSE',e:'🐭'},{w:'WHALE',e:'🐳'},{w:'ZEBRA',e:'🦓'},
      {w:'PANDA',e:'🐼'},{w:'PIZZA',e:'🍕'},{w:'GRAPE',e:'🍇'},{w:'LEMON',e:'🍋'},
    ],
    4: [ // 6-7 letter
      {w:'RABBIT',e:'🐰'},{w:'MONKEY',e:'🐵'},{w:'ORANGE',e:'🍊'},{w:'ROCKET',e:'🚀'},
      {w:'DRAGON',e:'🐉'},{w:'FLOWER',e:'🌸'},{w:'GUITAR',e:'🎸'},{w:'PENGUIN',e:'🐧'},
      {w:'GIRAFFE',e:'🦒'},{w:'DOLPHIN',e:'🐬'},{w:'OCTOPUS',e:'🐙'},{w:'BALLOON',e:'🎈'},
      {w:'CARROT',e:'🥕'},{w:'TURTLE',e:'🐢'},{w:'PARROT',e:'🦜'},{w:'CASTLE',e:'🏰'},
    ],
    5: [ // 8+ letter
      {w:'ELEPHANT',e:'🐘'},{w:'BUTTERFLY',e:'🦋'},{w:'DINOSAUR',e:'🦕'},{w:'UMBRELLA',e:'☂️'},
      {w:'KANGAROO',e:'🦘'},{w:'CROCODILE',e:'🐊'},{w:'HELICOPTER',e:'🚁'},{w:'STRAWBERRY',e:'🍓'},
      {w:'PINEAPPLE',e:'🍍'},{w:'HAMBURGER',e:'🍔'},{w:'SNOWFLAKE',e:'❄️'},{w:'HEDGEHOG',e:'🦔'},
      {w:'DINOSAUR',e:'🦖'},{w:'MUSHROOM',e:'🍄'},{w:'PANCAKES',e:'🥞'},{w:'SQUIRREL',e:'🐿️'},
    ],
  };

  const riddles = {
    1: [
      {q:"I say WOOF and wag my tail. What am I?", choices:['🐶 DOG','🐱 CAT','🐟 FISH','🐦 BIRD'], answer:'🐶 DOG'},
      {q:"I am yellow and shine in the sky by day. What am I?", choices:['☀️ SUN','🌙 MOON','⭐ STAR','☁️ CLOUD'], answer:'☀️ SUN'},
      {q:"You kick me in a soccer game. What am I?", choices:['⚽ BALL','🍎 APPLE','🎩 HAT','📦 BOX'], answer:'⚽ BALL'},
      {q:"I have long ears and hop. What am I?", choices:['🐰 RABBIT','🐘 ELEPHANT','🐍 SNAKE','🐢 TURTLE'], answer:'🐰 RABBIT'},
      {q:"I am cold, sweet, and you eat me on a hot day. What am I?", choices:['🍦 ICE CREAM','🍞 BREAD','🥕 CARROT','🧀 CHEESE'], answer:'🍦 ICE CREAM'},
    ],
    2: [
      {q:"A cat is smaller than a dog. A dog is smaller than a horse. Which is biggest?", choices:['🐴 HORSE','🐶 DOG','🐱 CAT','ALL SAME'], answer:'🐴 HORSE'},
      {q:"Ben has 2 apples. Mia has MORE than Ben. Who has more?", choices:['MIA','BEN','SAME','CANNOT TELL'], answer:'MIA'},
      {q:"Which one can FLY?", choices:['🦅 EAGLE','🐟 FISH','🐍 SNAKE','🐢 TURTLE'], answer:'🦅 EAGLE'},
      {q:"Day comes, then night. What comes after NIGHT?", choices:['DAY','NIGHT','NOON','NEVER'], answer:'DAY'},
      {q:"Which one is NOT a fruit?", choices:['🥕 CARROT','🍎 APPLE','🍌 BANANA','🍇 GRAPES'], answer:'🥕 CARROT'},
    ],
    3: [
      {q:"A turtle is slower than a rabbit. A rabbit is slower than a cheetah. Who is slowest?", choices:['🐢 TURTLE','🐰 RABBIT','🐆 CHEETAH','SAME'], answer:'🐢 TURTLE'},
      {q:"Red is first, blue is second, green is third. Which is LAST?", choices:['GREEN','RED','BLUE','YELLOW'], answer:'GREEN'},
      {q:"All fish live in water. A shark is a fish. Does a shark live in water?", choices:['YES','NO','MAYBE','ONLY AT NIGHT'], answer:'YES'},
      {q:"Tom is taller than Sam. Sam is taller than Ann. Who is shortest?", choices:['ANN','TOM','SAM','SAME'], answer:'ANN'},
      {q:"Which season is the COLDEST?", choices:['❄️ WINTER','☀️ SUMMER','🌸 SPRING','🍂 FALL'], answer:'❄️ WINTER'},
    ],
    4: [
      {q:"If today is Monday, what day is TOMORROW?", choices:['TUESDAY','SUNDAY','MONDAY','FRIDAY'], answer:'TUESDAY'},
      {q:"A week has 7 days. If 2 days have passed, how many are LEFT?", choices:['5','4','6','3'], answer:'5'},
      {q:"All birds lay eggs. A robin is a bird. Does a robin lay eggs?", choices:['YES','NO','MAYBE','NEVER'], answer:'YES'},
      {q:"Sara is 3rd in line. How many people are IN FRONT of her?", choices:['2','3','1','4'], answer:'2'},
      {q:"Which is heaviest?", choices:['🐘 ELEPHANT','🐈 CAT','🐁 MOUSE','🐜 ANT'], answer:'🐘 ELEPHANT'},
    ],
    5: [
      {q:"If you share 6 cookies with 2 friends and yourself, how many does EACH get?", choices:['2','3','1','6'], answer:'2'},
      {q:"A shape with 3 sides is called a…", choices:['TRIANGLE','SQUARE','CIRCLE','STAR'], answer:'TRIANGLE'},
      {q:"Every square has 4 equal sides. Does a square have 4 sides?", choices:['YES','NO','SOMETIMES','ONLY BIG ONES'], answer:'YES'},
      {q:"5 birds sit on a tree. 2 fly away, then 1 comes back. How many now?", choices:['4','3','5','2'], answer:'4'},
      {q:"Which word means the OPPOSITE of HAPPY?", choices:['SAD','GLAD','FUNNY','KIND'], answer:'SAD'},
    ],
  };

  WQ.bank = { words, riddles };
})();
