/* 中文 for TT Garden Worm: the words on the page, the toasts and the ? panel (Kit.lang, from kit/lang.js).
   Simple words: Tommy is 5. 毛毛虫 (caterpillar), 蘑菇 (mushroom), 水枪 (water squirter), 蝴蝶 (butterfly), 头 (head).
   The kids' names, Foxy and Froggy, and the game's own name stay in English on purpose. */
(function () {
  const L = Kit.lang;
  const title = window.GW_TITLE;
  const words = title.split(' ');
  L.keep(['TEDDY', 'TOMMY', 'FOXY', 'FROGGY', 'Teddy', 'Tommy', 'TEDDY & TOMMY', title, words.slice(0, -1).join(' '), words[words.length - 1], 'TT', 'Esc', 'Claude Code']);

  L.add({
    // home
    'Squirt the giggly caterpillar! Every bit you squirt turns into a butterfly.': '用水枪喷咯咯笑的毛毛虫！喷到的每一节都会变成蝴蝶。',
    'WHO PLAYS?': '谁来玩？', 'Who plays': '谁来玩', 'BOTH': '一起玩', '2 PLAYERS': '双人',
    'Level (↑ ↓)': '难度 (↑ ↓)', 'EASY': '简单', 'NORMAL': '普通', '🐣 EASY': '🐣 简单', '🔥 NORMAL': '🔥 普通',
    '▶ PLAY!': '▶ 开始！', 'move': '跑', 'squirt': '喷水', 'call': '叫', 'a high five': '击掌', 'pause': '暂停', 'sound': '声音',
    'Tommy': 'Tommy', 'Teddy': 'Teddy',
    'Put a finger down and slide it to run. The squirter squirts while your finger is down.': '手指按住屏幕滑动就能跑，手指按着水枪就会一直喷水。',
    'built with': '制作工具',
    // playing
    'SCORE': '分数', 'HI': '最高', 'Pause': '暂停', 'Pause (P)': '暂停 (P)', 'Sound (M)': '声音 (M)', 'Sound on or off': '声音 开 / 关',
    'Call your brother (T)': '叫兄弟来帮忙 (T)', 'High five (T)': '击掌 (T)', 'HIGH FIVE': '击掌',
    'LOADING…': '加载中…', 'GO!': '出发！',
    'ARROWS MOVE · SPACE SQUIRTS!': '方向键跑 · 空格键喷水！',
    'TEDDY: WASD + SPACE · TOMMY: ARROWS + ENTER': 'TEDDY：WASD + 空格键 · TOMMY：方向键 + 回车键',
    'SLIDE TO RUN · HOLD TO SQUIRT!': '滑动跑 · 按住喷水！',
    '✋ HIGH FIVE!': '✋ 击掌！', '❤️ +1': '❤️ +1', '🐌 STICKY SNAIL!': '🐌 黏黏的蜗牛来啦！', '🐛 A BABY CATERPILLAR!': '🐛 一只小毛毛虫！',
    '🐛 LAST WAVE!': '🐛 最后一波！', '😆 TICKLED OUT!': '😆 被挠痒痒挠光啦！',
    '💦 GRASSHOPPER SOAKED!': '💦 蚱蜢被淋湿啦！', '💦 LADYBUG SOAKED!': '💦 瓢虫被淋湿啦！', '💦 SNAIL SOAKED!': '💦 蜗牛被淋湿啦！',
    // pause, results
    'PAUSED': '暂停中', 'P · Esc · Space': 'P · Esc · 空格键', '▶ KEEP PLAYING': '▶ 继续玩', '🏠 HOME': '🏠 主页', '↻ PLAY AGAIN': '↻ 再玩一次',
    '★ NEW HI-SCORE! ★': '★ 新的最高分！★', '★ NEW BEST! ★': '★ 新纪录！★', 'WAVE': '第几波', '🦋 BUTTERFLIES': '🦋 蝴蝶', 'HI-SCORES': '最高分榜',
    // the ? panel (js/keys.js)
    'run': '跑', 'call your brother · high five': '叫兄弟 · 击掌', 'who plays': '谁来玩', 'level 🐣 / 🔥': '难度 🐣 / 🔥', 'play! · again': '开始！· 再来',
    'sound on / off': '声音 开 / 关',
    'Squirt the caterpillar: every segment you squirt turns into a butterfly, leaves a mushroom and splits the caterpillar in two. Mushrooms take 4 squirts. In 1 player both sets of keys work, and T calls your brother: he brings a treat and a sprinkler storm that turns 5 segments into butterflies. With 2 players, T is a high five.':
      '用水枪喷毛毛虫：喷到的每一节都会变成蝴蝶，留下一个蘑菇，毛毛虫也会从那里断成两条。蘑菇要喷 4 下才会冲掉。一个人玩时两套按键都能用，T 叫兄弟来：他会带来好吃的，还有一场洒水风暴，把 5 节毛毛虫变成蝴蝶。两个人玩时，T 是击掌。',
    "Put a finger down and slide it to run; the squirter squirts while your finger is down (with 2 players, Teddy uses the left half and Tommy the right). Tap your brother's face to call him.":
      '手指按住屏幕滑动就能跑，手指按着水枪就会一直喷水（两个人玩时，Teddy 用左半边，Tommy 用右半边）。点兄弟的头像叫他来。',
  });

  const TREAT = { 'ICE CREAM': '冰淇淋', WATER: '水', 'JUICE BOX': '果汁', COOKIE: '饼干', WATERMELON: '西瓜', BANANA: '香蕉' };
  L.rule(/^BEST (\d+)$/, '最高分 $1');
  L.rule(/^HI-SCORE$/, '最高分');
  L.rule(/^HI-SCORE (\d+) · (.+)$/, '最高分 $1 · $2');
  L.rule(/^\s*·\s*(FOXY 🦊|FROGGY 🐸|TEDDY|TOMMY|TEDDY & TOMMY)$/, ' · $1');
  L.rule(/^🦋 WAVE CLEAR! \+(\d+)$/, '🦋 这一波清光啦！+$1');
  L.rule(/^🐛 WAVE (\d+)!$/, '🐛 第 $1 波！');
  L.rule(/^😆 (?:(\S+): )?TICKLED!$/, (m, who) => `😆 ${who ? who + ' ' : ''}被挠痒痒啦！`);
  L.rule(/^(\S+) SAYS: SPRINKLER STORM!$/, '$1 说：洒水风暴！');
  L.rule(/^(\S+) (ICE CREAM|WATER|JUICE BOX|COOKIE|WATERMELON|BANANA) FROM (.+)!$/, (m, emoji, item, who) => `${emoji} ${who} 给你${TREAT[item]}！`);
  L.rule(/^🏆 (TEDDY|TOMMY) WINS!$/, '🏆 $1 赢啦！');
  L.rule(/^🏆 TEDDY & TOMMY WIN!$/, '🏆 TEDDY 和 TOMMY 赢啦！');
  L.rule(/^(🥇|🥈|🥉|🎈) (.+)$/, '$1 $2');
})();
