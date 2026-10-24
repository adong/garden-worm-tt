/* The real-key play check: node tools/keys.js runs this in the real page (muted) and prints { ok, checks }.
   It plays the way a kid does: real keydown / keyup events on window, and touch pointer events on the screen, never
   game.step or the autopilot for the moving. Where the boy went is read off the screen: his model's place projected
   with the game's own camera, so "→ moves right" means right on the screen. Waits are in real frames and in the
   game's own clock, not milliseconds: the headless test browser draws only a few frames a second.
   - directions: on 🐣 EASY (3 waves) and 🔥 NORMAL (4 waves), as Teddy and as Tommy, on every wave: → ← ↑ ↓ and
     D A W S each move him that way on screen, and Space and Enter squirt
   - twoPlayers: W A S D + Space move and squirt Teddy only, the arrows + Enter Tommy only
   - touch: a finger sliding right / left / up / down moves him that way, about as far as the finger went; with two
     players the left half steers Teddy and the right half Tommy
   - unstuck: a tickle stops him for its giggle and then a held key moves him again; pause, blur and the ? panel
     never leave a key stuck down; a ring of mushrooms never boxes him in; he moves while his brother visits
   fail = true (node tools/keys.js --fail) plants two mistakes first: ← and → swapped, and a tickle that never ends. */
async function (fail) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const NAMES = { Space: ' ', Enter: 'Enter', KeyA: 'a', KeyD: 'd', KeyW: 'w', KeyS: 's', KeyT: 't', KeyP: 'p' };
  const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, key: NAMES[code] || code, bubbles: true, cancelable: true }));
  const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
  async function frames(n) { for (let i = 0; i < n; i++) await frame(); }
  // until the game's own clock has run this long
  async function clock(sec) {
    const t0 = game.state.t;
    for (let i = 0; i < 3000 && game.state.t - t0 < sec; i++) await frame();
  }
  const press = async (code, sec) => { key('keydown', code); if (sec) await clock(sec); else await frames(2); key('keyup', code); await frames(1); };
  const checks = [];
  const add = (name, bad, n, what) => checks.push({ name, ok: bad.length === 0, detail: `${n - bad.length}/${n} ${what}`, problems: bad.slice(0, 6) });
  if (fail) { game.sabotage('mirror'); game.sabotage('stuck'); }

  const st = () => game.state;
  // nobody gets tickled while we measure, and no critters wander in
  function calm() {
    const g = st();
    for (const p of g.players) p.safe = 1e9;
    g.hopperT = g.ladyT = g.snailT = 1e9;
  }
  async function begin(o) {
    game.start(o);
    for (let i = 0; i < 3000 && game.info().mode !== 'play'; i++) await frame(); // the 3-2-1
    calm();
  }
  async function park(i, x, y) {
    const p = st().players[i];
    p.x = x;
    p.y = y;
    await frames(2);
  }
  const scr = (i) => game.screen(i);
  // hold a key, let go, and see where everyone went on screen
  async function move(code, ms) {
    const n = st().players.length, a = [];
    for (let i = 0; i < n; i++) a.push(scr(i));
    await press(code, ms || 0.26);
    await frames(2);
    return a.map((p, i) => { const b = scr(i); return { dx: b.x - p.x, dy: b.y - p.y }; });
  }
  const DIR = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] };
  const went = (dir, m) => {
    const [sx, sy] = DIR[dir];
    if (sx) return m.dx * sx > 25 && Math.abs(m.dy) < Math.abs(m.dx) * 0.5;
    return m.dy * sy > 12 && Math.abs(m.dx) < Math.abs(m.dy) * 0.5;
  };
  const still = (m) => Math.abs(m.dx) < 3 && Math.abs(m.dy) < 3;
  const fmt = (m) => `${m.dx.toFixed(0)},${m.dy.toFixed(0)} px`;
  async function squirts(i, code) {
    // (one squirt at a time each: wait for the last one to land)
    for (let k = 0; k < 300 && st().players.some((p) => p.shot); k++) await frame();
    const before = st().players.map((p) => p.shots);
    await press(code);
    return st().players.map((p, k) => p.shots - before[k]);
  }

  // ---------------------------------------------------------------- directions, every wave, both levels, both boys
  {
    const bad = [];
    let n = 0;
    const KEYS = [['right', 'ArrowRight'], ['left', 'ArrowLeft'], ['up', 'ArrowUp'], ['down', 'ArrowDown'], ['right', 'KeyD'], ['left', 'KeyA'], ['up', 'KeyW'], ['down', 'KeyS']];
    for (const level of ['easy', 'normal']) for (const who of ['teddy', 'tommy']) {
      await begin({ who, level, seed: 3 });
      const waves = game.info().waves;
      for (let w = 1; w <= waves; w++) {
        game.wave(w);
        calm();
        for (const [dir, code] of KEYS) {
          await park(0, 8, 17);
          const [m] = await move(code);
          n++;
          if (!went(dir, m)) bad.push(`${level} ${who} wave ${w}: ${code} moved ${fmt(m)}, want ${dir}`);
        }
        for (const code of ['Space', 'Enter']) {
          await park(0, 8, 17);
          const [s] = await squirts(0, code);
          n++;
          if (!(s > 0)) bad.push(`${level} ${who} wave ${w}: ${code} didn't squirt`);
        }
      }
    }
    add('directions', bad, n, 'key presses did what they show on screen (🐣 3 waves and 🔥 4 waves, Teddy and Tommy, arrows, W A S D, Space, Enter)');
  }

  // ---------------------------------------------------------------- two players: each his own keys
  {
    const bad = [];
    let n = 0;
    await begin({ who: 'both', level: 'normal', seed: 4 });
    for (let w = 1; w <= game.info().waves; w += 3) {
      game.wave(w);
      calm();
      for (const [i, dir, code] of [[0, 'right', 'KeyD'], [0, 'left', 'KeyA'], [0, 'up', 'KeyW'], [0, 'down', 'KeyS'], [1, 'right', 'ArrowRight'], [1, 'left', 'ArrowLeft'], [1, 'up', 'ArrowUp'], [1, 'down', 'ArrowDown']]) {
        await park(0, 4, 17);
        await park(1, 12, 17);
        const m = await move(code);
        n++;
        if (!went(dir, m[i])) bad.push(`wave ${w}: ${code} moved ${i ? 'Tommy' : 'Teddy'} ${fmt(m[i])}, want ${dir}`);
        if (!still(m[1 - i])) bad.push(`wave ${w}: ${code} also moved ${i ? 'Teddy' : 'Tommy'} ${fmt(m[1 - i])}`);
      }
      for (const [i, code] of [[0, 'Space'], [1, 'Enter']]) {
        const s = await squirts(i, code);
        n++;
        if (!(s[i] > 0) || s[1 - i] !== 0) bad.push(`wave ${w}: ${code} squirted ${s.join(' / ')}`);
      }
    }
    add('twoPlayers', bad, n, 'presses moved or squirted only their own boy, the right way');
  }

  // ---------------------------------------------------------------- touch: a sliding finger
  {
    const bad = [];
    let n = 0, id = 10;
    const el = document.getElementById('touch');
    const ev = (type, pid, x, y) => el.dispatchEvent(new PointerEvent(type, { pointerId: pid, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true }));
    async function drag(x, y, dx, dy) {
      const pid = ++id;
      ev('pointerdown', pid, x, y);
      for (let k = 1; k <= 8; k++) {
        await frame();
        ev('pointermove', pid, x + (dx * k) / 8, y + (dy * k) / 8);
      }
      await clock(0.5);
      ev('pointerup', pid, x + dx, y + dy);
      await frames(2);
    }
    async function slide(i, x, y, dx, dy) {
      const a = st().players.map((p, k) => scr(k));
      await drag(x, y, dx, dy);
      return a.map((p, k) => { const b = scr(k); return { dx: b.x - p.x, dy: b.y - p.y }; });
    }
    const near = (got, want) => Math.abs(got - want) <= Math.abs(want) * 0.4 + 6;
    await begin({ who: 'tommy', level: 'easy', seed: 5 });
    const cx = innerWidth / 2, cy = innerHeight * 0.6;
    for (const [dir, dx, dy] of [['right', 150, 0], ['left', -150, 0], ['up', 0, -60], ['down', 0, 60]]) {
      await park(0, 8, 17);
      const [m] = await slide(0, cx, cy, dx, dy);
      n++;
      if (!went(dir, m) || !near(dx ? m.dx : m.dy, dx || dy)) bad.push(`1 player: finger ${dir} ${dx || dy} px moved him ${fmt(m)}`);
    }
    await begin({ who: 'both', level: 'easy', seed: 5 });
    for (const [i, x, dir, dx] of [[0, innerWidth * 0.25, 'right', 120], [0, innerWidth * 0.25, 'left', -120], [1, innerWidth * 0.75, 'left', -120], [1, innerWidth * 0.75, 'right', 120]]) {
      await park(0, 5, 17);
      await park(1, 11, 17);
      const m = await slide(i, x, cy, dx, 0);
      n++;
      if (!went(dir, m[i]) || !still(m[1 - i])) bad.push(`2 players: ${i ? 'right' : 'left'} half ${dir}: Teddy ${fmt(m[0])}, Tommy ${fmt(m[1])}`);
    }
    add('touch', bad, n, 'finger slides moved the right boy the way the finger went, about as far');
  }

  // ---------------------------------------------------------------- nothing leaves him stuck
  {
    const bad = [];
    let n = 0;
    await begin({ who: 'teddy', level: 'easy', seed: 6 });
    // a tickle: he giggles (can't move), then a held key moves him again
    await park(0, 5, 17);
    st().players[0].safe = 0;
    game.tickle(0);
    st().players[0].safe = 1e9;
    const a = scr(0);
    key('keydown', 'ArrowRight');
    await clock(0.6);
    const b = scr(0);
    await clock(1.0);
    const c = scr(0);
    key('keyup', 'ArrowRight');
    n += 2;
    if (Math.abs(b.x - a.x) > 3) bad.push(`moved ${(b.x - a.x).toFixed(0)} px while giggling`);
    if (!(c.x - b.x > 40)) bad.push(`a held → moved him only ${(c.x - b.x).toFixed(0)} px in the 1 s after the giggle`);
    // pause with a key held: after pausing and playing on, he isn't still running
    await park(0, 3, 17);
    key('keydown', 'ArrowRight');
    await clock(0.15);
    await press('KeyP');
    await frames(3);
    await press('KeyP');
    await frames(2);
    let p0 = scr(0);
    await clock(0.4);
    let p1 = scr(0);
    key('keyup', 'ArrowRight');
    n++;
    if (!still({ dx: p1.x - p0.x, dy: p1.y - p0.y })) bad.push(`after a pause he kept running by himself (${(p1.x - p0.x).toFixed(0)} px)`);
    // the window loses focus with a key held
    await park(0, 12, 17);
    key('keydown', 'ArrowLeft');
    await clock(0.15);
    window.dispatchEvent(new Event('blur'));
    await frames(2);
    p0 = scr(0);
    await clock(0.4);
    p1 = scr(0);
    key('keyup', 'ArrowLeft');
    n++;
    if (!still({ dx: p1.x - p0.x, dy: p1.y - p0.y })) bad.push(`after losing focus he kept running (${(p1.x - p0.x).toFixed(0)} px)`);
    // the ? panel: a key pressed while it's open closes it and never reaches the game; then keys work again
    await park(0, 8, 17);
    Kit.help.open();
    await sleep(150); // (the panel holds frames back while it's open)
    const h0 = scr(0);
    key('keydown', 'ArrowRight');
    await sleep(150);
    key('keyup', 'ArrowRight');
    const closed = !Kit.help.isOpen();
    if (!closed) Kit.help.close();
    await frames(3);
    await clock(0.3);
    const h1 = scr(0);
    let [m2] = await move('ArrowRight');
    let m;
    n += 3;
    if (!closed) bad.push('a key did not close the ? panel');
    if (!still({ dx: h1.x - h0.x, dy: h1.y - h0.y })) bad.push(`the → that closed the ? panel moved him ${(h1.x - h0.x).toFixed(0)} px`);
    if (!went('right', m2)) bad.push(`after the ? panel → moved him ${fmt(m2)}`);
    // a ring of mushrooms all round him: he still gets out every way
    for (const [dir, code] of [['right', 'ArrowRight'], ['left', 'ArrowLeft'], ['up', 'ArrowUp'], ['down', 'ArrowDown']]) {
      await park(0, 8, 17);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) GW.rules.plant(st(), 8 + dx, 17 + dy);
      [m] = await move(code);
      n++;
      if (!went(dir, m)) bad.push(`ringed in by mushrooms, ${code} moved him ${fmt(m)}`);
    }
    // his brother's visit (T): he keeps moving the whole time
    await park(0, 4, 17);
    await press('KeyT');
    let moved = 0, tries = 0;
    for (const [dir, code] of [['right', 'ArrowRight'], ['left', 'ArrowLeft'], ['right', 'KeyD'], ['left', 'KeyA'], ['up', 'ArrowUp'], ['down', 'ArrowDown']]) {
      if (!game.info().buddy) break;
      await park(0, 8, 17);
      [m] = await move(code);
      tries++;
      if (went(dir, m)) moved++;
      else bad.push(`while his brother visited, ${code} moved him ${fmt(m)}`);
    }
    n += tries;
    if (tries < 3) { n++; bad.push(`his brother's visit was over after ${tries} presses (T didn't call him?)`); }
    add('unstuck', bad, n, 'a tickle, pause, lost focus, the ? panel, a ring of mushrooms and his brother\'s visit never left him stuck');
  }

  game.sabotage('mirror', false);
  game.sabotage('stuck', false);
  game.home();
  return { ok: checks.every((c) => c.ok), fail: !!fail, checks };
}
