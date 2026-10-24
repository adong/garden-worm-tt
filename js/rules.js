/* TT Garden Worm: the rules, with no drawing, so node runs them too (tools/check.js).
   The garden is a grid, W columns by H rows, row 0 at the top (far from the camera) and row H-1 at the bottom. The
   squirters run in the bottom strip (the ZONE rows). A caterpillar is a list of round segments, head first; every
   tick the body follows the head one cell, and the head goes sideways until it meets a mushroom or the edge, then
   drops a row and turns round. At the bottom it wanders up and down inside the strip. Squirt a segment: it turns
   into a butterfly, leaves a mushroom where it was, and the caterpillar splits there, each part with its own head.
   Mushrooms take 4 squirts to wash away. A grasshopper hops through the strip (and nibbles mushrooms), a ladybug
   drops new mushrooms when the strip gets bare, and a snail makes mushrooms sticky: a head that bumps a sticky one
   slides straight down to the bottom. Fixed 1/120 s steps, a seeded random, so the same seed plays the same. */
(function () {
  'use strict';
  const GW = (window.GW = window.GW || {});
  const W = 17, H = 20, ZONE = 5, ZONE_TOP = H - ZONE;
  const STEP = 1 / 120;
  const SHOT_SPEED = 30; // cells a second: one squirt at a time each, and it's quick
  const MOVE = 9; // the squirter's top speed, cells a second
  const SNAP = 5; // let go of ← →: he slides to the middle of the nearest column
  const MUSH_HP = 4;
  const STUN = 1.2; // seconds of giggling after a tickle (no moving, no squirting)
  const LEVELS = {
    // 🐣 for Tommy (5): a short, slow caterpillar, 5 lives, a calm grasshopper, no surprise babies
    easy: { len: 8, speed: 4.2, speedUp: 0.5, lives: 5, mush: 18, waves: 3, babies: 0, hopperEvery: [14, 20], hopperSpeed: 2.6, ladyFrom: 2, ladyMin: 2, ladySpeed: 6, snailFrom: 2, snailEvery: [22, 30], safe: 3.2 },
    // 🔥 for Teddy (8): long and quick, 3 lives, babies crawl in from the sides while it's in the strip
    normal: { len: 12, speed: 6.5, speedUp: 0.8, lives: 3, mush: 28, waves: 4, babies: 8, hopperEvery: [7, 11], hopperSpeed: 4, ladyFrom: 1, ladyMin: 4, ladySpeed: 10, snailFrom: 2, snailEvery: [16, 24], safe: 2.6 },
  };
  const POINTS = { body: 10, head: 100, mush: 5, hopper: 300, lady: 200, snail: 500, wave: 500 };

  function rng(seed) {
    let a = seed >>> 0 || 1;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const key = (x, y) => y * W + x;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const inside = (x, y) => x >= 0 && x < W && y >= 0 && y < H;

  // ---------------------------------------------------------------- a new game
  // o: { level: 'easy' | 'normal', players: 1 | 2, seed, bugs } (bugs: deliberate mistakes for the checks' fail variant)
  function create(o) {
    o = o || {};
    const level = o.level === 'normal' ? 'normal' : 'easy';
    const P = LEVELS[level];
    const seed = o.seed || 1;
    const n = o.players === 2 ? 2 : 1;
    const g = {
      level, P, seed, rand: rng(seed), bugs: o.bugs || {},
      // two squirters share the lives, and get two more
      t: 0, acc: 0, wave: 1, waves: P.waves, lives: P.lives + (n === 2 ? 2 : 0), maxLives: P.lives + (n === 2 ? 2 : 0), score: 0, butterflies: 0, washed: 0,
      mush: new Map(), chains: [], players: [], hopper: null, lady: null, snail: null, critterId: 1,
      tickT: 0, interval: 1, phase: 'play', phaseT: 0, events: [], nextId: 1,
      hopperT: span(P.hopperEvery, 0.6), ladyT: 3, snailT: span(P.snailEvery, 0.5), babyT: 0,
    };
    function span(r, k) { return (r[0] + (r[1] - r[0]) * 0.5) * k; }
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? (W - 1) / 2 : i === 0 ? 5 : W - 6;
      g.players.push({ i, x, y: H - 1, shot: null, cool: 0, stun: 0, safe: 0, moving: false, face: 1, shots: 0 });
    }
    plantField(g, P.mush);
    spawnWave(g);
    return g;
  }

  function plant(g, x, y, sticky) {
    if (!inside(x, y)) return null;
    let m = g.mush.get(key(x, y));
    if (!m) {
      m = { x, y, hp: g.bugs.mushHp || MUSH_HP, sticky: !!sticky };
      g.mush.set(key(x, y), m);
    }
    return m;
  }
  const mushAt = (g, x, y) => (inside(x, y) ? g.mush.get(key(x, y)) || null : null);

  // the starting mushroom patch: rows 1 to the top of the strip, never two side by side in a row
  function plantField(g, count) {
    let tries = 0;
    while (g.mush.size < count && tries++ < 5000) {
      const x = Math.floor(g.rand() * W), y = 1 + Math.floor(g.rand() * (ZONE_TOP - 2));
      if (mushAt(g, x, y) || mushAt(g, x - 1, y) || mushAt(g, x + 1, y)) continue;
      plant(g, x, y);
    }
  }

  function speedOf(g) {
    return g.P.speed + g.P.speedUp * (g.wave - 1);
  }
  // a new caterpillar comes in through the hedge at the top, one segment after another
  function spawnWave(g) {
    g.interval = 1 / speedOf(g);
    g.tickT = 0;
    const len = g.P.len;
    const x0 = 3 + Math.floor(g.rand() * (W - 6)), dx = g.rand() < 0.5 ? 1 : -1;
    const segs = [];
    for (let k = 0; k < len; k++) segs.push(seg(g, x0, -1 - k, dx, 1));
    g.chains = [{ id: g.nextId++, segs }];
    g.babyT = 0;
  }
  function seg(g, x, y, dx, dy) {
    return { id: g.nextId++, x, y, px: x, py: y, dx, dy, dive: false };
  }
  // make a caterpillar from a list of cells, head first (the checks use it)
  function chainAt(g, cells, dx, dy) {
    const c = { id: g.nextId++, segs: cells.map(([x, y]) => seg(g, x, y, dx, dy === undefined ? 1 : dy)) };
    g.chains.push(c);
    return c;
  }

  // where a segment is drawn and hit: between the cell it came from and the cell it's in, by how far the tick is
  function pos(g, s) {
    const f = clamp(g.tickT / g.interval, 0, 1);
    return { x: s.px + (s.x - s.px) * f, y: s.py + (s.y - s.py) * f };
  }

  // ---------------------------------------------------------------- the caterpillar moves one cell
  function headNext(g, s) {
    // still coming in: through the hedge at the top, or in from a side
    if (s.y < 0) return { x: s.x, y: s.y + 1, dx: s.dx, dy: 1, dive: false };
    if (s.x < 0 || s.x >= W) return { x: s.x + s.dx, y: s.y, dx: s.dx, dy: s.dy, dive: false };
    // sliding down from a sticky mushroom, all the way to the bottom row
    if (s.dive && s.y < H - 1) return { x: s.x, y: s.y + 1, dx: s.dx, dy: 1, dive: true };
    let dyNow = s.dive ? -1 : s.dy;
    const nx = s.x + s.dx;
    const m = mushAt(g, nx, s.y);
    const edge = nx < 0 || nx >= W;
    if (!edge && (!m || g.bugs.noDrop)) return { x: nx, y: s.y, dx: s.dx, dy: dyNow, dive: false };
    // bumped a mushroom or the edge: drop a row and turn round (at the bottom it heads back up, in the strip)
    if (s.y + dyNow > H - 1) dyNow = -1;
    else if (dyNow < 0 && s.y + dyNow < ZONE_TOP) dyNow = 1;
    const dive = !!(m && m.sticky && s.y < H - 1);
    return { x: s.x, y: s.y + (dive ? 1 : dyNow), dx: -s.dx, dy: dive ? 1 : dyNow, dive };
  }
  function advance(g) {
    for (const c of g.chains) {
      const segs = c.segs;
      for (const s of segs) { s.px = s.x; s.py = s.y; }
      // each body segment takes the place (and the heading) of the one in front
      for (let k = segs.length - 1; k > 0; k--) {
        const a = segs[k - 1], s = segs[k];
        s.x = a.x; s.y = a.y; s.dx = a.dx; s.dy = a.dy; s.dive = a.dive;
      }
      const h = segs[0], was = { x: h.x, y: h.y };
      Object.assign(h, headNext(g, h));
      if (h.y !== was.y && h.y >= 0 && was.y >= 0 && h.x >= 0 && h.x < W) g.events.push({ type: h.dive ? 'slide' : 'drop', chain: c.id, x: h.x, y: h.y });
    }
  }

  // ---------------------------------------------------------------- squirted segments
  // Every segment in hits turns into a butterfly; the caterpillars split at each one. mushroom: leave one where it was.
  function removeSegs(g, hits, mushroom, by) {
    const gone = new Set(hits);
    const out = [];
    for (const c of g.chains) {
      const runs = [];
      let run = null;
      c.segs.forEach((s, k) => {
        if (gone.has(s)) {
          run = null;
          const head = k === 0, at = pos(g, s);
          g.score += head ? POINTS.head : POINTS.body;
          g.butterflies++;
          g.events.push({ type: 'butterfly', id: s.id, x: at.x, y: at.y, head, points: head ? POINTS.head : POINTS.body, by, sprinkler: !mushroom });
          if (mushroom && inside(s.x, s.y) && !mushAt(g, s.x, s.y)) {
            plant(g, s.x, s.y);
            g.events.push({ type: 'mushroom', x: s.x, y: s.y });
          }
          if (g.bugs.split) gone.add(c.segs[k + 1]); // the mistake: the next one is lost too
        } else {
          if (!run) {
            run = { id: k === 0 ? c.id : g.nextId++, segs: [] };
            runs.push(run);
          }
          run.segs.push(s);
        }
      });
      for (const r of runs) {
        // a new head says hello
        if (r.segs[0] !== c.segs[0]) {
          const at = pos(g, r.segs[0]);
          g.events.push({ type: 'newHead', id: r.segs[0].id, x: at.x, y: at.y });
        }
        out.push(r);
      }
    }
    g.chains = out;
  }
  function allSegs(g) {
    const a = [];
    for (const c of g.chains) for (const s of c.segs) a.push(s);
    return a;
  }

  // ---------------------------------------------------------------- squirts
  function shotHit(g, x, y) {
    // a segment (the nearest one below wins), then the critters, then a mushroom in that cell
    let best = null, by = -1e9;
    for (const c of g.chains) for (const s of c.segs) {
      if (s.y < 0 && s.py < 0) continue;
      const p = pos(g, s);
      if (Math.abs(p.x - x) < 0.5 && Math.abs(p.y - y) < 0.5 && p.y > by) { best = s; by = p.y; }
    }
    if (best) return { kind: 'seg', s: best };
    for (const k of ['hopper', 'lady', 'snail']) {
      const c = g[k];
      if (c && !c.soaked && Math.abs(c.x - x) < 0.6 && Math.abs(c.y - y) < 0.6) return { kind: k, c };
    }
    const m = mushAt(g, x, Math.round(y));
    if (m) return { kind: 'mush', m };
    return null;
  }
  function moveShot(g, p, h) {
    const sh = p.shot;
    sh.y -= SHOT_SPEED * h;
    if (sh.y < -0.6) { p.shot = null; return; }
    const hit = shotHit(g, sh.x, sh.y);
    if (!hit) return;
    p.shot = null;
    if (hit.kind === 'seg') removeSegs(g, [hit.s], true, p.i);
    else if (hit.kind === 'mush') {
      const m = hit.m;
      m.hp--;
      if (m.hp <= 0) {
        g.mush.delete(key(m.x, m.y));
        g.score += POINTS.mush;
        g.washed++;
        g.events.push({ type: 'washed', x: m.x, y: m.y, points: POINTS.mush });
      } else g.events.push({ type: 'splash', x: m.x, y: m.y, hp: m.hp });
    } else {
      const c = hit.c;
      c.soaked = true;
      g.score += POINTS[hit.kind];
      g.events.push({ type: 'soaked', what: hit.kind, id: c.id, x: c.x, y: c.y, points: POINTS[hit.kind], by: p.i });
      g[hit.kind] = null;
      rest(g, hit.kind);
    }
  }

  // ---------------------------------------------------------------- the squirters
  // in: { l, r, u, d, fire, to: { x, y } } (to: a touch drag says where to go)
  function movePlayer(g, p, inp, h) {
    p.safe = Math.max(0, p.safe - h);
    if (p.stun > 0) {
      p.stun = g.bugs.stuck ? p.stun : Math.max(0, p.stun - h);
      p.moving = false;
      return;
    }
    inp = inp || {};
    let ix = 0, iy = 0;
    if (inp.to) {
      const dx = inp.to.x - p.x, dy = inp.to.y - p.y, d = Math.hypot(dx, dy), m = Math.min(d, MOVE * 1.5 * h);
      if (d > 1e-6) { p.x += (dx / d) * m; p.y += (dy / d) * m; }
      ix = Math.abs(dx) > 0.05 ? Math.sign(dx) : 0;
      iy = Math.abs(dy) > 0.05 ? Math.sign(dy) : 0;
    } else {
      ix = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
      iy = (inp.d ? 1 : 0) - (inp.u ? 1 : 0);
      p.x += ix * MOVE * h;
      p.y += iy * MOVE * h;
      if (!ix) {
        const d = Math.round(p.x) - p.x;
        p.x += Math.sign(d) * Math.min(Math.abs(d), SNAP * h);
      }
    }
    p.x = clamp(p.x, 0, W - 1);
    p.y = clamp(p.y, ZONE_TOP, H - 1);
    p.moving = !!(ix || iy);
    if (ix) p.face = ix;
    p.cool = Math.max(0, p.cool - h);
    if (inp.fire && !p.shot && p.cool <= 0 && g.phase === 'play') {
      p.shot = { x: clamp(Math.round(p.x), 0, W - 1), y: p.y - 0.5 };
      p.cool = 0.06;
      p.shots++;
      g.events.push({ type: 'squirt', i: p.i });
    }
  }
  function tickle(g, p, by) {
    g.lives = Math.max(0, g.lives - 1);
    p.stun = STUN;
    p.safe = STUN + g.P.safe;
    p.shot = null;
    g.events.push({ type: 'tickle', i: p.i, by, x: p.x, y: p.y });
    if (g.lives <= 0) {
      g.phase = 'over';
      g.events.push({ type: 'over' });
    }
  }
  function touches(g) {
    for (const p of g.players) {
      if (p.safe > 0 || p.stun > 0 || g.phase !== 'play') continue;
      let by = null;
      for (const c of g.chains) for (const s of c.segs) {
        const q = pos(g, s);
        if (Math.hypot(q.x - p.x, q.y - p.y) < 0.72) by = 'worm';
      }
      if (g.hopper && Math.hypot(g.hopper.x - p.x, g.hopper.y - p.y) < 0.8) by = 'hopper';
      if (g.lady && Math.hypot(g.lady.x - p.x, g.lady.y - p.y) < 0.7) by = 'lady';
      if (by) tickle(g, p, by);
    }
  }

  // ---------------------------------------------------------------- the critters
  // how long until the next one comes along, once one has gone
  function rest(g, kind) {
    const P = g.P, R = g.rand;
    if (kind === 'hopper') g.hopperT = P.hopperEvery[0] + R() * (P.hopperEvery[1] - P.hopperEvery[0]);
    else if (kind === 'lady') g.ladyT = 4 + R() * 4;
    else g.snailT = P.snailEvery[0] + R() * (P.snailEvery[1] - P.snailEvery[0]);
  }
  function critters(g, h) {
    const P = g.P, R = g.rand;
    // the grasshopper: in from a side, zig-zag hops across the strip, nibbles mushrooms it lands on
    if (!g.hopper) {
      g.hopperT -= h;
      if (g.hopperT <= 0) {
        const left = R() < 0.5;
        g.hopper = { id: g.critterId++, x: left ? -0.8 : W - 0.2, y: ZONE_TOP - 1 + R() * ZONE, vx: (left ? 1 : -1) * P.hopperSpeed * (0.85 + R() * 0.3), vy: (R() < 0.5 ? -1 : 1) * P.hopperSpeed * 1.3 };
        g.events.push({ type: 'enter', what: 'hopper', id: g.hopper.id });
      }
    } else {
      const c = g.hopper;
      c.x += c.vx * h;
      c.y += c.vy * h;
      if (c.y < ZONE_TOP - 1.5) c.vy = Math.abs(c.vy);
      if (c.y > H - 1) c.vy = -Math.abs(c.vy);
      if (R() < h * 0.7) c.vy = -c.vy;
      const m = mushAt(g, Math.round(c.x), Math.round(c.y));
      if (m && Math.abs(m.x - c.x) < 0.3 && Math.abs(m.y - c.y) < 0.3) {
        g.mush.delete(key(m.x, m.y));
        g.events.push({ type: 'nibble', x: m.x, y: m.y });
      }
      if (c.x < -1 || c.x > W) {
        g.hopper = null;
        rest(g, 'hopper');
      }
    }
    // the ladybug: when the strip is nearly bare, she flies straight down a column, dropping new mushrooms
    if (!g.lady) {
      g.ladyT -= h;
      if (g.ladyT <= 0 && g.wave >= P.ladyFrom) {
        let n = 0;
        for (const m of g.mush.values()) if (m.y >= ZONE_TOP) n++;
        if (n < P.ladyMin) {
          g.lady = { id: g.critterId++, x: Math.floor(R() * W), y: -1, row: -1 };
          g.events.push({ type: 'enter', what: 'lady', id: g.lady.id });
        } else g.ladyT = 1;
      }
    } else {
      const c = g.lady;
      c.y += P.ladySpeed * h;
      const r = Math.floor(c.y);
      if (r !== c.row) {
        c.row = r;
        if (r >= 1 && r < H - 1 && !mushAt(g, c.x, r) && R() < 0.3) {
          plant(g, c.x, r);
          g.events.push({ type: 'mushroom', x: c.x, y: r, by: 'lady' });
        }
      }
      if (c.y > H) {
        g.lady = null;
        rest(g, 'lady');
      }
    }
    // the snail: slowly across a row of the patch, making the mushrooms it crawls over sticky
    if (!g.snail) {
      g.snailT -= h;
      if (g.snailT <= 0 && g.wave >= P.snailFrom) {
        const left = R() < 0.5;
        g.snail = { id: g.critterId++, x: left ? -0.8 : W - 0.2, y: 2 + Math.floor(R() * (ZONE_TOP - 5)), vx: left ? 1.5 : -1.5 };
        g.events.push({ type: 'enter', what: 'snail', id: g.snail.id });
      }
    } else {
      const c = g.snail;
      c.x += c.vx * h;
      const m = mushAt(g, Math.round(c.x), c.y);
      if (m && !m.sticky && Math.abs(m.x - c.x) < 0.3) {
        m.sticky = true;
        g.events.push({ type: 'sticky', x: m.x, y: m.y });
      }
      if (c.x < -1 || c.x > W) {
        g.snail = null;
        rest(g, 'snail');
      }
    }
    // 🔥: while a caterpillar is in the strip, a baby head crawls in from a side every few seconds
    if (P.babies) {
      const low = g.chains.some((c) => c.segs[0].y >= ZONE_TOP);
      if (low) g.babyT += h;
      if (g.babyT >= P.babies) {
        g.babyT = 0;
        if (allSegs(g).length < P.len) {
          const left = R() < 0.5;
          const c = chainAt(g, [[left ? -1 : W, ZONE_TOP + Math.floor(R() * (ZONE - 1))]], left ? 1 : -1, 1);
          g.events.push({ type: 'baby', id: c.segs[0].id });
        }
      }
    }
  }
  function shoo(g) {
    for (const k of ['hopper', 'lady', 'snail']) {
      if (g[k]) {
        g.events.push({ type: 'flee', what: k, id: g[k].id });
        rest(g, k);
      }
      g[k] = null;
    }
  }

  // ---------------------------------------------------------------- one step
  function substep(g, h, input) {
    g.t += h;
    if (g.phase === 'won' || g.phase === 'over') return;
    for (const p of g.players) movePlayer(g, p, input ? input(p.i, g) : null, h);
    if (g.phase === 'clear') {
      g.phaseT -= h;
      if (g.phaseT <= 0) {
        if (g.wave >= g.waves) {
          g.phase = 'won';
          g.events.push({ type: 'won' });
        } else {
          g.wave++;
          spawnWave(g);
          g.phase = 'play';
          g.events.push({ type: 'waveStart', wave: g.wave });
        }
      }
      return;
    }
    for (const p of g.players) if (p.shot) moveShot(g, p, h);
    g.tickT += h;
    while (g.tickT >= g.interval) {
      g.tickT -= g.interval;
      advance(g);
    }
    critters(g, h);
    touches(g);
    if (g.phase === 'play' && g.chains.length === 0 && !g.bugs.noClear) {
      g.phase = 'clear';
      g.phaseT = 2.4;
      g.score += POINTS.wave;
      for (const p of g.players) p.shot = null;
      shoo(g);
      g.events.push({ type: 'wave', wave: g.wave, last: g.wave >= g.waves, points: POINTS.wave });
    }
  }
  function step(g, dt, input) {
    g.acc += Math.min(dt, 0.25);
    while (g.acc >= STEP - 1e-9) {
      g.acc -= STEP;
      substep(g, STEP, input);
    }
  }

  // ---------------------------------------------------------------- the brother's helpers
  // the sprinkler storm: the segment nearest the squirters turns into a butterfly (no mushroom left behind)
  // (id: the segment the water was aimed at, if it's still there)
  function sprinkleOne(g, id) {
    if (g.phase !== 'play') return null;
    let best = null, by = -1e9;
    for (const c of g.chains) c.segs.forEach((s, k) => {
      if (s.y < 0) return;
      const p = pos(g, s), v = p.y + (k === 0 ? 0.01 : 0) + (s.id === id ? 1e6 : 0);
      if (v > by) { best = s; by = v; }
    });
    if (!best) return null;
    const at = pos(g, best);
    removeSegs(g, [best], !!g.bugs.sprinkleMush, -1);
    return at;
  }
  // the segment the sprinkler should aim at: the one nearest the squirters
  // (skip: ids already aimed at)
  function sprinkleTarget(g, skip) {
    let best = null, by = -1e9;
    for (const c of g.chains) c.segs.forEach((s, k) => {
      if (s.y < 0 || (skip && skip.has(s.id))) return;
      const v = pos(g, s).y + (k === 0 ? 0.01 : 0);
      if (v > by) { best = s; by = v; }
    });
    return best;
  }
  // straight to wave n (tests, and the keys check on every wave)
  function goWave(g, n) {
    g.wave = Math.max(1, Math.min(g.waves, n));
    g.phase = 'play';
    shoo(g);
    spawnWave(g);
  }
  // a treat: a life back, if one's been lost
  function treat(g) {
    if (g.lives >= g.maxLives) return false;
    g.lives++;
    return true;
  }

  // ---------------------------------------------------------------- a pretend player (the demo, and the checks)
  // Lines up under the lowest segment (leading it a little), squirts all the time, and steps out of the way of anything
  // in the strip that comes too close.
  function bot(g, i, o) {
    o = o || {};
    const p = g.players[i];
    const threats = [];
    for (const c of g.chains) for (const s of c.segs) {
      const q = pos(g, s);
      if (q.y < ZONE_TOP - 2.5) continue;
      threats.push({ x: q.x, y: q.y, vx: (s.x - s.px) / g.interval, vy: (s.y - s.py) / g.interval });
    }
    if (g.hopper) threats.push({ x: g.hopper.x, y: g.hopper.y, vx: g.hopper.vx, vy: g.hopper.vy, r: 0.3 });
    if (g.lady) threats.push({ x: g.lady.x, y: g.lady.y, vx: 0, vy: g.P.ladySpeed });
    const danger = (x, y) => {
      let d = 99;
      for (const t of threats) {
        for (const look of [0, 0.15, 0.3]) d = Math.min(d, Math.hypot(t.x + t.vx * look - x, t.y + t.vy * look - y) - (t.r || 0));
      }
      return d;
    };
    if (danger(p.x, p.y) < 1.9) {
      let bestIn = null, bestD = -1;
      for (const ix of [-1, 0, 1]) for (const iy of [-1, 0, 1]) {
        const x = clamp(p.x + ix * MOVE * 0.25, 0, W - 1), y = clamp(p.y + iy * MOVE * 0.25, ZONE_TOP, H - 1);
        const d = danger(x, y) + (iy > 0 ? 0.05 : 0);
        if (d > bestD) { bestD = d; bestIn = { ix, iy }; }
      }
      return { l: bestIn.ix < 0, r: bestIn.ix > 0, u: bestIn.iy < 0, d: bestIn.iy > 0, fire: !o.lazy };
    }
    // the target: the lowest segment above me (with two squirters, each minds his own half first)
    const two = g.players.length === 2;
    let tgt = null, ty = -1e9;
    for (const c of g.chains) for (const s of c.segs) {
      const q = pos(g, s);
      if (q.y < 0 || q.y > p.y - 0.8) continue;
      const mine = !two || (i === 0 ? q.x < W / 2 : q.x > W / 2 - 1);
      const v = q.y - Math.abs(q.x - p.x) * 0.05 - (mine ? 0 : 6);
      if (v > ty) { ty = v; tgt = { s, q }; }
    }
    let aim = p.x;
    if (tgt) {
      const t = (p.y - tgt.q.y) / SHOT_SPEED + 0.08;
      const vx = tgt.s.y === tgt.s.py ? (tgt.s.x - tgt.s.px) / g.interval : 0;
      aim = clamp(Math.round(tgt.q.x + vx * t), 0, W - 1);
    } else if (g.hopper) aim = clamp(Math.round(g.hopper.x), 0, W - 1);
    if (o.lazy) aim = (aim + 5) % W;
    const goDown = p.y < H - 1 && danger(p.x, p.y + 1) > 2.5;
    return { l: aim < p.x - 0.25, r: aim > p.x + 0.25, u: false, d: goDown, fire: !o.lazy };
  }

  GW.rules = {
    W, H, ZONE, ZONE_TOP, STEP, SHOT_SPEED, MOVE, MUSH_HP, STUN, LEVELS, POINTS,
    create, step, substep, advance, headNext, removeSegs, plant, mushAt, chainAt, pos, allSegs, sprinkleOne, sprinkleTarget, goWave, treat, tickle, bot, key,
  };
})();
