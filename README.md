# TT Garden Worm

[![TT Garden Worm title screen](docs/screenshot.jpg)](https://adong.github.io/garden-worm-tt/)

Press **?** any time (or tap the round **?** button in the top left corner) to see the keys. The game waits while you look.
Tap the language button under it (the A文 icon) to switch between English and 中文; the dashboard and every game remember the choice.

**中文：** 花园毛毛虫：一条咯咯笑的长毛毛虫从篱笆钻进花园，在蘑菇之间爬下来。你拿着水枪在花园最下面跑来跑去，喷到毛毛虫的哪一节，那一节就变成蝴蝶飞走，留下一个蘑菇，毛毛虫也从那里断成两条，每条都有自己的头。蘑菇要喷 4 下才冲得掉。叫兄弟来，他会带来好吃的，再来一场洒水风暴，把 5 节毛毛虫变成蝴蝶。

An arcade game for Teddy and Tommy, in our own silly style. A long caterpillar of round, giggling segments wiggles in through the hedge at the top of a toy garden and winds down through a mushroom patch. You run along the strip at the bottom with a water squirter. Every segment you squirt turns into a butterfly and flutters away, leaves a mushroom where it was, and the caterpillar splits in two right there, each part with its own head. Clear every wave to save the garden. A hopping grasshopper, a ladybug who drops new mushrooms and a snail who makes mushrooms sticky join in; anyone you squirt floats off in a bubble. Nobody gets hurt: a caterpillar or a grasshopper that bumps you just tickles you (you lose a heart and giggle for a moment).

It's built with Claude Code from plain JavaScript and Three.js, in the same style as Metro Surfer and the other Teddy & Tommy games. There are no image, model or audio files: the garden, the caterpillars and the critters are spheres, boxes and canvas textures, Teddy and Tommy come from the shared kit (`kit/`), and every sound is synthesised.

The name lives in one place, [js/title.js](js/title.js).

## Play

- **Double-click `index.html`.** It works offline, because Three.js and the kit are copied into `kit/`. Without internet the logo falls back from the Bungee font to Arial Black.
- **Send one file:** `dist/garden-worm-tt.html` is the whole game in one file. AirDrop or email it, then open it in a browser.
- **Rebuild that file** after any edit: `python3 kit/tools/bundle.py . --name garden-worm-tt`
- **Get kit updates** from `~/claude-games/kit`: `python3 ../kit/tools/sync.py .`, then rebuild.
- **On the home screen** pick who plays (TEDDY, TOMMY or BOTH) and 🐣 EASY or 🔥 NORMAL, then ▶ PLAY!. Behind the menu a pretend player squirts away at a demo garden.
- **A game** starts with 3, 2, 1, GO! The score, the HI-SCORE to beat, the wave (🐛 1/3) and your hearts are at the top.
- **The win:** clear the last wave and the squirters line up in the middle of the strip and do their signature moves (Teddy's boxing combo, then his 🏀 jump shot; Tommy's Y with peace fingers ✌️) while confetti flies, then the results: score, waves, butterflies, and the HI-SCORE table. Lose your last heart and it's 😆 TICKLED OUT!, with the same table. ↻ PLAY AGAIN starts a new garden, 🏠 HOME goes back.
- **HI-SCORE table:** Foxy 🦊 and Froggy 🐸 are on it from the start (🐣 3000 and 1500, 🔥 6000 and 3000), for the boys to beat. Each brother's best (and the brothers' best together) joins them. Saved per browser, with who plays and the level; `index.html` and `dist/garden-worm-tt.html` each keep their own.

### The garden

- **The grid** is 17 cells across and 20 down. The bottom 5 rows (the lighter strip with the dashed line) are where the squirters run. Mushrooms start in the patch above it, never two side by side.
- **The caterpillar** moves one cell at a time, the body following the head. The head goes sideways until it meets a mushroom or the edge, then drops a row and turns round. In the strip it wanders up and down until it's squirted.
- **Squirting:** one squirt at a time per boy, straight up the column he stands in (let go of ← → and he slides to the middle of the nearest column). A head is worth 100, a body segment 10, a mushroom washed away 5, the grasshopper 300, the ladybug 200, the snail 500, a cleared wave 500.
- **Mushrooms** take 4 squirts; they shrink with each one. Squirts can't get through a mushroom, so it shields the caterpillar behind it.
- **The squirter is never boxed in:** he steps over mushrooms, so nothing in the strip can trap him.
- **The grasshopper** hops in zig-zags across the strip and nibbles mushrooms it lands on. **The ladybug** flies straight down a column when the strip has few mushrooms, dropping new ones. **The snail** crawls across the patch and makes the mushrooms it passes sticky (shiny purple, dripping): a head that bumps a sticky mushroom slides straight down to the bottom row.
- **Each wave** has its own colours: green, orange, pink, blue caterpillars, with matching mushroom caps. Foxy and Froggy cheer from the hedge when a wave clears.

### Levels

| | 🐣 EASY (Tommy, 5) | 🔥 NORMAL (Teddy, 8) |
|---|---|---|
| Caterpillar | 8 segments, 4.2 cells a second (+0.5 each wave) | 12 segments, 6.5 cells a second (+0.8 each wave) |
| Waves | 3 | 4 |
| Hearts | 5 | 3 |
| Mushrooms at the start | 18 | 28 |
| Grasshopper | every 14 to 20 s, slow | every 7 to 11 s, quicker |
| Ladybug | from wave 2 | from wave 1 |
| Surprise | none | baby heads crawl in from the sides while a caterpillar is in the strip |
| After a tickle | 3.2 s of blinking safety | 2.6 s |

With 2 players the brothers share the hearts and get 2 more (🐣 7, 🔥 5), and share one score.

## Controls

| | 1 player | Teddy (2 players) | Tommy (2 players) |
|---|---|---|---|
| Run | ← → ↑ ↓ or W A S D | W A S D | ← → ↑ ↓ |
| Squirt (hold to keep squirting) | Space or Enter | Space | Enter |
| Call your brother · high five | T | T | T |
| Pause | P or Esc | | |
| Sound on / off | M | | |

- **Home screen:** ← → (or A D) pick who plays, 1 2 3 pick Teddy, Tommy or both, ↑ ↓ (or W S) change the level, Enter or Space plays. On the results, Enter or Space plays again, Esc or H goes home.
- **Touch:** put a finger down anywhere and slide it: the squirter follows the finger (one cell of finger travel is one cell in the garden) and squirts while the finger is down. With 2 players, Teddy uses the left half of the screen and Tommy the right. Tap your brother's face (or ✋ with two players) in the bottom left corner.
- **The ? panel, the language button and the speaker** sit in a column in the top left corner. The garden is fitted into the space the score, the buttons and the brother's face leave free: on a phone held upright the score sits above it and the face below; held sideways the score runs down the right-hand side.

## Companion

- **Call your brother any time, as often as you like:** press T or tap his face in the bottom left corner (Kit.roster.buddyFor picks him: Tommy for Teddy, Teddy for Tommy).
- He pops in beside you at his buddy size and does his signature move: Tommy's Y ✌️, or Teddy's boxing.
- He tosses you a treat (🍦 💧 🧃 🍪 🍉 🍌): "🍪 COOKIE FROM TOMMY!", and gives back a ❤️ if you've lost one.
- Then his helper: **"TOMMY SAYS: SPRINKLER STORM!"** It rains over the garden and five arcs of water fly from him, one after another, each at the caterpillar segment nearest you: 5 segments turn into butterflies (the caterpillar splits at each one, and the sprinkler leaves no mushrooms). Fewer than 5 left? They all go, and the wave clears.
- He waves goodbye and pops off. Call him again (even while he's still there) and he does it all again, treat and storm too.
- **With two players,** T (or the ✋ button) is a high five: the brothers turn to each other and slap hands.

## How it was checked

- **`node tools/check.js`** (well under a second), the headless checks of the rules in [js/checks.js](js/checks.js), the same as `game.check()` in the page:
  - **split:** an 8-segment caterpillar squirted at segment k = 0, 1, 3, 6 and 7 leaves 7 | 1+6 | 3+4 | 6+1 | 7 segments, each part in order with the right head; a fresh mushroom is where segment k was; the scores and the butterfly count are right; and on the next tick the back part's new head meets that mushroom, drops a row and turns round.
  - **drop:** a head drops a row and turns round at a mushroom, at the right edge and at the left edge, the body following; on open grass it goes straight on; at the bottom row it heads back up and at the top of the strip back down; a sticky mushroom slides it straight to the bottom row (15 ticks from row 4).
  - **mushrooms:** plain and sticky ones go 3, 2, 1, gone with each squirt, score 5 when washed away, shield a segment behind them until they're gone, and then the next squirt reaches it.
  - **wave:** squirting every segment clears the wave, the next wave's caterpillar comes in whole, and clearing the last wave wins the garden.
  - **autopilot:** the pretend player clears wave 1 on 🐣 EASY on 16 of 16 seeds (about 11 s each, no hearts lost).
  - **sprinkler:** 5 calls change 5 segments into butterflies (the ones nearest the squirters first) and leave no mushrooms and no empty caterpillars; with only 2 segments left it changes both.
  - **unstuck:** after a tickle he can't move for the 1.2 s giggle and then moves; a minute of random keys keeps him in the strip, and every key moves him within 0.2 s.
- **`node tools/check.js --fail`**, the fail variant: each check is run with its own mistake planted in the rules (a squirt also loses the segment behind; heads crawl through mushrooms; mushrooms wash away after 3; the wave never clears; the pretend player aims 5 columns off and never squirts; the sprinkler leaves mushrooms; the giggles never end). All 7 checks FAIL, so each one can.
- **`node tools/keys.js`** (3 to 5 minutes, headless Chrome, muted): the real-key play check in [tools/keys-checks.js](tools/keys-checks.js). It plays with real keydown / keyup events on window and touch pointer events, never game.step or the autopilot for the moving, and reads where the boy is drawn on screen with the game's own camera:
  - **directions:** on every wave of 🐣 EASY (3) and 🔥 NORMAL (4), as Teddy and as Tommy, → ← ↑ ↓ and D A W S move him that way on the screen, and Space and Enter squirt: 140 of 140 presses.
  - **twoPlayers:** W A S D + Space move and squirt only Teddy, the arrows + Enter only Tommy, the right way: 20 of 20.
  - **touch:** a finger sliding right, left, up or down moves him that way, about as far as the finger went; with 2 players the left half steers only Teddy and the right half only Tommy: 8 of 8.
  - **unstuck:** a tickle holds him for the giggle and then a held key moves him again; a pause, the window losing focus and the ? panel never leave a key stuck down; a ring of 8 mushrooms all round him never boxes him in; he keeps moving while his brother visits: 17 of 17.
  - The headless test browser draws only a few frames a second, so the check waits in real frames and in the game's own clock rather than milliseconds (its first version, with millisecond waits, read stale positions).
  - **`node tools/keys.js --fail`** plants two mistakes first (← and → swapped, and a tickle that never ends): directions (84 of 140), twoPlayers (12 of 20) and unstuck (5 of 17) FAIL, exit 1. Touch still passes, as it should: neither mistake is in the finger steering.
- **In the browser** (muted; headless Chrome and the Browser pane): both levels, 1 player and 2, the brother's visit (signature move, treat, sprinkler storm, called again mid-visit), high fives, critters soaked, tickles, pause, the ? panel, wave clears, winning, being tickled out, results; a real-time run on the page's own frame loop. 中文: every screen of both levels and all three who-plays choices visited with `Kit.lang.untranslated()` returning [], and all 19 kinds of toast read in Chinese. English: no Chinese on the page except the kit's language button. No console errors. 60 frames a second in the Browser pane at 1024x768.
- **The single page** `dist/garden-worm-tt.html` opened from file:// in headless Chrome: `game.check()` passes, `game.check({ fail: true })` fails 7 of 7, and a whole 🐣 game plays through to 🏆 TOMMY WINS!.
- **Layouts** in headless Chrome (`node tools/shoot.js tools/shots-layout.json <dir> <width> <height> 1`): phone portrait 390x844, phone landscape 740x360, iPad 1024x768 and 820x1180. `docs/screenshot.jpg` is the title screen at 1200x750 (`node tools/shoot.js tools/shots.json docs 1200 750`). `tools/shots-tour.json` visits every screen.

## Files

- [index.html](index.html): the page, its styles and the menus.
- [js/title.js](js/title.js): the name.
- [js/rules.js](js/rules.js): the rules with no drawing: the grid, the caterpillar's moves, squirts, splits, mushrooms, the critters, tickles, waves, the sprinkler, the pretend player.
- [js/checks.js](js/checks.js), [tools/check.js](tools/check.js): the headless checks and their fail variant.
- [js/world.js](js/world.js): the 3D garden, the mushrooms, the giggling segments, the critters, the squirters, butterflies, splashes, confetti, and the camera.
- [js/game.js](js/game.js): the game: home, count-in, keys and touch, the brother's visit, high fives, the HUD, results.
- [js/keys.js](js/keys.js), [js/zh.js](js/zh.js): the ? panel and the 中文 words.
- [tools/keys.js](tools/keys.js), [tools/keys-checks.js](tools/keys-checks.js): the real-key play check.
- [tools/shoot.js](tools/shoot.js): screenshots with headless Chrome.

## Not verified

- **Sound:** every test ran muted, so none of it has been heard; the sounds are checked in code only.
- **Real touch devices:** an iPhone or iPad, iOS Safari, two kids sharing one iPad. The touch check used synthetic touch pointer events.
- **Real kids:** whether 🐣 EASY is easy enough for Tommy and 🔥 NORMAL a good game for Teddy. The pretend player is a perfect shot, so its times say little about a 5-year-old's.
- **Kit:** after switching 中文 → English, the kit's ? panel keeps its Chinese until it's opened again (kit behaviour, not changed here).
- **The iPad home-screen icon** (🐛 on marigold orange) and double-click from Finder.
