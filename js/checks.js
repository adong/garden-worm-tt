/* TT Garden Worm: the headless checks of the rules (js/rules.js). node tools/check.js runs them, and so does
   game.check() in the page. Each check has a matching mistake (rules "bugs"): game.check({ fail: true }) /
   node tools/check.js --fail plants each mistake and its check has to fail.
   - split: squirting segment k splits the caterpillar into two with the right lengths and heads (and the new
     mushroom is where k was, and the back part's new head drops a row at it)
   - drop: a head drops a row and turns round at a mushroom or the edge, heads back up at the bottom, slides down
     from a sticky mushroom, and goes straight on when nothing's there
   - mushrooms: a mushroom takes 4 squirts to wash away (sticky ones too), and it shields what's behind it
   - wave: when the last segment is squirted the wave clears, the next caterpillar comes in, and after the last wave
     the garden is won
   - autopilot: the pretend player clears wave 1 on 🐣 EASY, on every seed
   - sprinkler: the brother's sprinkler storm changes 5 segments into butterflies and leaves no mushrooms
   - unstuck: after a tickle the squirter giggles for a moment, then moves again; random keys never get him stuck
     or out of the strip */
(function () {
  'use strict';
  const GW = (window.GW = window.GW || {});
  const R = GW.rules;
  const { W, H, ZONE_TOP } = R;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  // a quiet garden for a test: no mushrooms, no critters for ages, and a caterpillar only moves when told to
  function quiet(bugs, level) {
    const g = R.create({ level: level || 'easy', seed: 7, players: 1, bugs });
    g.mush.clear();
    g.chains = [];
    g.hopperT = g.ladyT = g.snailT = 1e9;
    g.interval = 1e9;
    g.tickT = 0;
    return g;
  }
  // one squirt from the bottom row under column x, run until it lands (or leaves the garden)
  function squirt(g, x) {
    const p = g.players[0];
    p.x = x;
    p.y = H - 1;
    p.shot = null;
    p.cool = 0;
    let fired = false;
    for (let i = 0; i < 400; i++) {
      R.substep(g, R.STEP, () => (fired ? {} : { fire: true }));
      if (p.shot) fired = true;
      if (fired && !p.shot) break;
    }
    return fired;
  }
  const ids = (c) => c.segs.map((s) => s.id);
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const at = (s) => `(${s.x},${s.y})`;

  function checkSplit(bugs) {
    const problems = [], n = 8, parts = [];
    for (const k of [0, 1, 3, 6, 7]) {
      const g = quiet(bugs);
      const cells = [];
      for (let j = 0; j < n; j++) cells.push([12 - j, 6]); // head at x = 12, heading right, the body behind it
      const c = R.chainAt(g, cells, 1, 1);
      const all = ids(c), s0 = g.score;
      squirt(g, 12 - k);
      const want = [];
      if (k > 0) want.push(all.slice(0, k));
      if (k < n - 1) want.push(all.slice(k + 1));
      const got = g.chains.map(ids);
      if (got.length !== want.length) problems.push(`k=${k}: ${got.length} caterpillars, want ${want.length}`);
      want.forEach((w, j) => {
        const gj = got[j] || [];
        if (gj.length !== w.length) problems.push(`k=${k}: part ${j + 1} has ${gj.length} segments, want ${w.length}`);
        if (gj[0] !== w[0]) problems.push(`k=${k}: part ${j + 1}'s head is segment #${all.indexOf(gj[0])}, want #${all.indexOf(w[0])}`);
        else if (!same(gj, w)) problems.push(`k=${k}: part ${j + 1} is in the wrong order`);
      });
      const m = R.mushAt(g, 12 - k, 6);
      if (!m || m.hp !== R.MUSH_HP) problems.push(`k=${k}: no fresh mushroom where segment k was`);
      const want$ = k === 0 ? R.POINTS.head : R.POINTS.body;
      if (g.score - s0 !== want$) problems.push(`k=${k}: scored ${g.score - s0}, want ${want$}`);
      if (g.butterflies !== 1) problems.push(`k=${k}: ${g.butterflies} butterflies, want 1`);
      parts.push(got.map((p) => p.length).join('+'));
      if (k === 3 && g.chains.length === 2) {
        // next tick: the front part goes on; the back part's new head meets the new mushroom, drops a row and turns
        g.interval = 1;
        g.tickT = 0;
        R.advance(g);
        const a = g.chains[0].segs[0], b = g.chains[1].segs[0];
        if (a.x !== 13 || a.y !== 6) problems.push(`front head went to ${at(a)}, want (13,6)`);
        if (b.x !== 8 || b.y !== 7 || b.dx !== -1) problems.push(`back head went to ${at(b)} heading ${b.dx}, want (8,7) heading -1`);
      }
    }
    return { stat: `8 segments, squirt k = 0,1,3,6,7 -> ${parts.join(' | ')}`, problems };
  }

  function checkDrop(bugs) {
    const problems = [];
    const tick = (g, n) => {
      g.interval = 1;
      for (let i = 0; i < (n || 1); i++) { g.tickT = 0; R.advance(g); }
    };
    // a mushroom in the way
    let g = quiet(bugs);
    let c = R.chainAt(g, [[5, 4], [4, 4], [3, 4]], 1, 1);
    R.plant(g, 6, 4);
    tick(g);
    if (!(c.segs[0].x === 5 && c.segs[0].y === 5 && c.segs[0].dx === -1)) problems.push(`mushroom: head went to ${at(c.segs[0])} heading ${c.segs[0].dx}, want (5,5) heading -1`);
    if (!(c.segs[1].x === 5 && c.segs[1].y === 4 && c.segs[2].x === 4)) problems.push('mushroom: the body did not follow the head');
    tick(g);
    if (!(c.segs[0].x === 4 && c.segs[0].y === 5)) problems.push(`mushroom: after the drop the head went to ${at(c.segs[0])}, want (4,5)`);
    // the right edge, the left edge
    g = quiet(bugs);
    c = R.chainAt(g, [[W - 1, 3], [W - 2, 3]], 1, 1);
    tick(g);
    if (!(c.segs[0].x === W - 1 && c.segs[0].y === 4 && c.segs[0].dx === -1)) problems.push(`right edge: head went to ${at(c.segs[0])}`);
    g = quiet(bugs);
    c = R.chainAt(g, [[0, 8], [1, 8]], -1, 1);
    tick(g);
    if (!(c.segs[0].x === 0 && c.segs[0].y === 9 && c.segs[0].dx === 1)) problems.push(`left edge: head went to ${at(c.segs[0])}`);
    // nothing in the way: straight on
    g = quiet(bugs);
    c = R.chainAt(g, [[5, 10]], 1, 1);
    tick(g);
    if (!(c.segs[0].x === 6 && c.segs[0].y === 10)) problems.push(`open grass: head went to ${at(c.segs[0])}, want (6,10)`);
    // the bottom row: back up; the top of the strip: back down
    g = quiet(bugs);
    c = R.chainAt(g, [[W - 1, H - 1]], 1, 1);
    tick(g);
    if (!(c.segs[0].y === H - 2 && c.segs[0].dy === -1)) problems.push(`bottom: head went to ${at(c.segs[0])}, want row ${H - 2} going up`);
    g = quiet(bugs);
    c = R.chainAt(g, [[0, ZONE_TOP]], -1, -1);
    tick(g);
    if (!(c.segs[0].y === ZONE_TOP + 1 && c.segs[0].dy === 1)) problems.push(`top of the strip: head went to ${at(c.segs[0])}, want row ${ZONE_TOP + 1} going down`);
    // a sticky mushroom: straight down to the bottom row
    g = quiet(bugs);
    c = R.chainAt(g, [[5, 4], [4, 4]], 1, 1);
    R.plant(g, 6, 4, true);
    let n = 0;
    while (c.segs[0].y < H - 1 && n < 40) { tick(g); n++; }
    if (n !== H - 1 - 4 || c.segs[0].x !== 5) problems.push(`sticky: reached ${at(c.segs[0])} in ${n} ticks, want (5,${H - 1}) in ${H - 5}`);
    return { stat: 'mushroom, both edges, open grass, bottom, top of strip, sticky slide', problems };
  }

  function checkMush(bugs) {
    const problems = [];
    for (const sticky of [false, true]) {
      const g = quiet(bugs);
      R.chainAt(g, [[0, 0]], 1, 1); // parked out of the way, so the wave doesn't end
      R.plant(g, 8, 6, sticky);
      const seg = R.chainAt(g, [[8, 2]], 1, 1).segs[0];
      const s0 = g.score, hp = [];
      for (let i = 1; i <= 6 && R.mushAt(g, 8, 6); i++) {
        squirt(g, 8);
        const m = R.mushAt(g, 8, 6);
        hp.push(m ? m.hp : 0);
      }
      const name = sticky ? 'sticky' : 'plain';
      if (!same(hp, [3, 2, 1, 0])) problems.push(`${name}: after each squirt ${hp.join(', ')}, want 3, 2, 1, 0`);
      if (g.score - s0 !== R.POINTS.mush) problems.push(`${name}: washing it away scored ${g.score - s0}, want ${R.POINTS.mush}`);
      if (!g.chains.some((c) => c.segs.includes(seg))) problems.push(`${name}: the segment behind the mushroom was hit through it`);
      squirt(g, 8);
      if (g.chains.some((c) => c.segs.includes(seg))) problems.push(`${name}: once it was gone, the next squirt didn't reach the segment behind`);
    }
    return { stat: 'plain and sticky: 3, 2, 1, gone', problems };
  }

  function checkWave(bugs) {
    const problems = [];
    const g = R.create({ level: 'easy', seed: 3, players: 1, bugs });
    g.mush.clear();
    g.hopperT = g.ladyT = g.snailT = 1e9;
    g.chains = [];
    const len = g.P.len, cells = [];
    for (let j = 0; j < len; j++) cells.push([2 + len - 1 - j, 8]);
    R.chainAt(g, cells, 1, 1);
    g.interval = 1e9;
    g.tickT = 0;
    const seen = [];
    const run = (sec) => {
      for (let i = 0; i < sec * 120; i++) {
        R.substep(g, R.STEP, null);
        for (const e of g.events) seen.push(e.type);
        g.events.length = 0;
      }
    };
    for (let x = 2; x < 2 + len; x++) {
      squirt(g, x);
      for (const e of g.events) seen.push(e.type);
      g.events.length = 0;
    }
    if (g.chains.length) problems.push(`${g.chains.length} caterpillars left after squirting every segment`);
    if (!seen.includes('wave')) problems.push('no wave-clear after the last segment');
    run(3);
    if (g.wave !== 2) problems.push(`wave ${g.wave} after the clear, want 2`);
    if (!seen.includes('waveStart')) problems.push('the next wave never started');
    const segs = R.allSegs(g);
    if (segs.length !== len || g.chains.length !== 1) problems.push(`next wave: ${g.chains.length} caterpillar(s), ${segs.length} segments, want 1 of ${len}`);
    if (g.phase !== 'play') problems.push(`phase ${g.phase} in the next wave, want play`);
    // the last wave: clearing it wins the garden
    g.wave = g.waves;
    R.removeSegs(g, R.allSegs(g), false, -1);
    run(3);
    if (g.phase !== 'won') problems.push(`clearing the last wave left the phase at ${g.phase}, want won`);
    return { stat: `${len} squirts clear wave 1, wave 2 comes in with ${segs.length}, wave ${g.waves} wins`, problems };
  }

  function checkAuto(bugs, o) {
    const problems = [];
    const seeds = o && o.quick ? 6 : 16;
    let won = 0, time = 0, lost = 0;
    const lazy = !!bugs.lazyBot;
    for (let seed = 1; seed <= seeds; seed++) {
      const g = R.create({ level: 'easy', seed, players: 1, bugs });
      const input = (i, gg) => R.bot(gg, i, { lazy });
      let cleared = false;
      while (g.t < 240 && !cleared && g.phase !== 'over') {
        R.step(g, 1 / 60, input);
        for (const e of g.events) if (e.type === 'wave' && e.wave === 1) cleared = true;
        g.events.length = 0;
      }
      if (cleared) { won++; time += g.t; lost += g.P.lives - g.lives; } else problems.push(`seed ${seed}: ${g.phase === 'over' ? 'tickled out' : 'still going after 240 s'} with ${R.allSegs(g).length} segments left`);
    }
    return { stat: `🐣 EASY wave 1 cleared on ${won}/${seeds} seeds${won ? `, ${(time / won).toFixed(0)} s on average, ${(lost / won).toFixed(1)} lives lost` : ''}`, problems };
  }

  function checkSprinkler(bugs) {
    const problems = [];
    const g = quiet(bugs);
    const cells = [];
    for (let j = 0; j < 8; j++) cells.push([10 - j, 9]);
    R.chainAt(g, cells, 1, 1);
    R.chainAt(g, [[3, 16], [2, 16]], 1, 1);
    const b0 = g.butterflies, m0 = g.mush.size, n0 = R.allSegs(g).length;
    for (let i = 0; i < 5; i++) R.sprinkleOne(g);
    const gone = n0 - R.allSegs(g).length;
    if (gone !== 5 || g.butterflies - b0 !== 5) problems.push(`${gone} segments changed, ${g.butterflies - b0} butterflies, want 5 and 5`);
    if (g.mush.size !== m0) problems.push(`${g.mush.size - m0} mushrooms left behind, want none`);
    if (R.allSegs(g).some((s) => s.y === 16)) problems.push('the two segments nearest the squirters were not among the first');
    for (const c of g.chains) if (!c.segs.length) problems.push('an empty caterpillar was left');
    // fewer than 5 left: it changes them all and the wave can clear
    const h = quiet(bugs);
    R.chainAt(h, [[4, 4], [3, 4]], 1, 1);
    let n = 0;
    for (let i = 0; i < 5; i++) if (R.sprinkleOne(h)) n++;
    if (n !== 2 || h.chains.length) problems.push(`with 2 segments left it changed ${n}, ${h.chains.length} caterpillars left`);
    return { stat: `5 of 10 changed (the nearest first), ${g.mush.size - m0} mushrooms; 2 of 2 when only 2 left`, problems };
  }

  function checkUnstuck(bugs) {
    const problems = [];
    const g = quiet(bugs);
    R.chainAt(g, [[0, 0]], 1, 1);
    const p = g.players[0];
    p.x = 8;
    const right = () => ({ r: true });
    R.tickle(g, p, 'worm');
    const x0 = p.x;
    for (let i = 0; i < R.STUN * 0.5 * 120; i++) R.substep(g, R.STEP, right);
    if (p.x !== x0) problems.push('moved while giggling');
    for (let i = 0; i < (R.STUN * 0.5 + 0.4) * 120; i++) R.substep(g, R.STEP, right);
    if (p.x < x0 + 2) problems.push(`still stuck ${(R.STUN + 0.4).toFixed(1)} s after a tickle (moved ${(p.x - x0).toFixed(2)})`);
    // random keys for a minute: always inside the strip, and a push always moves him within 0.2 s
    let rnd = 12345;
    const rand = () => ((rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648);
    let held = {}, worst = 0;
    for (let s = 0; s < 60 * 120; s++) {
      if (s % 30 === 0) held = { l: rand() < 0.3, r: rand() < 0.3, u: rand() < 0.3, d: rand() < 0.3, fire: rand() < 0.5 };
      R.substep(g, R.STEP, () => held);
      if (p.x < 0 || p.x > W - 1 || p.y < ZONE_TOP || p.y > H - 1) worst++;
    }
    if (worst) problems.push(`${worst} steps outside the strip`);
    for (const [k, axis, sign] of [['l', 'x', -1], ['r', 'x', 1], ['u', 'y', -1], ['d', 'y', 1]]) {
      p.x = 8; p.y = H - 3; p.stun = 0;
      const v0 = p[axis];
      for (let i = 0; i < 24; i++) R.substep(g, R.STEP, () => ({ [k]: true }));
      if ((p[axis] - v0) * sign < 1) problems.push(`${k} moved ${(p[axis] - v0).toFixed(2)} in 0.2 s`);
    }
    return { stat: `giggles ${R.STUN} s then moves; 60 s of random keys stays in the strip; every key moves him`, problems };
  }

  const LIST = [
    ['split', checkSplit, { split: true }, 'a squirt also loses the segment behind'],
    ['drop', checkDrop, { noDrop: true }, 'heads crawl through mushrooms'],
    ['mushrooms', checkMush, { mushHp: 3 }, 'mushrooms wash away after 3'],
    ['wave', checkWave, { noClear: true }, 'the wave never clears'],
    ['autopilot', checkAuto, { lazyBot: true }, 'the pretend player aims 5 columns off and never squirts'],
    ['sprinkler', checkSprinkler, { sprinkleMush: true }, 'the sprinkler leaves mushrooms'],
    ['unstuck', checkUnstuck, { stuck: true }, 'the giggles never end'],
  ];
  function run(o) {
    o = o || {};
    const t0 = now();
    const results = [];
    for (const [name, fn, bug, why] of LIST) {
      if (o.only && o.only !== name) continue;
      const r = fn(o.fail ? bug : {}, o);
      results.push({ name, ok: r.problems.length === 0, stat: r.stat, problems: r.problems, broken: o.fail ? why : null });
    }
    return { ok: results.every((r) => r.ok), fail: !!o.fail, results, ms: Math.round(now() - t0) };
  }
  GW.checks = { run, names: LIST.map((l) => l[0]) };
})();
