/* The keys the ? panel shows. Press ? (Shift + /) in the game, or tap the round ? button (top left).
   The panel and the freeze live in the shared kit: kit/help.js (Kit.help). */
Kit.help.setup({
  title: window.GW_TITLE,
  cols: ['Teddy', 'Tommy'],
  keys: [
    ['run', 'W A S D', '↑ ← ↓ →'],
    ['squirt', 'Space', 'Enter'],
    ['call your brother · high five', 'T', 'T'],
    ['who plays', 'A D', '← →'],
    ['level 🐣 / 🔥', 'W S', '↑ ↓'],
    ['play! · again', 'Space', 'Enter'],
    ['pause', 'P or Esc', 'P or Esc'],
    ['sound on / off', 'M', 'M'],
  ],
  note: 'Squirt the caterpillar: every segment you squirt turns into a butterfly, leaves a mushroom and splits the caterpillar in two. Mushrooms take 4 squirts. In 1 player both sets of keys work, and T calls your brother: he brings a treat and a sprinkler storm that turns 5 segments into butterflies. With 2 players, T is a high five.',
  touch: 'Put a finger down and slide it to run; the squirter squirts while your finger is down (with 2 players, Teddy uses the left half and Tommy the right). Tap your brother\'s face to call him.',
  button: { top: 'calc(env(safe-area-inset-top, 0px) + 10px)', left: 'max(10px, env(safe-area-inset-left, 0px))' },
});
// The language button goes right under the ? button, and the kit's speaker under that: a column in the top left corner.
Kit.lang.setup({ button: { top: 'calc(env(safe-area-inset-top, 0px) + 58px)', left: 'max(10px, env(safe-area-inset-left, 0px))' } });
