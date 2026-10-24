/* TT Garden Worm: the game. Home screen (who plays, the level, a demo game behind the menu), the 3-2-1, the waves
   (through GW.rules' fixed steps), keys and touch, what the rules say happened turned into butterflies, splashes,
   toasts and sounds, the brother's visit and his sprinkler storm, high fives, the wave clears, the win, the results
   with the HI-SCORE table, pause, sound, and window.game for tests.
   Rules: js/rules.js. Drawing: js/world.js. */
(function () {
  'use strict';
  const GW = window.GW, R = GW.rules, Wd = GW.world, S = Kit.sound;
  const { W, H, ZONE_TOP } = R;
  const $ = (id) => document.getElementById(id);
  const HUMANS = ['teddy', 'tommy'];
  const NAMES = { teddy: 'TEDDY', tommy: 'TOMMY' };
  const STORE = 'gardenWormTT.v1';
  const TREATS = [['🍦', 'ICE CREAM'], ['💧', 'WATER'], ['🧃', 'JUICE BOX'], ['🍪', 'COOKIE'], ['🍉', 'WATERMELON'], ['🍌', 'BANANA']];
  // Foxy's and Froggy's scores are on the HI-SCORE table from the start, for the boys to beat
  const FANS = { easy: [['FOXY', '🦊', 3000], ['FROGGY', '🐸', 1500]], normal: [['FOXY', '🦊', 6000], ['FROGGY', '🐸', 3000]] };
  const STORM = 5; // segments the sprinkler storm changes into butterflies
  const MEDALS = ['🥇', '🥈', '🥉', '🎈', '🎈'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const damp = (k, dt) => 1 - Math.exp(-k * dt);
  const ease = (u) => u * u * (3 - 2 * u);

  // ---------------------------------------------------------------- saved settings
  function load() {
    const d = { who: 'teddy', level: 'easy', best: { easy: {}, normal: {} } };
    try {
      const s = JSON.parse(localStorage.getItem(STORE) || '{}');
      if (['teddy', 'tommy', 'both'].includes(s.who)) d.who = s.who;
      if (['easy', 'normal'].includes(s.level)) d.level = s.level;
      if (s.best && typeof s.best === 'object') for (const l of ['easy', 'normal']) if (s.best[l]) d.best[l] = s.best[l];
    } catch (e) { /* first visit, or storage blocked */ }
    return d;
  }
  const save = load();
  function store() {
    try { localStorage.setItem(STORE, JSON.stringify(save)); } catch (e) { /* private window */ }
  }

  // ---------------------------------------------------------------- sounds of our own (Kit.sound.tone / hiss)
  const SFX = {
    squirt() { S.hiss({ filter: 'bandpass', f: 3000, to: 1400, q: 1.5, dur: 0.09, vol: 0.05 }); },
    splat() { S.tone({ type: 'sine', f: 320, to: 170, dur: 0.09, vol: 0.08 }); },
    wash() { [520, 700, 940].forEach((f, i) => S.tone({ type: 'sine', f, to: f * 1.3, dur: 0.08, vol: 0.08, at: i * 0.05 })); },
    flutter() { S.tone({ type: 'triangle', f: 990, to: 1480, dur: 0.14, vol: 0.08 }); S.tone({ type: 'triangle', f: 1320, to: 1760, dur: 0.12, vol: 0.06, at: 0.07 }); },
    giggle(low) {
      const b = low ? 430 : 760;
      for (let i = 0; i < 4; i++) S.tone({ type: 'triangle', f: b + (i % 2) * 130, to: b + (i % 2) * 130 - 70, dur: 0.07, vol: 0.06, at: i * 0.1 });
    },
    soak() { S.tone({ type: 'sine', f: 380, to: 1000, dur: 0.3, vol: 0.1 }); S.hiss({ filter: 'lowpass', f: 1200, to: 400, dur: 0.25, vol: 0.05 }); },
    boing() { S.tone({ type: 'sine', f: 180, to: 520, dur: 0.16, vol: 0.07 }); },
    buzz() { S.tone({ type: 'sawtooth', f: 240, to: 200, dur: 0.25, vol: 0.03, lp: 900 }); },
    slurp() { S.tone({ type: 'sine', f: 700, to: 220, dur: 0.22, vol: 0.06 }); },
    munch() { S.hiss({ filter: 'lowpass', f: 700, to: 300, dur: 0.1, vol: 0.06 }); },
    sticky() { S.tone({ type: 'sine', f: 260, to: 520, dur: 0.12, vol: 0.05 }); },
    tick() { S.tone({ type: 'square', f: 520, dur: 0.08, vol: 0.06 }); },
    go() { S.tone({ type: 'square', f: 780, dur: 0.18, vol: 0.07 }); },
    yay() { [523, 659, 784, 1047].forEach((f, i) => S.tone({ type: 'triangle', f, dur: 0.22, vol: 0.12, at: i * 0.11 })); },
    hi5() { S.tone({ type: 'square', f: 660, dur: 0.07, vol: 0.06 }); S.tone({ type: 'square', f: 990, dur: 0.12, vol: 0.06, at: 0.07 }); },
    sprinkle() { S.hiss({ filter: 'bandpass', f: 2600, to: 1800, q: 1, dur: 1.6, vol: 0.05 }); },
  };

  // ---------------------------------------------------------------- state
  let portraits = {};
  let mode = 'title'; // title, count, play, won, over, results
  let paused = false, demo = true, auto = false;
  let g = null, people = [], humans = [];
  let countT = 0, countShown = 0, endT = 0, rainT = 0;
  let buddy = null, hfT = 0, hfSprite = null, treatSprite = null, results = null, calls = 0;
  const held = new Set();
  const touches = new Map(); // pointerId -> { i, lx, ly, to }
  const bugs = { mirror: false, stuck: false }; // for the keys check's fail run (game.sabotage)

  // ---------------------------------------------------------------- toasts and the count
  function toast(text, cls) {
    if (demo) return;
    const box = $('toasts');
    while (box.children.length > 2) box.firstChild.remove();
    const d = document.createElement('div');
    d.className = 'toast' + (cls ? ' ' + cls : '');
    d.textContent = text;
    box.appendChild(d);
    setTimeout(() => d.remove(), 1700);
  }
  function clearToasts() {
    $('toasts').innerHTML = '';
  }
  function showCount(text, go) {
    const c = $('count');
    c.textContent = text;
    c.className = '';
    void c.offsetWidth;
    c.className = go ? 'go' : 'tick';
  }

  // ---------------------------------------------------------------- a new game
  function setup(isDemo, seed) {
    demo = isDemo;
    humans = save.who === 'both' ? HUMANS.slice() : [save.who];
    g = R.create({ level: save.level, players: humans.length, seed: seed || 1 + Math.floor(Math.random() * 1e9), bugs: bugs.stuck ? { stuck: true } : {} });
    for (const pp of people) Wd.scene.remove(pp.root);
    people = humans.map((id) => {
      const pp = Wd.makePerson(id, { tag: humans.length === 2 });
      Wd.scene.add(pp.root);
      return pp;
    });
    removeBuddy();
    Wd.clearEffects();
    touches.clear();
    held.clear();
    hfT = 0;
    rainT = 0;
    if (hfSprite) hfSprite.visible = false;
    refreshHud();
  }
  function play(seed) {
    S.init();
    setup(false, seed);
    clearToasts();
    mode = 'count';
    countT = 2.6;
    countShown = 4;
    paused = false;
    results = null;
    $('title').classList.add('hidden');
    $('over').classList.add('hidden');
    $('pause').classList.add('hidden');
    $('hud').classList.remove('hidden');
    document.body.classList.add('counting');
    $('tapHint').textContent = matchMedia('(hover: none) and (pointer: coarse)').matches ? 'SLIDE TO RUN · HOLD TO SQUIRT!' : humans.length === 2 ? 'TEDDY: WASD + SPACE · TOMMY: ARROWS + ENTER' : 'ARROWS MOVE · SPACE SQUIRTS!';
    S.music('title');
  }
  function home() {
    paused = false;
    clearToasts();
    mode = 'title';
    results = null;
    $('pause').classList.add('hidden');
    $('over').classList.add('hidden');
    $('hud').classList.add('hidden');
    $('title').classList.remove('hidden');
    document.body.classList.remove('counting');
    refreshTitle();
    setup(true);
    S.music('title');
  }

  // ---------------------------------------------------------------- input
  const KEYS0 = { l: ['KeyA'], r: ['KeyD'], u: ['KeyW'], d: ['KeyS'], fire: ['Space'] };
  const KEYS1 = { l: ['ArrowLeft'], r: ['ArrowRight'], u: ['ArrowUp'], d: ['ArrowDown'], fire: ['Enter', 'NumpadEnter'] };
  const GAME_KEYS = new Set([].concat(...Object.values(KEYS0), ...Object.values(KEYS1)));
  function keysFor(i) {
    const sets = humans.length === 1 ? [KEYS0, KEYS1] : [i === 0 ? KEYS0 : KEYS1];
    const o = {};
    for (const k of ['l', 'r', 'u', 'd', 'fire']) o[k] = sets.some((s) => s[k].some((c) => held.has(c)));
    if (bugs.mirror) { const l = o.l; o.l = o.r; o.r = l; }
    return o;
  }
  function input(i, gm) {
    if (demo || auto) return R.bot(gm, i);
    const o = keysFor(i);
    for (const t of touches.values()) if (t.i === i) { o.to = t.to; o.fire = true; }
    return o;
  }

  function onKey(e) {
    const c = e.code;
    if (e.repeat && !GAME_KEYS.has(c)) return;
    S.init();
    if (c === 'KeyM') {
      S.toggleMute();
      return;
    }
    if (mode === 'title') {
      if (c === 'ArrowLeft' || c === 'ArrowRight' || c === 'KeyA' || c === 'KeyD') {
        const all = ['teddy', 'tommy', 'both'];
        pickWho(all[(all.indexOf(save.who) + (c === 'ArrowLeft' || c === 'KeyA' ? 2 : 1)) % 3]);
      } else if (c === 'Digit1' || c === 'Digit2' || c === 'Digit3') pickWho(['teddy', 'tommy', 'both'][+c.slice(-1) - 1]);
      else if (c === 'ArrowUp' || c === 'ArrowDown' || c === 'KeyW' || c === 'KeyS') toggleLevel();
      else if (c === 'Enter' || c === 'Space' || c === 'NumpadEnter') play();
      else return;
      e.preventDefault();
      return;
    }
    if (mode === 'results') {
      if (c === 'Enter' || c === 'Space' || c === 'NumpadEnter') play();
      else if (c === 'Escape' || c === 'KeyH') home();
      else return;
      e.preventDefault();
      return;
    }
    if (c === 'KeyP' || c === 'Escape') {
      if (mode === 'count' || mode === 'play') togglePause();
      e.preventDefault();
      return;
    }
    if (paused) {
      if (c === 'Space' || c === 'Enter') togglePause();
      e.preventDefault();
      return;
    }
    if (c === 'KeyT') {
      if (humans.length === 2) highFive(); else callBuddy();
      e.preventDefault();
      return;
    }
    if (GAME_KEYS.has(c)) {
      held.add(c);
      e.preventDefault();
    }
  }
  function onKeyUp(e) {
    held.delete(e.code);
  }
  function onPointerDown(e) {
    S.init();
    if ((mode !== 'count' && mode !== 'play') || paused) return;
    const i = humans.length === 2 && e.clientX > window.innerWidth / 2 ? 1 : 0;
    const p = g.players[i];
    touches.set(e.pointerId, { i, lx: e.clientX, ly: e.clientY, to: { x: p.x, y: p.y } });
    try { e.target.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
    e.preventDefault();
  }
  // a finger slides the squirter: one cell of finger travel on screen is one cell in the garden
  function onPointerMove(e) {
    const t = touches.get(e.pointerId);
    if (!t) return;
    const c = Wd.cellPx(t.to.x, t.to.y);
    t.to.x = clamp(t.to.x + (e.clientX - t.lx) / c.x, 0, W - 1);
    t.to.y = clamp(t.to.y + (e.clientY - t.ly) / c.y, ZONE_TOP, H - 1);
    t.lx = e.clientX;
    t.ly = e.clientY;
  }
  function onPointerUp(e) {
    touches.delete(e.pointerId);
  }

  // ---------------------------------------------------------------- the home screen
  function pickWho(w) {
    save.who = w;
    store();
    refreshTitle();
    setup(true);
  }
  function toggleLevel() {
    save.level = save.level === 'easy' ? 'normal' : 'easy';
    store();
    refreshTitle();
    setup(true);
  }
  function table(level) {
    const rows = FANS[level].map(([n, e, s]) => ({ id: n.toLowerCase(), name: `${n} ${e}`, score: s }));
    for (const id of ['teddy', 'tommy', 'both']) {
      const s = save.best[level][id];
      if (s) rows.push({ id, name: id === 'both' ? 'TEDDY & TOMMY' : NAMES[id], score: s });
    }
    return rows.sort((a, b) => b.score - a.score);
  }
  function refreshTitle() {
    document.querySelectorAll('.who').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.who === save.who)));
    const lv = save.level;
    $('lvlBtn').className = 'lvl ' + lv;
    $('lvlIcon').textContent = lv === 'easy' ? '🐣' : '🔥';
    $('lvlName').textContent = lv === 'easy' ? 'EASY' : 'NORMAL';
    document.querySelectorAll('[data-best]').forEach((s) => {
      const n = save.best[lv][s.dataset.best] || 0;
      s.textContent = n ? `BEST ${n}` : lv === 'easy' ? '🐣 EASY' : '🔥 NORMAL';
    });
    const top = table(lv)[0];
    $('hiLine').innerHTML = '';
    $('hiLine').append('HI-SCORE ', Object.assign(document.createElement('b'), { textContent: String(top.score) }), ` · ${top.name}`);
    $('buddyKeyName').textContent = save.who === 'both' ? 'a high five' : Kit.roster.buddyFor(save.who) === 'tommy' ? 'Tommy' : 'Teddy';
  }

  // ---------------------------------------------------------------- the HUD
  const shown = { score: -1, hi: -1, wave: '', hearts: '' };
  function refreshHud() {
    const bb = $('buddyBtn');
    if (humans.length === 2) {
      $('buddyFace').style.display = 'none';
      $('hiFive').style.display = '';
      $('buddyName').textContent = 'HIGH FIVE';
      bb.title = 'High five (T)';
    } else {
      const id = Kit.roster.buddyFor(humans[0]);
      $('buddyFace').style.display = '';
      $('buddyFace').src = portraits[id] || '';
      $('hiFive').style.display = 'none';
      $('buddyName').textContent = NAMES[id];
      bb.title = 'Call your brother (T)';
    }
    shown.score = shown.hi = -1;
    shown.wave = shown.hearts = '';
  }
  function updateHud() {
    if (!g) return;
    if (shown.score !== g.score) {
      const el = $('scorePill');
      if (shown.score >= 0 && g.score > shown.score) {
        el.classList.remove('bump');
        void el.offsetWidth;
        el.classList.add('bump');
      }
      shown.score = g.score;
      $('score').textContent = String(g.score);
    }
    const hi = Math.max(table(save.level)[0].score, g.score);
    if (shown.hi !== hi) $('hi').textContent = String((shown.hi = hi));
    const wv = `${g.wave}/${g.waves}`;
    if (shown.wave !== wv) $('wave').textContent = shown.wave = wv;
    const hearts = '❤️'.repeat(g.lives) + '🤍'.repeat(Math.max(0, g.maxLives - g.lives));
    if (shown.hearts !== hearts) $('hearts').textContent = shown.hearts = hearts;
    $('buddyBtn').classList.toggle('on', !!buddy);
    $('buddyBtn').style.visibility = mode === 'play' || mode === 'count' ? '' : 'hidden';
  }

  // ---------------------------------------------------------------- the brother's visit (1 player)
  function removeBuddy() {
    if (buddy) Wd.scene.remove(buddy.model.root);
    buddy = null;
    if (treatSprite) { Wd.scene.remove(treatSprite); treatSprite = null; }
  }
  function callBuddy() {
    if (demo || humans.length !== 1 || (mode !== 'play' && mode !== 'count')) return;
    calls++;
    if (!buddy) {
      const id = Kit.roster.buddyFor(humans[0]), entry = Kit.roster.get(id);
      const model = Wd.makePerson(id, { scale: entry.buddyScale });
      model.set('hello');
      model.root.scale.setScalar(0.01);
      Wd.scene.add(model.root);
      const me = g.players[0];
      buddy = { id, entry, model, phase: 'pop', t: 0, x: me.x, y: me.y, sent: 0, aimed: new Set() };
    } else if (buddy.phase !== 'pop') {
      // called again while he's here: he does it all again, treat and sprinkler storm too
      buddy.phase = 'hello';
      buddy.t = 0;
      buddy.model.set('hello');
    }
    S.powerup();
  }
  function findSeg(id) {
    for (const c of g.chains) for (const s of c.segs) if (s.id === id) return s;
    return null;
  }
  function updateBuddy(dt) {
    if (!buddy) return;
    const b = buddy, me = g.players[0], m = b.model;
    b.t += dt;
    // he stands beside you, on the side with more room
    const side = me.x < (W - 1) / 2 ? 1 : -1;
    const tx = clamp(me.x + side * 1.4, 0, W - 1), ty = clamp(me.y, ZONE_TOP, H - 1);
    b.x += (tx - b.x) * damp(5, dt);
    b.y += (ty - b.y) * damp(5, dt);
    let sc = 1;
    if (b.phase === 'pop') {
      sc = ease(Math.min(1, b.t / 0.35));
      if (b.t >= 0.35) {
        b.phase = 'hello';
        b.t = 0;
        Wd.sparkle(b.x, b.y, 14);
      }
    } else if (b.phase === 'hello') {
      if (b.t >= 1.7) {
        b.phase = 'treat';
        b.t = 0;
        const [emoji, item] = TREATS[Math.floor(Math.random() * TREATS.length)];
        treatSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: Kit.gfx.emojiTexture(emoji), depthWrite: false }));
        treatSprite.scale.setScalar(0.7);
        Wd.scene.add(treatSprite);
        m.set('give', side > 0 ? Math.PI / 2 : -Math.PI / 2);
        toast(`${emoji} ${item} FROM ${NAMES[b.id]}!`, 'good');
        S.swish();
      }
    } else if (b.phase === 'treat') {
      const u = Math.min(1, b.t / 0.6);
      if (treatSprite) treatSprite.position.set(Wd.X(b.x + (me.x - b.x) * u), 1.4 + Math.sin(Math.PI * u) * 1.4, Wd.Z(b.y + (me.y - b.y) * u));
      if (u >= 1) {
        if (treatSprite) { Wd.scene.remove(treatSprite); treatSprite = null; }
        if (R.treat(g)) toast('❤️ +1', 'pink');
        S.coin(6);
        b.phase = 'storm';
        b.t = 0;
        b.sent = 0;
        b.aimed.clear();
        m.set('hello');
        toast(`${NAMES[b.id]} SAYS: SPRINKLER STORM!`, 'water');
        SFX.sprinkle();
        rainT = 2.4;
      }
    } else if (b.phase === 'storm') {
      // the sprinkler: 5 arcs of water, one after another, each at the segment nearest you
      while (b.sent < STORM && b.t >= b.sent * 0.26) {
        b.sent++;
        const s = R.sprinkleTarget(g, b.aimed);
        if (!s) continue;
        const id = s.id;
        b.aimed.add(id);
        let last = R.pos(g, s);
        Wd.arc(b.x, b.y, () => {
          const q = findSeg(id);
          if (q) last = R.pos(g, q);
          return last;
        }, 0.42, () => {
          if (g && mode === 'play') {
            R.sprinkleOne(g, id);
            handleEvents();
          }
        });
      }
      if (b.t > STORM * 0.26 + 0.7) {
        b.phase = 'bye';
        b.t = 0;
        m.set('wave');
      }
    } else if (b.phase === 'bye') {
      sc = b.t < 1.0 ? 1 : Math.max(0, 1 - (b.t - 1.0) / 0.3);
      if (b.t > 1.3) {
        Wd.sparkle(b.x, b.y, 10);
        removeBuddy();
        return;
      }
    }
    m.root.scale.setScalar(Math.max(0.01, sc));
    Wd.placePerson(m, b.x, b.y);
    m.update(dt, {});
  }

  // ---------------------------------------------------------------- high five (2 players)
  function highFive() {
    if (demo || humans.length !== 2 || (mode !== 'play' && mode !== 'count') || hfT > 0) return;
    hfT = 1.0;
    calls++;
    if (!hfSprite) {
      hfSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: Kit.gfx.emojiTexture('✋'), depthWrite: false }));
      Wd.scene.add(hfSprite);
    }
    hfSprite.visible = true;
    toast('✋ HIGH FIVE!', 'good');
    SFX.hi5();
    const a = g.players[0], b = g.players[1];
    Wd.sparkle((a.x + b.x) / 2, (a.y + b.y) / 2, 14);
  }
  function updateHighFive(dt) {
    if (hfT <= 0) return;
    hfT -= dt;
    const a = g.players[0], b = g.players[1];
    if (hfSprite) {
      hfSprite.position.set(Wd.X((a.x + b.x) / 2), 2.1, Wd.Z((a.y + b.y) / 2));
      hfSprite.scale.setScalar(0.8 + Math.sin(Math.min(1, (1 - hfT) * 3) * Math.PI) * 0.35);
    }
    if (hfT <= 0 && hfSprite) hfSprite.visible = false;
  }

  // ---------------------------------------------------------------- what the rules said happened
  function handleEvents() {
    const quiet = demo;
    for (const ev of g.events) {
      switch (ev.type) {
        case 'squirt':
          if (!quiet) SFX.squirt();
          break;
        case 'butterfly':
          Wd.butterfly(ev.x, ev.y, ev.head);
          Wd.points(ev.x, ev.y, '+' + ev.points, ev.head ? '#ffd400' : '#ffffff');
          if (!quiet) { SFX.flutter(); if (ev.head) SFX.giggle(); }
          break;
        case 'splash':
          Wd.splash(ev.x, ev.y, 6);
          if (!quiet) SFX.splat();
          break;
        case 'washed':
          Wd.splash(ev.x, ev.y, 18);
          Wd.points(ev.x, ev.y, '+' + ev.points, '#bfefff');
          if (!quiet) SFX.wash();
          break;
        case 'soaked':
          Wd.floatAway(ev.what, ev.x, ev.y);
          Wd.points(ev.x, ev.y, '+' + ev.points, '#7dffa8');
          if (!quiet) SFX.soak();
          toast(`💦 ${{ hopper: 'GRASSHOPPER', lady: 'LADYBUG', snail: 'SNAIL' }[ev.what]} SOAKED!`, 'water');
          break;
        case 'flee':
          Wd.floatAway(ev.what, 0, 0);
          break;
        case 'enter':
          if (!quiet) ({ hopper: SFX.boing, lady: SFX.buzz, snail: SFX.slurp })[ev.what]();
          if (ev.what === 'snail') toast('🐌 STICKY SNAIL!', 'pink');
          break;
        case 'sticky':
          Wd.sparkle(ev.x, ev.y, 6);
          if (!quiet) SFX.sticky();
          break;
        case 'nibble':
          Wd.splash(ev.x, ev.y, 8, '#c98a4a');
          if (!quiet) SFX.munch();
          break;
        case 'mushroom':
          if (ev.by === 'lady' && !quiet) SFX.splat();
          break;
        case 'baby':
          toast('🐛 A BABY CATERPILLAR!', 'pink');
          break;
        case 'tickle': {
          Wd.sparkle(ev.x, ev.y, 12);
          if (!quiet) SFX.giggle(true);
          const who = humans.length === 2 ? `${NAMES[humans[ev.i]]}: ` : '';
          toast(`😆 ${who}TICKLED!`, 'pink');
          touches.forEach((t) => { if (t.i === ev.i) { const p = g.players[ev.i]; t.to.x = p.x; t.to.y = p.y; } });
          break;
        }
        case 'wave':
          Wd.cheer(2.4);
          Wd.confetti((W - 1) / 2, ZONE_TOP - 4, 50);
          if (!quiet) SFX.yay();
          toast(`🦋 WAVE CLEAR! +${ev.points}`, 'good');
          break;
        case 'waveStart':
          toast(ev.wave === g.waves ? '🐛 LAST WAVE!' : `🐛 WAVE ${ev.wave}!`);
          break;
        case 'won':
          if (quiet) break;
          mode = 'won';
          endT = 0;
          removeBuddy();
          S.music('over');
          break;
        case 'over':
          if (quiet) break;
          mode = 'over';
          endT = 0;
          removeBuddy();
          S.music('over');
          toast('😆 TICKLED OUT!', 'pink');
          break;
      }
    }
    g.events.length = 0;
  }

  // ---------------------------------------------------------------- results
  function showResults(won) {
    mode = 'results';
    clearToasts();
    $('hud').classList.add('hidden');
    document.body.classList.remove('counting');
    const lv = save.level, who = humans.length === 2 ? 'both' : humans[0];
    const name = humans.length === 2 ? 'TEDDY & TOMMY' : NAMES[who];
    const topBefore = table(lv)[0].score;
    const prev = save.best[lv][who] || 0;
    const best = g.score > prev && g.score > 0;
    if (best) save.best[lv][who] = g.score;
    store();
    const head = $('ovTitle');
    head.textContent = won ? (humans.length === 2 ? '🏆 TEDDY & TOMMY WIN!' : `🏆 ${name} WINS!`) : '😆 TICKLED OUT!';
    head.className = 'head' + (won ? '' : ' out');
    const card = $('ovCard');
    card.innerHTML = '';
    const row = (left, right, me) => {
      const r = document.createElement('div');
      r.className = 'row' + (me ? ' me' : '');
      const a = document.createElement('span');
      a.textContent = left;
      const b = document.createElement('b');
      b.textContent = right;
      r.append(a, b);
      card.appendChild(r);
    };
    row('SCORE', String(g.score), true);
    row('WAVE', `${won ? g.waves : g.wave}/${g.waves}`);
    row('🦋 BUTTERFLIES', String(g.butterflies));
    const sub = document.createElement('div');
    sub.className = 'sub';
    sub.textContent = 'HI-SCORES';
    card.appendChild(sub);
    table(lv).slice(0, 5).forEach((t, k) => row(`${MEDALS[k]} ${t.name}`, String(t.score), t.id === who));
    const flag = $('newBest');
    const top = g.score > topBefore;
    flag.textContent = top ? '★ NEW HI-SCORE! ★' : '★ NEW BEST! ★';
    flag.classList.toggle('on', best);
    $('over').classList.remove('hidden');
    results = { won, score: g.score, wave: g.wave, butterflies: g.butterflies, best, top, title: head.textContent };
  }

  // ---------------------------------------------------------------- pause
  function togglePause() {
    if (mode !== 'count' && mode !== 'play') return;
    paused = !paused;
    $('pause').classList.toggle('hidden', !paused);
    touches.clear();
    held.clear();
    S.music(paused ? 'pause' : 'play');
  }

  // ---------------------------------------------------------------- every frame
  // where the garden may go: clear of the score, the buttons and the brother's face
  function safe() {
    const w = window.innerWidth, h = window.innerHeight;
    if (h < 500) return { top: 8, bottom: 8, left: 76, right: 150 };
    if (w < 600) return { top: 118, bottom: 96, left: 6, right: 6 };
    return { top: 74, bottom: 12, left: 100, right: 100 };
  }
  function peopleModes() {
    people.forEach((pp, i) => {
      if (mode === 'won' || (mode === 'results' && results && results.won)) pp.set('celebrate');
      else if (g.phase === 'clear') pp.set('hello');
      else if (hfT > 0) pp.set('give', g.players[i].x <= g.players[1 - i].x ? -Math.PI / 2 : Math.PI / 2);
      else pp.set('play');
    });
  }
  function update(dt) {
    if (!g) return;
    if (!paused) {
      if (mode === 'count') {
        countT -= dt;
        const n = Math.ceil(countT - 0.2);
        if (n < countShown && n >= 1) {
          countShown = n;
          showCount(String(n));
          SFX.tick();
        }
        if (countT <= 0.2) {
          mode = 'play';
          showCount('GO!', true);
          document.body.classList.remove('counting');
          S.music('play');
          SFX.go();
        }
      }
      if (mode === 'title' || mode === 'play') {
        R.step(g, dt, input);
        handleEvents();
        if (mode === 'title' && (g.phase === 'won' || g.phase === 'over')) setup(true);
      }
      if (mode === 'play') {
        updateBuddy(dt);
        updateHighFive(dt);
      }
      if (mode === 'won') {
        endT += dt;
        for (const at of [0.2, 0.9, 1.6, 2.6]) if (endT >= at && endT - dt < at) {
          const p = g.players[Math.floor(Math.random() * g.players.length)];
          Wd.confetti(p.x, p.y - 1.5, 70);
          if (at === 0.2) SFX.yay();
        }
        if (endT > 5.4) showResults(true);
      }
      if (mode === 'over') {
        endT += dt;
        if (endT > 2.6) showResults(false);
      }
      rainT = Math.max(0, rainT - dt);
    }
    const fdt = paused ? 0 : dt;
    peopleModes();
    // the win: the squirters line up in the middle of the strip, side by side, for their moves
    const cel = mode === 'won' || (mode === 'results' && results && results.won);
    g.players.forEach((p, i) => {
      const pp = people[i];
      if (cel) {
        const tx = (W - 1) / 2 + (g.players.length === 2 ? (i ? 1.4 : -1.4) : 0), ty = H - 2.5;
        pp.cx += (tx - pp.cx) * damp(3, fdt);
        pp.cy += (ty - pp.cy) * damp(3, fdt);
      } else {
        pp.cx = p.x;
        pp.cy = p.y;
      }
      Wd.placePerson(pp, pp.cx, pp.cy);
      pp.update(fdt, { moving: p.moving, stun: mode === 'over' ? Math.max(p.stun, 0.5) : p.stun, safe: p.safe, firing: !!p.shot });
    });
    Wd.fit(safe());
    Wd.sync(g, fdt, { rain: rainT > 0 });
    if (mode === 'play' || mode === 'count' || mode === 'won' || mode === 'over') updateHud();
  }

  // ---------------------------------------------------------------- start-up
  let last = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = last ? Math.min(0.1, Math.max(0, (now - last) / 1000)) : 1 / 60;
    last = now;
    update(dt);
    Wd.render();
  }
  function resize() {
    Wd.resize(window.innerWidth, window.innerHeight);
  }
  function syncMute() {
    const m = S.isMuted();
    for (const id of ['muteBtn', 'muteTitle']) $(id).textContent = m ? '🔇' : '🔊';
  }
  function init() {
    // the logo from the name in js/title.js: the last word big, the words before it small on top
    const words = window.GW_TITLE.split(' ');
    $('logo1').textContent = words.slice(0, -1).join(' ');
    $('logo2').textContent = words[words.length - 1];
    $('logo').setAttribute('aria-label', window.GW_TITLE);
    Wd.init($('game'));
    resize();
    window.addEventListener('resize', resize);
    portraits = Kit.portraits(HUMANS.map((id) => Kit.roster.get(id)), { size: 128 });
    document.querySelectorAll('[data-face]').forEach((img) => { img.src = portraits[img.dataset.face]; });
    document.querySelectorAll('.who').forEach((b) => b.addEventListener('click', () => { S.init(); pickWho(b.dataset.who); }));
    $('lvlBtn').addEventListener('click', () => { S.init(); toggleLevel(); });
    $('playBtn').addEventListener('click', () => play());
    $('againBtn').addEventListener('click', () => play());
    $('homeBtn').addEventListener('click', home);
    $('homeBtn2').addEventListener('click', home);
    $('resumeBtn').addEventListener('click', togglePause);
    $('pauseBtn').addEventListener('click', togglePause);
    for (const id of ['muteBtn', 'muteTitle']) $(id).addEventListener('click', () => { S.init(); S.toggleMute(); });
    S.onMute(syncMute);
    syncMute();
    $('buddyBtn').addEventListener('click', () => { if (humans.length === 2) highFive(); else callBuddy(); });
    // buttons on the HUD never steer
    for (const id of ['pauseBtn', 'muteBtn', 'buddyBtn']) $(id).addEventListener('pointerdown', (e) => e.stopPropagation());
    const touch = $('touch');
    touch.addEventListener('pointerdown', onPointerDown);
    touch.addEventListener('pointermove', onPointerMove);
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) touch.addEventListener(ev, onPointerUp);
    touch.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', () => { touches.clear(); held.clear(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play' && !paused) togglePause(); });
    Kit.lang.onChange(() => refreshTitle());
    refreshTitle();
    setup(true);
    $('loading').remove();
    requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------- for tests
  const sv = new THREE.Vector3();
  function screenOf(i) {
    const pp = people[i];
    if (!pp) return null;
    pp.root.updateMatrixWorld(true);
    sv.setFromMatrixPosition(pp.root.matrixWorld);
    sv.y += 0.7;
    sv.project(Wd.camera);
    return { x: +(((sv.x + 1) / 2) * window.innerWidth).toFixed(1), y: +(((1 - sv.y) / 2) * window.innerHeight).toFixed(1) };
  }
  function info() {
    return {
      mode, paused, demo, level: save.level, who: save.who, wave: g && g.wave, waves: g && g.waves, phase: g && g.phase,
      score: g && g.score, lives: g && g.lives, butterflies: g && g.butterflies, segs: g ? R.allSegs(g).length : 0, chains: g ? g.chains.length : 0,
      mushrooms: g ? g.mush.size : 0, calls, buddy: buddy && buddy.phase, results,
      players: g ? g.players.map((p, i) => ({ x: +p.x.toFixed(3), y: +p.y.toFixed(3), stun: +p.stun.toFixed(2), safe: +p.safe.toFixed(2), screen: screenOf(i) })) : [],
    };
  }
  window.game = {
    // o: { who: 'teddy' | 'tommy' | 'both', level: 'easy' | 'normal', seed }
    start(o) {
      o = o || {};
      if (o.who) save.who = o.who;
      if (o.level) save.level = o.level;
      play(o.seed);
      return info();
    },
    // run the game for this many seconds right now (60 steps a second) and draw it
    step(sec, draw) {
      const n = Math.max(1, Math.round((sec || 0) * 60));
      for (let i = 0; i < n; i++) update(1 / 60);
      if (draw !== false) Wd.render();
      return info();
    },
    info,
    screen: screenOf,
    check(o) { return GW.checks.run(Object.assign({ quick: true }, o)); },
    autopilot(on) { auto = on !== false; return auto; },
    wave(n) { R.goWave(g, n); return info(); },
    tickle(i) { R.tickle(g, g.players[i || 0], 'test'); handleEvents(); return info(); },
    // deliberate mistakes for the keys check's fail run: 'mirror' swaps ← and →, 'stuck' never ends a tickle
    sabotage(name, on) {
      bugs[name] = on !== false;
      if (g && name === 'stuck') g.bugs.stuck = bugs.stuck;
      return Object.assign({}, bugs);
    },
    call: () => callBuddy(),
    highFive: () => highFive(),
    pause: () => togglePause(),
    home: () => home(),
    again: () => play(),
    get state() { return g; },
    get save() { return save; },
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
