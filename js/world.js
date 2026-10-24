/* TT Garden Worm: the 3D garden. A raised toy lawn (one cell = one unit, row 0 far away, the squirters' strip at the
   front), a hedge at the top where the caterpillars come in, picket fences down the sides, flowers and trees round it,
   and Foxy 🦊 and Froggy 🐸 watching from the hedge. The mushrooms, the giggling caterpillar segments, the critters,
   the squirters (the kit's boys with a toy water squirter), squirts, butterflies, splashes, confetti and points.
   The camera is fixed: straight up the garden from the front, so → on the keys is → on the screen. It stands steeper
   on tall screens and lower on wide ones, and fits the garden into the part of the screen the HUD leaves free. */
(function () {
  'use strict';
  const GW = (window.GW = window.GW || {});
  const R = GW.rules, G = Kit.gfx, T = THREE;
  const { W, H, ZONE_TOP } = R;
  const X = (cx) => cx - (W - 1) / 2;
  const Z = (cy) => cy - (H - 1) / 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const damp = (k, dt) => 1 - Math.exp(-k * dt);
  const PERSON = 0.8; // the boys' size: a 2 m kit person comes out about 1.7 cells tall
  const WAVE_COLORS = ['#8ee63f', '#ffa53d', '#ff7ad1', '#5ec8ff', '#ffd93d'];
  const CAP_COLORS = ['#ff4b4b', '#ff8a1f', '#e04bff', '#3b7bff', '#ff4b8a'];

  let renderer, scene, camera, sun, time = 0;
  const view = { w: 1, h: 1, key: '' };
  const geo = {}, mat = {}, tex = {};
  let fans = [];

  // ---------------------------------------------------------------- textures (canvas, no image files)
  const PX = 32; // canvas pixels per cell for the lawn
  const EDGE = 0.25; // lawn beyond the outer cells, in cells
  function lawnTexture() {
    const cw = Math.round((W + EDGE * 2) * PX), ch = Math.round((H + EDGE * 2) * PX);
    const [c, g] = G.makeCanvas(cw, ch);
    g.fillStyle = '#4fa63a';
    g.fillRect(0, 0, cw, ch);
    const o = EDGE * PX;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const zone = y >= ZONE_TOP;
        const light = (x + y) % 2 === 0;
        g.fillStyle = zone ? (light ? '#b6ea84' : '#a8e173') : light ? '#7fd35a' : '#72c94e';
        g.fillRect(o + x * PX, o + y * PX, PX, PX);
      }
    }
    // little grass ticks
    let s = 7;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 900; i++) {
      const x = o + r() * W * PX, y = o + r() * H * PX;
      g.strokeStyle = y > o + ZONE_TOP * PX ? 'rgba(80,150,50,0.35)' : 'rgba(40,110,30,0.35)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * 3, y - 4 - r() * 3);
      g.stroke();
    }
    // the squirters' strip: a dashed line along its top and daisies in its corners
    g.strokeStyle = 'rgba(255,255,255,0.85)';
    g.lineWidth = 4;
    g.setLineDash([12, 10]);
    g.beginPath();
    g.moveTo(o, o + ZONE_TOP * PX);
    g.lineTo(o + W * PX, o + ZONE_TOP * PX);
    g.stroke();
    g.setLineDash([]);
    for (let i = 0; i < 26; i++) {
      const x = o + r() * W * PX, y = o + (ZONE_TOP + 0.2 + r() * (H - ZONE_TOP - 0.4)) * PX;
      g.fillStyle = 'rgba(255,255,255,0.8)';
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        g.beginPath();
        g.arc(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.2, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#ffd400';
      g.beginPath();
      g.arc(x, y, 1.8, 0, Math.PI * 2);
      g.fill();
    }
    const t = G.toTexture(c);
    t.anisotropy = 4;
    return t;
  }
  function capTexture(color, sticky) {
    const [c, g] = G.makeCanvas(128, 64);
    g.fillStyle = color;
    g.fillRect(0, 0, 128, 64);
    if (sticky) {
      // a shiny glaze with drips
      const grd = g.createLinearGradient(0, 0, 0, 64);
      grd.addColorStop(0, 'rgba(255,255,255,0.35)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 64);
      g.fillStyle = 'rgba(210,255,120,0.9)';
      for (let x = 4; x < 128; x += 16) {
        g.beginPath();
        g.ellipse(x, 58, 4, 9 + (x % 3) * 3, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.fillStyle = sticky ? 'rgba(230,255,160,0.95)' : '#ffffff';
    for (const [x, y, rr] of [[14, 30, 8], [44, 20, 10], [74, 34, 8], [104, 22, 10], [30, 48, 5], [90, 50, 5], [60, 8, 6], [118, 44, 6]]) {
      g.beginPath();
      g.ellipse(x, y, rr * 1.1, rr * 0.8, 0, 0, Math.PI * 2);
      g.fill();
    }
    return G.toTexture(c);
  }
  // the segments' faces: two of each, swapped back and forth so they giggle
  function faceTexture(head, laugh) {
    const [c, g] = G.makeCanvas(128, 128);
    g.lineCap = 'round';
    // rosy cheeks
    g.fillStyle = 'rgba(255,110,140,0.55)';
    for (const x of [26, 102]) {
      g.beginPath();
      g.ellipse(x, 78, 13, 9, 0, 0, Math.PI * 2);
      g.fill();
    }
    if (head && !laugh) {
      // big googly eyes
      for (const x of [42, 86]) {
        g.fillStyle = '#ffffff';
        g.strokeStyle = '#1b1a22';
        g.lineWidth = 4;
        g.beginPath();
        g.arc(x, 48, 19, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.fillStyle = '#1b1a22';
        g.beginPath();
        g.arc(x + 3, 52, 9, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(x + 6, 48, 3, 0, Math.PI * 2);
        g.fill();
      }
    } else {
      // happy ^ ^ eyes
      g.strokeStyle = '#1b1a22';
      g.lineWidth = head ? 7 : 8;
      for (const x of [42, 86]) {
        g.beginPath();
        g.moveTo(x - 13, 54);
        g.lineTo(x, 40);
        g.lineTo(x + 13, 54);
        g.stroke();
      }
    }
    // the mouth: a smile, or wide open giggling
    if (laugh) {
      g.fillStyle = '#7a1630';
      g.beginPath();
      g.moveTo(40, 80);
      g.quadraticCurveTo(64, 122, 88, 80);
      g.closePath();
      g.fill();
      g.fillStyle = '#ff7a9a';
      g.beginPath();
      g.ellipse(64, 100, 11, 7, 0, 0, Math.PI * 2);
      g.fill();
    } else {
      g.strokeStyle = '#1b1a22';
      g.lineWidth = 7;
      g.beginPath();
      g.arc(64, 74, 22, 0.15 * Math.PI, 0.85 * Math.PI);
      g.stroke();
    }
    return G.toTexture(c);
  }
  function wingTexture(a, b) {
    const [c, g] = G.makeCanvas(128, 128);
    g.translate(64, 64);
    for (const s of [-1, 1]) {
      g.save();
      g.scale(s, 1);
      g.fillStyle = a;
      g.strokeStyle = '#3a2a4a';
      g.lineWidth = 4;
      g.beginPath();
      g.ellipse(30, -22, 30, 36, 0.5, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = b;
      g.beginPath();
      g.ellipse(24, 28, 20, 24, -0.4, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.beginPath();
      g.arc(34, -26, 8, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    return G.toTexture(c);
  }
  function bubbleTexture() {
    const [c, g] = G.makeCanvas(128, 128);
    const grd = g.createRadialGradient(64, 64, 30, 64, 64, 62);
    grd.addColorStop(0, 'rgba(160,230,255,0.08)');
    grd.addColorStop(0.8, 'rgba(160,230,255,0.35)');
    grd.addColorStop(1, 'rgba(255,255,255,0.85)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(64, 64, 62, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath();
    g.ellipse(42, 40, 14, 8, -0.7, 0, Math.PI * 2);
    g.fill();
    return G.toTexture(c);
  }
  function spiralTexture() {
    const [c, g] = G.makeCanvas(128, 64);
    g.fillStyle = '#ff9fcf';
    g.fillRect(0, 0, 128, 64);
    g.strokeStyle = '#c2408a';
    g.lineWidth = 5;
    for (let x = -64; x < 160; x += 22) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + 30, 64);
      g.stroke();
    }
    return G.toTexture(c);
  }
  function textTexture(text, color) {
    const [c, g] = G.makeCanvas(256, 96);
    g.font = `64px ${G.FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 12;
    g.strokeStyle = '#14121f';
    g.strokeText(text, 128, 50);
    g.fillStyle = color || '#ffd400';
    g.fillText(text, 128, 50);
    return G.toTexture(c);
  }

  // ---------------------------------------------------------------- the garden
  function buildGarden() {
    // the ground all round, and the raised lawn
    const ground = new T.Mesh(new T.PlaneGeometry(160, 160), G.std('#8fd468', { roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.42;
    ground.receiveShadow = true;
    scene.add(ground);
    const lw = W + EDGE * 2, lh = H + EDGE * 2;
    const soil = G.mesh(new T.BoxGeometry(lw, 0.42, lh), G.std('#8a5a33', { roughness: 0.95 }), 0, -0.215, Z((H - 1) / 2), scene);
    soil.receiveShadow = true;
    const lawn = new T.Mesh(new T.PlaneGeometry(lw, lh), new T.MeshStandardMaterial({ map: lawnTexture(), roughness: 0.95 }));
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(0, 0.001, Z((H - 1) / 2));
    lawn.receiveShadow = true;
    scene.add(lawn);
    // the hedge along the top: the caterpillars come in through it
    const hedgeMat = G.std('#2f9a3e', { roughness: 0.9 }), hedgeMat2 = G.std('#3fb04c', { roughness: 0.9 });
    const ball = new T.SphereGeometry(0.62, 14, 10);
    for (let i = 0; i <= W * 2; i++) {
      const m = G.mesh(ball, i % 2 ? hedgeMat : hedgeMat2, X(-0.5 + i * 0.5), 0.32 + (i % 3) * 0.06, Z(-1.25) + (i % 2) * 0.12, scene);
      m.scale.set(1, 0.95, 0.85);
      m.receiveShadow = true;
    }
    // picket fences down both sides
    const picket = new T.BoxGeometry(0.16, 0.62, 0.07), tip = new T.ConeGeometry(0.115, 0.16, 4);
    const white = G.std('#fffaf0', { roughness: 0.6 });
    const zs = [];
    for (let z = Z(-1.5); z <= Z(H - 1) + 0.9; z += 0.42) zs.push(z);
    const pick = new T.InstancedMesh(picket, white, zs.length * 2), tips = new T.InstancedMesh(tip, white, zs.length * 2);
    const dm = new T.Object3D();
    let n = 0;
    for (const side of [-1, 1]) {
      const x = side < 0 ? X(-0.5) - EDGE - 0.35 : X(W - 0.5) + EDGE + 0.35;
      for (const z of zs) {
        dm.position.set(x, -0.1, z);
        dm.rotation.set(0, Math.PI / 2, 0);
        dm.updateMatrix();
        pick.setMatrixAt(n, dm.matrix);
        dm.position.y = 0.29;
        dm.rotation.set(0, Math.PI / 4 + Math.PI / 2, 0);
        dm.updateMatrix();
        tips.setMatrixAt(n, dm.matrix);
        n++;
      }
      for (const y of [0.0, 0.32]) G.mesh(new T.BoxGeometry(0.06, 0.08, zs[zs.length - 1] - zs[0] + 0.3), white, x + side * 0.05, y, (zs[0] + zs[zs.length - 1]) / 2, scene);
    }
    pick.castShadow = tips.castShadow = true;
    scene.add(pick, tips);
    // stepping stones along the front
    const stone = new T.SphereGeometry(0.42, 10, 6), stoneMat = G.std('#c9c3b5', { roughness: 0.9 });
    for (let x = -0.5; x <= W - 0.5; x += 0.9) {
      const s = G.mesh(stone, stoneMat, X(x), -0.36, Z(H - 1) + 0.95, scene);
      s.scale.set(1, 0.35, 0.8);
    }
    // flowers and bushes round the lawn, trees behind the hedge
    const stem = new T.CylinderGeometry(0.03, 0.03, 0.4, 5), bloom = new T.SphereGeometry(0.14, 8, 6), mid = new T.SphereGeometry(0.07, 6, 4);
    const stemMat = G.std('#3c9a3a'), midMat = G.std('#ffd400');
    const petals = ['#ff6fa8', '#ffffff', '#ff9f1c', '#b98cff', '#ff4b4b', '#7fd7ff'].map((c) => G.std(c));
    let s = 11;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 90; i++) {
      const side = i % 2 ? 1 : -1;
      const x = side * ((W + 1) / 2 + 1.2 + r() * 9), z = Z(-3) + r() * (H + 6);
      G.mesh(stem, stemMat, x, -0.22, z, scene, false);
      const b = G.mesh(bloom, petals[i % petals.length], x, 0.02, z, scene);
      b.scale.set(1.4, 0.6, 1.4);
      G.mesh(mid, midMat, x, 0.07, z, scene, false);
    }
    const bushMat = G.std('#3fae4a', { roughness: 0.9 });
    for (let i = 0; i < 10; i++) {
      const side = i % 2 ? 1 : -1;
      const b = G.mesh(new T.SphereGeometry(0.9 + r() * 0.5, 12, 8), bushMat, side * ((W + 1) / 2 + 2.2 + r() * 6), -0.3, Z(-2) + r() * (H + 2), scene);
      b.scale.y = 0.7;
    }
    const trunk = G.std('#8a5a33'), leaf = G.std('#2f9a3e', { roughness: 0.9 }), leaf2 = G.std('#47b552', { roughness: 0.9 });
    for (const [x, z, k] of [[-7.5, -4.5, 1.1], [7.8, -5, 1.25], [-11, 2, 1], [11.5, 3, 1.15], [0, -7.5, 1.3], [-4, -6.8, 0.9], [4.5, -7, 0.95]]) {
      G.mesh(new T.CylinderGeometry(0.22 * k, 0.3 * k, 2.2 * k, 8), trunk, x, 0.7 * k, z + Z(0), scene);
      G.mesh(new T.SphereGeometry(1.3 * k, 12, 9), leaf, x, 2.2 * k, z + Z(0), scene);
      G.mesh(new T.SphereGeometry(0.9 * k, 10, 8), leaf2, x + 0.7 * k, 2.7 * k, z + Z(0) + 0.3, scene);
    }
    // Foxy and Froggy watch from the hedge
    fans = [['🦊', -1], ['🐸', 1]].map(([e, side]) => {
      const sp = new T.Sprite(new T.SpriteMaterial({ map: G.emojiTexture(e), depthWrite: false }));
      sp.scale.setScalar(1.7);
      sp.position.set(side * ((W - 1) / 2 - 0.6), 1.25, Z(-1.3));
      scene.add(sp);
      return { sp, base: 1.45, cheer: 0, side };
    });
  }

  // ---------------------------------------------------------------- the mushrooms
  const mushes = new Map(); // key -> { g, cap, under, drip, hp, sticky, born, wave }
  function makeMush() {
    const g = new T.Group();
    const stemM = G.mesh(geo.stem, mat.stem, 0, 0.17, 0, g);
    stemM.castShadow = true;
    const capG = new T.Group();
    capG.position.y = 0.3;
    g.add(capG);
    const cap = G.mesh(geo.cap, mat.caps[0], 0, 0, 0, capG);
    cap.scale.y = 0.78;
    const under = G.mesh(geo.under, mat.under, 0, 0.002, 0, capG, false);
    under.rotation.x = Math.PI / 2;
    const drip = G.mesh(geo.drip, mat.drip, 0.28, -0.06, 0.12, capG, false);
    drip.scale.y = 1.6;
    drip.visible = false;
    scene.add(g);
    return { g, cap, capG, drip, hp: 0, sticky: false, born: time, wave: 0 };
  }
  function syncMushrooms(gm, wave) {
    const keep = new Set();
    for (const [k, m] of gm.mush) {
      keep.add(k);
      let v = mushes.get(k);
      if (!v) {
        v = makeMush();
        v.born = time;
        mushes.set(k, v);
        v.g.position.set(X(m.x), 0, Z(m.y));
        v.g.rotation.y = (m.x * 7 + m.y * 13) % 6;
      }
      if (v.hp !== m.hp || v.sticky !== m.sticky || v.wave !== wave) {
        if (m.hp < v.hp) v.hitT = time;
        v.hp = m.hp;
        v.sticky = m.sticky;
        v.wave = wave;
        v.cap.material = m.sticky ? mat.sticky : mat.caps[(wave - 1) % mat.caps.length];
        v.drip.visible = m.sticky;
      }
      // fresh ones pop up; squirted ones shrink (4 squirts: a full cap, then smaller and smaller)
      const pop = clamp((time - v.born) / 0.25, 0, 1);
      const size = [0, 0.45, 0.62, 0.8, 1][clamp(v.hp, 0, 4)];
      const wob = v.hitT ? Math.max(0, 1 - (time - v.hitT) / 0.3) : 0;
      const sc = (pop < 1 ? Math.sin(pop * Math.PI * 0.75) / Math.sin(Math.PI * 0.75) : 1) * (0.55 + 0.45 * size);
      v.g.scale.set(sc * (1 + wob * 0.25), sc * (1 - wob * 0.2), sc * (1 + wob * 0.25));
      v.capG.scale.setScalar(0.65 + 0.35 * size);
    }
    for (const [k, v] of mushes) if (!keep.has(k)) {
      scene.remove(v.g);
      mushes.delete(k);
    }
  }

  // ---------------------------------------------------------------- the caterpillar
  const segs = new Map(); // segment id -> { g, ball, face, ant, head, wave }
  function makeSeg() {
    const g = new T.Group();
    const ball = G.mesh(geo.seg, mat.segs[0], 0, 0, 0, g);
    ball.castShadow = true;
    const feet = new T.Group();
    for (const s of [-1, 1]) G.mesh(geo.foot, mat.dark, s * 0.3, -0.36, 0, feet, false);
    g.add(feet);
    const ant = new T.Group();
    for (const s of [-1, 1]) {
      const a = G.mesh(geo.antenna, mat.dark, s * 0.16, 0.55, 0, ant, false);
      a.rotation.z = -s * 0.35;
      G.mesh(geo.antTip, mat.antTip, s * 0.27, 0.78, 0, ant, false);
    }
    g.add(ant);
    const face = new T.Sprite(new T.SpriteMaterial({ map: tex.face[0], transparent: true }));
    scene.add(face);
    scene.add(g);
    return { g, ball, feet, ant, face, head: null, wave: 0, ph: Math.random() * 6, seenAt: time };
  }
  const toCam = new T.Vector3();
  function syncSegments(gm, wave) {
    const keep = new Set();
    for (const c of gm.chains) {
      c.segs.forEach((s, k) => {
        keep.add(s.id);
        let v = segs.get(s.id);
        if (!v) { v = makeSeg(); segs.set(s.id, v); }
        const head = k === 0;
        if (v.head !== head || v.wave !== wave) {
          v.head = head;
          v.wave = wave;
          const col = (wave - 1) % mat.segs.length;
          v.ball.material = head ? mat.heads[col] : mat.segs[col];
          v.ant.visible = head;
          v.ball.scale.setScalar(head ? 1.12 : 1);
        }
        const p = R.pos(gm, s);
        const show = clamp((p.y + 1.6) / 0.7, 0, 1); // hidden until it comes out through the hedge
        // giggling: a bounce, a squash and a stretch, and the face laughs every so often
        const b = Math.abs(Math.sin(time * 9 + v.ph + k * 0.7));
        const y = 0.42 + b * 0.12;
        v.g.position.set(X(p.x), y * show, Z(p.y));
        v.g.scale.set(show * (1 + (1 - b) * 0.06), show * (0.94 + b * 0.1), show * (1 + (1 - b) * 0.06));
        // heads face where they're going (a little towards the camera, so you see the antennae wiggle)
        const mx = s.x - s.px, mz = s.y - s.py;
        if (mx || mz) v.yaw = Math.atan2(mx, mz + 0.6);
        if (v.yaw !== undefined) v.g.rotation.y = v.yaw;
        v.ant.rotation.z = Math.sin(time * 12 + v.ph) * 0.12;
        const laugh = Math.sin(time * 2.2 + v.ph * 3) > 0.55;
        v.face.material.map = tex.face[(head ? 2 : 0) + (laugh ? 1 : 0)];
        v.face.position.copy(v.g.position).addScaledVector(toCam, head ? 0.52 : 0.46);
        v.face.position.y += 0.04;
        v.face.scale.setScalar((head ? 0.62 : 0.5) * show);
        v.face.visible = show > 0.05;
      });
    }
    for (const [id, v] of segs) if (!keep.has(id)) {
      scene.remove(v.g);
      scene.remove(v.face);
      segs.delete(id);
    }
  }

  // ---------------------------------------------------------------- the critters
  function makeHopper() {
    const g = new T.Group(), b = new T.Group();
    g.add(b);
    const green = G.std('#5fd33a'), dark = G.std('#3c9a2a');
    const body = G.mesh(new T.SphereGeometry(0.3, 14, 10), green, 0, 0.35, -0.05, b);
    body.scale.set(0.9, 0.85, 1.7);
    G.mesh(new T.SphereGeometry(0.24, 12, 10), green, 0, 0.5, 0.42, b);
    for (const s of [-1, 1]) {
      G.mesh(geo.eyeW, mat.white, s * 0.13, 0.62, 0.55, b);
      G.mesh(geo.pupil, mat.dark, s * 0.15, 0.64, 0.64, b, false);
      // the big back legs, bent like a Z
      const leg = new T.Group();
      leg.position.set(s * 0.27, 0.4, -0.2);
      b.add(leg);
      const up = G.mesh(new T.BoxGeometry(0.08, 0.08, 0.6), dark, 0, 0.12, -0.12, leg);
      up.rotation.x = -0.6;
      const low = G.mesh(new T.BoxGeometry(0.07, 0.07, 0.6), dark, 0, -0.1, -0.2, leg);
      low.rotation.x = 0.75;
      const fl = G.mesh(new T.BoxGeometry(0.05, 0.3, 0.05), dark, s * 0.2, 0.22, 0.25, b);
      fl.rotation.z = s * 0.3;
      const an = G.mesh(new T.CylinderGeometry(0.015, 0.015, 0.6, 4), dark, s * 0.1, 0.85, 0.65, b, false);
      an.rotation.x = 0.8;
      an.rotation.z = -s * 0.3;
    }
    return { g, b };
  }
  function makeLady() {
    const g = new T.Group(), b = new T.Group();
    g.add(b);
    const shell = G.mesh(new T.SphereGeometry(0.36, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat.lady, 0, 0.12, 0, b);
    shell.scale.y = 0.85;
    G.mesh(new T.CylinderGeometry(0.36, 0.36, 0.12, 16), mat.dark, 0, 0.07, 0, b);
    G.mesh(new T.SphereGeometry(0.17, 10, 8), mat.dark, 0, 0.16, 0.36, b);
    for (const s of [-1, 1]) G.mesh(geo.eyeW, mat.white, s * 0.08, 0.22, 0.48, b).scale.setScalar(0.6);
    const wings = [];
    for (const s of [-1, 1]) {
      const w = new T.Mesh(new T.CircleGeometry(0.3, 12), mat.glass);
      w.position.set(s * 0.24, 0.42, -0.05);
      w.rotation.x = -Math.PI / 2;
      b.add(w);
      wings.push(w);
    }
    return { g, b, wings };
  }
  function makeSnail() {
    const g = new T.Group(), b = new T.Group();
    g.add(b);
    const foot = G.mesh(new T.SphereGeometry(0.25, 12, 8), G.std('#ffd27a'), 0, 0.13, 0.1, b);
    foot.scale.set(0.7, 0.5, 2.0);
    const shell = G.mesh(new T.SphereGeometry(0.34, 16, 12), new T.MeshStandardMaterial({ map: tex.spiral, roughness: 0.4 }), 0, 0.42, -0.08, b);
    shell.scale.set(0.75, 1, 1);
    for (const s of [-1, 1]) {
      const st = G.mesh(new T.CylinderGeometry(0.03, 0.03, 0.34, 5), G.std('#ffd27a'), s * 0.09, 0.4, 0.5, b, false);
      st.rotation.x = 0.3;
      G.mesh(geo.eyeW, mat.white, s * 0.1, 0.58, 0.56, b).scale.setScalar(0.7);
      G.mesh(geo.pupil, mat.dark, s * 0.1, 0.59, 0.62, b, false).scale.setScalar(0.7);
    }
    return { g, b };
  }
  const critters = { hopper: null, lady: null, snail: null }; // { id, model }
  const floaters = []; // soaked critters floating away in a bubble
  function syncCritters(gm) {
    for (const kind of ['hopper', 'lady', 'snail']) {
      const c = gm[kind];
      let v = critters[kind];
      if (v && (!c || c.id !== v.id)) {
        if (!v.gone) scene.remove(v.model.g);
        critters[kind] = v = null;
      }
      if (!c) continue;
      if (!v) {
        const model = kind === 'hopper' ? makeHopper() : kind === 'lady' ? makeLady() : makeSnail();
        model.g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        scene.add(model.g);
        critters[kind] = v = { id: c.id, model, kind };
      }
      const m = v.model;
      if (kind === 'hopper') {
        const hop = Math.abs(Math.sin(time * 6.5));
        m.g.position.set(X(c.x), hop * 0.55, Z(c.y));
        m.g.rotation.y = Math.atan2(c.vx, c.vy * 0.4);
        m.b.rotation.x = -0.3 * hop;
      } else if (kind === 'lady') {
        m.g.position.set(X(c.x) + Math.sin(time * 5) * 0.08, 0.45 + Math.sin(time * 9) * 0.06, Z(c.y));
        for (const [i, w] of m.wings.entries()) w.rotation.y = (i ? -1 : 1) * (0.3 + Math.sin(time * 40) * 0.5);
      } else {
        m.g.position.set(X(c.x), 0, Z(c.y));
        m.g.rotation.y = c.vx > 0 ? Math.PI / 2 : -Math.PI / 2;
        m.b.scale.z = 1 + Math.sin(time * 4) * 0.08;
      }
    }
  }
  // a soaked critter: a bubble round it and up and away it floats
  function floatAway(kind, cx, cy) {
    const v = critters[kind];
    let g;
    if (v) {
      g = v.model.g;
      v.gone = true;
      critters[kind] = null;
    } else return; // never drawn (gone before a frame showed it)
    const bub = new T.Sprite(new T.SpriteMaterial({ map: tex.bubble, transparent: true, depthWrite: false }));
    bub.scale.setScalar(1.5);
    scene.add(bub);
    floaters.push({ g, bub, t: 0, vx: (Math.random() - 0.5) * 0.6, spin: (Math.random() - 0.5) * 3 });
    splash(cx, cy, 14, '#bfefff');
  }
  function updateFloaters(dt) {
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.t += dt;
      f.g.position.y += dt * (1.2 + f.t * 0.8);
      f.g.position.x += f.vx * dt;
      f.g.rotation.y += f.spin * dt;
      f.bub.position.copy(f.g.position);
      f.bub.position.y += 0.35;
      const k = clamp(1 - (f.t - 1.6) / 0.8, 0, 1);
      f.bub.material.opacity = k;
      f.g.scale.setScalar(0.3 + 0.7 * k);
      if (f.t > 2.4) {
        scene.remove(f.g);
        scene.remove(f.bub);
        floaters.splice(i, 1);
      }
    }
  }

  // ---------------------------------------------------------------- butterflies
  const flies = [];
  function butterfly(cx, cy, big) {
    const g = new T.Group();
    const m = new T.MeshBasicMaterial({ map: tex.wings[Math.floor(Math.random() * tex.wings.length)], transparent: true, side: T.DoubleSide, depthWrite: false });
    const wings = [];
    for (const s of [-1, 1]) {
      const pivot = new T.Group();
      g.add(pivot);
      const w = new T.Mesh(geo.wing, m);
      w.position.x = s * 0.32;
      w.rotation.x = -Math.PI / 2;
      if (s < 0) w.scale.x = -1;
      pivot.add(w);
      wings.push(pivot);
    }
    G.mesh(geo.flyBody, mat.dark, 0, 0, 0, g, false).rotation.x = Math.PI / 2;
    g.position.set(X(cx), 0.5, Z(cy));
    g.scale.setScalar(big ? 1.3 : 1);
    scene.add(g);
    const a = Math.random() * Math.PI * 2;
    flies.push({ g, wings, m, t: 0, vx: Math.cos(a) * 1.2, vz: -1.2 - Math.random() * 1.5, ph: Math.random() * 6 });
    sparkle(cx, cy, 6);
  }
  function updateFlies(dt) {
    for (let i = flies.length - 1; i >= 0; i--) {
      const f = flies[i];
      f.t += dt;
      const flap = Math.sin(f.t * 22 + f.ph);
      f.wings[0].rotation.z = 0.2 + flap * 0.9;
      f.wings[1].rotation.z = -0.2 - flap * 0.9;
      f.g.position.x += (f.vx + Math.sin(f.t * 3 + f.ph) * 1.2) * dt;
      f.g.position.z += f.vz * dt;
      f.g.position.y += (1.4 + flap * 0.8) * dt;
      f.g.rotation.y = Math.atan2(f.vx, f.vz) + Math.PI;
      f.m.opacity = clamp(1 - (f.t - 2.4) / 0.8, 0, 1);
      if (f.t > 3.2) {
        scene.remove(f.g);
        f.m.dispose();
        flies.splice(i, 1);
      }
    }
  }

  // ---------------------------------------------------------------- particles, points, confetti
  const parts = [];
  function particle(x, y, z, vx, vy, vz, color, size, life, grav) {
    let p = parts.find((q) => !q.on);
    if (!p) {
      if (parts.length > 400) return;
      p = { sp: new T.Sprite(new T.SpriteMaterial({ map: tex.dot, transparent: true, depthWrite: false })) };
      scene.add(p.sp);
      parts.push(p);
    }
    Object.assign(p, { on: true, x, y, z, vx, vy, vz, t: 0, life, size, grav });
    p.sp.material.color.set(color);
    p.sp.visible = true;
  }
  function updateParts(dt) {
    for (const p of parts) {
      if (!p.on) continue;
      p.t += dt;
      if (p.t >= p.life) { p.on = false; p.sp.visible = false; continue; }
      p.vy -= p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.03 && p.grav > 0) { p.y = 0.03; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; }
      p.sp.position.set(p.x, p.y, p.z);
      p.sp.scale.setScalar(p.size * (1 - (p.t / p.life) * 0.6));
      p.sp.material.opacity = 1 - Math.pow(p.t / p.life, 3);
    }
  }
  function splash(cx, cy, n, color) {
    for (let i = 0; i < (n || 10); i++) {
      const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 2.5;
      particle(X(cx), 0.5, Z(cy), Math.cos(a) * s, 2 + Math.random() * 2.5, Math.sin(a) * s, color || (i % 3 ? '#7fd7ff' : '#ffffff'), 0.16 + Math.random() * 0.12, 0.6 + Math.random() * 0.3, 12);
    }
  }
  function sparkle(cx, cy, n) {
    const cols = ['#ffffff', '#fff3a0', '#ffd400', '#ff9fd0'];
    for (let i = 0; i < (n || 10); i++) {
      const a = Math.random() * Math.PI * 2, s = 0.6 + Math.random() * 1.6;
      particle(X(cx), 0.6, Z(cy), Math.cos(a) * s, 1 + Math.random() * 2, Math.sin(a) * s, cols[i % cols.length], 0.14, 0.7, 2);
    }
  }
  function confetti(cx, cy, n) {
    const cols = ['#ff3d7f', '#ffd400', '#18d4ff', '#5fe3b5', '#ff8a1f', '#b98cff', '#ffffff'];
    for (let i = 0; i < (n || 60); i++) {
      const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 4;
      particle(X(cx), 2.5, Z(cy), Math.cos(a) * s, 4 + Math.random() * 5, Math.sin(a) * s, cols[i % cols.length], 0.2 + Math.random() * 0.12, 2.2 + Math.random(), 5);
    }
  }
  function rain(dt, on) {
    if (!on) return;
    for (let i = 0; i < 6; i++) {
      particle(X(Math.random() * W), 5 + Math.random() * 2, Z(Math.random() * ZONE_TOP), 0, -9, 0, i % 2 ? '#8fdcff' : '#ffffff', 0.12, 0.7, 4);
    }
  }
  const pops = [];
  const popTex = new Map();
  function points(cx, cy, text, color) {
    const k = text + (color || '');
    if (!popTex.has(k)) popTex.set(k, textTexture(text, color));
    const sp = new T.Sprite(new T.SpriteMaterial({ map: popTex.get(k), transparent: true, depthTest: false, depthWrite: false }));
    sp.renderOrder = 20;
    sp.scale.set(1.6, 0.6, 1);
    sp.position.set(X(cx), 1.2, Z(cy));
    scene.add(sp);
    pops.push({ sp, t: 0 });
  }
  function updatePops(dt) {
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i];
      p.t += dt;
      p.sp.position.y += dt * 1.4;
      p.sp.material.opacity = clamp(1 - (p.t - 0.5) / 0.4, 0, 1);
      if (p.t > 0.9) {
        scene.remove(p.sp);
        p.sp.material.dispose();
        pops.splice(i, 1);
      }
    }
  }

  // ---------------------------------------------------------------- squirts, and the brother's water arcs
  const shots = [];
  function makeShot() {
    const g = new T.Group();
    const d = G.mesh(geo.drop, mat.water, 0, 0, 0, g, false);
    d.scale.set(1, 1, 2.2);
    for (let i = 1; i <= 3; i++) {
      const t = G.mesh(geo.drop, mat.water, 0, 0, i * 0.32, g, false);
      t.scale.setScalar(0.75 - i * 0.15);
    }
    scene.add(g);
    return g;
  }
  function syncShots(gm) {
    gm.players.forEach((p, i) => {
      if (!shots[i]) shots[i] = makeShot();
      shots[i].visible = !!p.shot;
      if (p.shot) shots[i].position.set(X(p.shot.x), 0.62, Z(p.shot.y));
    });
    for (let i = gm.players.length; i < shots.length; i++) shots[i].visible = false;
  }
  const arcs = [];
  // a sprinkler arc of water from (fx, fy) to wherever target() says, over dur seconds; done() when it lands
  function arc(fx, fy, target, dur, done) {
    arcs.push({ fx, fy, target, dur, t: 0, done });
  }
  function updateArcs(dt) {
    for (let i = arcs.length - 1; i >= 0; i--) {
      const a = arcs[i];
      a.t += dt;
      const u = Math.min(1, a.t / a.dur), to = a.target();
      for (let k = 0; k < 3; k++) {
        const v = clamp(u - k * 0.06, 0, 1);
        const x = a.fx + (to.x - a.fx) * v, y = a.fy + (to.y - a.fy) * v;
        particle(X(x), 0.6 + Math.sin(Math.PI * v) * 3.2, Z(y), 0, 0, 0, k ? '#bfefff' : '#5ec8ff', 0.3 - k * 0.06, 0.25, 0);
      }
      if (u >= 1) {
        arcs.splice(i, 1);
        splash(to.x, to.y, 12);
        if (a.done) a.done();
      }
    }
  }

  // ---------------------------------------------------------------- people: the squirters and the brother
  function squirter(color) {
    const g = new T.Group();
    const body = G.std(color, { roughness: 0.4 }), dark = G.std('#2a2a3a'), tank = new T.MeshStandardMaterial({ color: '#7fd7ff', roughness: 0.15, transparent: true, opacity: 0.8 });
    G.mesh(new T.BoxGeometry(0.22, 0.2, 0.62), body, 0, 0, 0, g);
    G.mesh(new T.SphereGeometry(0.17, 12, 10), tank, 0, 0.2, 0.08, g);
    const n = G.mesh(new T.CylinderGeometry(0.05, 0.07, 0.3, 8), dark, 0, 0.02, -0.42, g);
    n.rotation.x = Math.PI / 2;
    G.mesh(new T.BoxGeometry(0.1, 0.22, 0.12), dark, 0, -0.16, 0.14, g);
    return g;
  }
  const GUN = { teddy: '#ff3d7f', tommy: '#ffd400' };
  // a person: mode 'play' (in the strip, squirter in hand), 'celebrate' (his signature moves, facing you), 'hello'
  // (one signature move), 'give', 'wave', 'stand'
  function makePerson(id, o) {
    o = o || {};
    const entry = Kit.roster.get(id);
    const scale = PERSON * (o.scale ? o.scale / 0.85 : 1);
    const root = new T.Group(), turn = new T.Group();
    root.add(turn);
    const p = Kit.people.build(Object.assign({}, entry.look, { peace: true }));
    p.root.scale.setScalar(scale);
    turn.add(p.root);
    p.root.traverse((q) => { if (q.isMesh) q.castShadow = true; });
    const gun = squirter(GUN[id] || '#5fe3b5');
    gun.position.set(0, 0.52, -0.62);
    p.hips.add(gun);
    let tag = null;
    if (o.tag) {
      tag = G.nameTag(entry.name.toUpperCase(), entry.tag || '#ffffff');
      tag.scale.multiplyScalar(0.6);
      tag.position.y = 2.25 * scale + 0.35;
      root.add(tag);
    }
    const seq = entry.signature && entry.signature.length ? entry.signature.slice() : ['wave'];
    let ball = null;
    if (seq.includes('jumpshot')) {
      ball = new T.Sprite(new T.SpriteMaterial({ map: G.emojiTexture('🏀'), depthWrite: false }));
      ball.scale.setScalar(0.4);
      ball.visible = false;
      root.add(ball);
    }
    const giggle = new T.Sprite(new T.SpriteMaterial({ map: G.emojiTexture('😆'), depthWrite: false }));
    giggle.scale.setScalar(0.6);
    giggle.position.y = 2.3 * scale + 0.3;
    giggle.visible = false;
    root.add(giggle);
    const st = { mode: 'play', t: 0, ph: 0, yaw: 0, hop: 0, spin: 0, blink: 0, ballV: new T.Vector3(), shot: false };
    const SEG = { boxing: 2.1, jumpshot: 1.9, peace: 2.0, wave: 1.6 };
    function segment(t) {
      const total = seq.reduce((s, m) => s + (SEG[m] || 1.6), 0);
      let u = t % total;
      for (const m of seq) {
        const d = SEG[m] || 1.6;
        if (u < d) return { mode: m, t: u };
        u -= d;
      }
      return { mode: seq[0], t: 0 };
    }
    return {
      id, root, p, gun, tag, seq, scale,
      get mode() { return st.mode; },
      // (yaw: which way to face for 'give': -π/2 faces right on screen, π/2 left)
      set(mode, yaw) {
        if (mode !== st.mode) {
          st.mode = mode;
          st.t = 0;
        }
        st.want = yaw;
      },
      // s: { moving, stun, safe, firing } from the rules
      update(dt, s) {
        s = s || {};
        st.t += dt;
        const m = st.mode, k = damp(14, dt);
        let wantYaw = 0, hop = 0, pose = 'stand', ph = st.t * 6;
        gun.visible = m === 'play';
        giggle.visible = false;
        if (m === 'play') {
          if (s.stun > 0) {
            // tickled: a giggling wobble, arms up laughing
            st.spin += dt * 14;
            pose = 'fall';
            wantYaw = Math.sin(st.spin) * 0.6;
            hop = Math.abs(Math.sin(st.spin * 0.8)) * 0.15;
            giggle.visible = true;
            giggle.position.x = Math.sin(st.spin) * 0.1;
          } else {
            st.ph += dt * (s.moving ? 12 : 0);
            pose = s.moving ? 'walk' : 'stand';
            ph = st.ph;
            wantYaw = 0;
          }
        } else if (m === 'celebrate' || m === 'hello') {
          const c = m === 'celebrate' ? segment(st.t) : { mode: seq[0], t: st.t % (SEG[seq[0]] || 1.6) };
          pose = c.mode;
          ph = st.t * 6;
          wantYaw = Math.PI + (c.mode === 'jumpshot' ? 0.5 : c.mode === 'boxing' ? 0.6 : 0);
          if (c.mode === 'jumpshot') hop = c.t > 0.15 && c.t < 0.95 ? Math.sin((Math.PI * (c.t - 0.15)) / 0.8) * 0.5 : 0;
          else if (c.mode === 'boxing') hop = Math.abs(Math.sin(st.t * 7)) * 0.04;
          else hop = Math.abs(Math.sin(st.t * 5.5)) * 0.18;
          if (ball) updateBall(c.mode === 'jumpshot' ? c.t : -1, dt);
        } else if (m === 'give' || m === 'wave') {
          pose = m;
          wantYaw = m === 'give' && st.want !== undefined ? st.want : Math.PI;
          ph = st.t * 6;
        } else {
          wantYaw = Math.PI;
        }
        if (ball && m !== 'celebrate' && m !== 'hello') ball.visible = false;
        st.yaw += (wantYaw - st.yaw) * damp(9, dt);
        turn.rotation.y = st.yaw;
        Kit.people.pose(p, ph, pose, k);
        if (m === 'play' && !(s.stun > 0)) {
          // both hands on the squirter
          for (const arm of [p.armL, p.armR]) {
            arm.rotation.x += (1.45 - arm.rotation.x) * k;
            arm.rotation.z += (0 - arm.rotation.z) * k;
          }
          p.armL.rotation.z = 0.25;
          p.armR.rotation.z = -0.25;
          if (s.firing) p.hips.rotation.x = -0.18;
        }
        if (['wave', 'peace', 'give', 'stand'].includes(pose) && m !== 'celebrate' && m !== 'hello') {
          p.legL.rotation.x *= 1 - k;
          p.legR.rotation.x *= 1 - k;
        }
        st.hop = hop;
        p.root.position.y = hop;
        // blink while safe after a tickle
        st.blink += dt;
        p.root.visible = !(m === 'play' && s.safe > 0 && !(s.stun > 0) && Math.floor(st.blink * 12) % 2);
      },
    };
    function updateBall(t, dt) {
      const RELEASE = 0.62;
      if (t < 0 || t > RELEASE + 1.1) {
        ball.visible = false;
        st.shot = false;
        return;
      }
      ball.visible = true;
      if (t < RELEASE) {
        ball.position.set(Math.sin(turn.rotation.y) * -0.2, (2.15 + 0.2) * scale + st.hop, 0.1);
        st.shot = false;
        return;
      }
      if (!st.shot) {
        st.shot = true;
        st.ballV.set(0.6, 4.4, -1.2);
        try { Kit.sound.swish(); } catch (e) { /* sound is optional */ }
      }
      st.ballV.y -= 9.8 * dt;
      ball.position.addScaledVector(st.ballV, dt);
    }
  }
  function placePerson(pp, cx, cy, extraY) {
    pp.root.position.set(X(cx), extraY || 0, Z(cy) + 0.15);
  }

  // ---------------------------------------------------------------- set-up, camera, drawing
  function init(canvas) {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    scene = new T.Scene();
    scene.background = new T.Color('#a9e5ff');
    scene.fog = new T.Fog('#a9e5ff', 45, 110);
    camera = new T.PerspectiveCamera(34, 1, 0.5, 260);
    scene.add(new T.HemisphereLight('#e8f8ff', '#5f9a3a', 0.8));
    sun = new T.DirectionalLight('#fff4dc', 1.05);
    sun.position.set(-8, 22, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 60;
    sun.shadow.bias = -0.0008;
    scene.add(sun, sun.target);
    // shared bits
    geo.stem = new T.CylinderGeometry(0.15, 0.19, 0.36, 10);
    geo.cap = new T.SphereGeometry(0.42, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    geo.under = new T.CircleGeometry(0.41, 18);
    geo.drip = new T.SphereGeometry(0.06, 8, 6);
    geo.seg = new T.SphereGeometry(0.44, 22, 16);
    geo.foot = new T.SphereGeometry(0.09, 8, 6);
    geo.antenna = new T.CylinderGeometry(0.022, 0.022, 0.42, 5);
    geo.antTip = new T.SphereGeometry(0.075, 10, 8);
    geo.eyeW = new T.SphereGeometry(0.1, 10, 8);
    geo.pupil = new T.SphereGeometry(0.05, 8, 6);
    geo.drop = new T.SphereGeometry(0.15, 10, 8);
    geo.wing = new T.PlaneGeometry(0.64, 0.64);
    geo.flyBody = new T.CapsuleGeometry ? new T.CapsuleGeometry(0.05, 0.3, 4, 8) : new T.CylinderGeometry(0.05, 0.05, 0.4, 6);
    tex.face = [faceTexture(false, false), faceTexture(false, true), faceTexture(true, false), faceTexture(true, true)];
    tex.dot = G.dotTexture();
    tex.bubble = bubbleTexture();
    tex.spiral = spiralTexture();
    tex.wings = [['#ffb3e0', '#ff6fb5'], ['#fff07a', '#ff9f1c'], ['#a9ecff', '#4fa8ff'], ['#d7b8ff', '#9a5cff'], ['#c4ff9a', '#4fcf5a'], ['#ffd1a6', '#ff6a3d']].map(([a, b]) => wingTexture(a, b));
    mat.stem = G.std('#fff1d6', { roughness: 0.8 });
    mat.under = G.std('#f3dcb8', { roughness: 0.9, side: T.DoubleSide });
    mat.caps = CAP_COLORS.map((c) => new T.MeshStandardMaterial({ map: capTexture(c, false), roughness: 0.55 }));
    mat.sticky = new T.MeshStandardMaterial({ map: capTexture('#9a3cff', true), roughness: 0.12, metalness: 0.1 });
    mat.drip = new T.MeshStandardMaterial({ color: '#c9ff6a', roughness: 0.1 });
    mat.segs = WAVE_COLORS.map((c) => G.std(c, { roughness: 0.45 }));
    mat.heads = WAVE_COLORS.map((c) => G.std(G.shade(c, 0.12), { roughness: 0.4 }));
    mat.dark = G.std('#1b1a22', { roughness: 0.6 });
    mat.white = G.std('#ffffff', { roughness: 0.4 });
    mat.antTip = G.std('#ffd400', { roughness: 0.4 });
    mat.lady = new T.MeshStandardMaterial({ map: ladyTexture(), roughness: 0.35 });
    mat.glass = new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, side: T.DoubleSide, depthWrite: false });
    mat.water = new T.MeshStandardMaterial({ color: '#7fd7ff', emissive: '#2a8fd6', emissiveIntensity: 0.45, roughness: 0.1, transparent: true, opacity: 0.9 });
    buildGarden();
  }
  function ladyTexture() {
    const [c, g] = G.makeCanvas(128, 64);
    g.fillStyle = '#ff2e3a';
    g.fillRect(0, 0, 128, 64);
    g.fillStyle = '#1b1a22';
    g.fillRect(62, 0, 4, 64);
    for (const [x, y] of [[20, 30], [44, 18], [44, 46], [84, 18], [84, 46], [108, 30]]) {
      g.beginPath();
      g.arc(x, y, 7, 0, Math.PI * 2);
      g.fill();
    }
    return G.toTexture(c);
  }

  // the garden's box, as seen by the camera: the lawn, the fences, the hedge and a squirter's height at the front
  const BOX = [];
  function box() {
    if (BOX.length) return BOX;
    const l = X(-0.5) - EDGE - 0.5, r = X(W - 0.5) + EDGE + 0.5, top = Z(-1.9), bot = Z(H - 1) + 1.0;
    for (const [x, z, y] of [[l, top, 0], [r, top, 0], [l, top, 1.2], [r, top, 1.2], [l, bot, 0], [r, bot, 0], [l, bot - 0.5, 1.6], [r, bot - 0.5, 1.6]]) BOX.push(new T.Vector3(x, y, z));
    return BOX;
  }
  const tmpV = new T.Vector3();
  function toPx(v) {
    tmpV.copy(v).project(camera);
    return { x: ((tmpV.x + 1) / 2) * view.w, y: ((1 - tmpV.y) / 2) * view.h };
  }
  // safe: { top, bottom, left, right } in px the garden must stay clear of
  function fit(safe) {
    const k = [view.w, view.h, safe.top, safe.bottom, safe.left, safe.right].join(',');
    if (k === view.key) return;
    view.key = k;
    const w = view.w, h = view.h, aspect = w / h;
    // tall screens look down steeply, wide ones at more of a slant
    const tilt = 1.2 - 0.3 * clamp((aspect - 0.55) / 1.1, 0, 1);
    const target = new T.Vector3(0, 0, Z((H - 1) / 2) + 0.2);
    const dir = new T.Vector3(0, Math.sin(tilt), Math.cos(tilt));
    camera.aspect = aspect;
    camera.clearViewOffset();
    camera.updateProjectionMatrix();
    const aw = Math.max(50, w - safe.left - safe.right), ah = Math.max(50, h - safe.top - safe.bottom);
    const place = (d) => {
      camera.position.copy(target).addScaledVector(dir, d);
      camera.lookAt(target);
      camera.updateMatrixWorld(true);
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const v of box()) {
        const p = toPx(v);
        x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
      }
      return { x0, x1, y0, y1 };
    };
    let lo = 4, hi = 400;
    for (let i = 0; i < 40; i++) {
      const d = (lo + hi) / 2, b = place(d);
      if (b.x1 - b.x0 <= aw && b.y1 - b.y0 <= ah) hi = d; else lo = d;
    }
    const b = place(hi);
    const ox = (b.x0 + b.x1) / 2 - (safe.left + aw / 2), oy = (b.y0 + b.y1) / 2 - (safe.top + ah / 2);
    camera.setViewOffset(w, h, ox, oy, w, h);
    camera.updateProjectionMatrix();
    toCam.copy(dir);
    // the shadows follow the garden
    sun.target.position.copy(target);
    sun.position.copy(target).add(new T.Vector3(-8, 22, 12));
  }
  function resize(w, h) {
    view.w = Math.max(1, w);
    view.h = Math.max(1, h);
    view.key = '';
    renderer.setSize(view.w, view.h, false);
  }

  // every frame: everything the rules say, drawn
  function sync(gm, dt, o) {
    o = o || {};
    time += dt;
    syncMushrooms(gm, gm.wave);
    syncSegments(gm, gm.wave);
    syncCritters(gm);
    syncShots(gm);
    updateFloaters(dt);
    updateFlies(dt);
    updateArcs(dt);
    rain(dt, o.rain);
    updateParts(dt);
    updatePops(dt);
    for (const f of fans) {
      f.cheer = Math.max(0, f.cheer - dt);
      const j = f.cheer > 0 ? Math.abs(Math.sin(f.cheer * 9)) * 0.9 : Math.abs(Math.sin(time * 1.6 + f.side)) * 0.08;
      f.sp.position.y = f.base + j;
    }
  }
  function cheer(s) {
    for (const f of fans) f.cheer = Math.max(f.cheer, s || 2);
  }
  function clearEffects() {
    for (const f of flies) { scene.remove(f.g); f.m.dispose(); }
    flies.length = 0;
    for (const f of floaters) { scene.remove(f.g); scene.remove(f.bub); }
    floaters.length = 0;
    for (const p of parts) { p.on = false; p.sp.visible = false; }
    for (const p of pops) scene.remove(p.sp);
    pops.length = 0;
    arcs.length = 0;
  }
  function render() {
    renderer.render(scene, camera);
  }
  // a garden cell (and a height) to screen pixels, for tests and for touch steering
  function toScreen(cx, cy, y) {
    return toPx(new T.Vector3(X(cx), y || 0, Z(cy)));
  }
  // how many screen pixels one cell is, across and up the garden, at a cell (touch steering)
  function cellPx(cx, cy) {
    const a = toScreen(cx, cy), b = toScreen(cx + 1, cy), c = toScreen(cx, cy - 1);
    return { x: Math.hypot(b.x - a.x, b.y - a.y), y: Math.hypot(c.x - a.x, c.y - a.y) };
  }

  GW.world = {
    init, resize, fit, sync, render, cheer, clearEffects, makePerson, placePerson, butterfly, splash, sparkle, confetti, points, floatAway, arc, toScreen, cellPx,
    get scene() { return scene; },
    get camera() { return camera; },
    X, Z,
  };
})();
