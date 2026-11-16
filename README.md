# Gloamkeeper

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/wahanex2/best-game-entry/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/wahanex2/best-game-entry/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Night after night the gloom crawls out of the sea, hungry for the last light
on the coast. You are its keeper. Hold the lighthouse through 10 waves — and
whatever stirs behind them.

Gloamkeeper is a top-down arcade survival game: move around a night island,
aim with the mouse, and fire bolts of light at the creatures crawling toward
the lighthouse. Every cleared wave offers a choice of three boons — brighter
bolts, multishot, piercing light, a sturdier cloak, a faster dash, lighthouse
repairs, and more — so each run builds differently. Survive all 10 waves and
slay the Herald of the Gloom to see the dawn. Lose if the lighthouse light
runs out, or if the keeper falls.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Move |
| Mouse | Aim |
| Hold left click | Fire light bolts |
| Space / Shift | Dash (briefly untouchable) |
| 1–3 | Pick a boon between waves |
| P | Pause |
| M | Sound on/off |
| R | Restart after the end |

## Enemies

- **Skitter** — fast, fragile, weaves as it closes in.
- **Crawler** — the steady bulk of the gloom.
- **Hulk** — slow, armoured, and devastating to the lighthouse.
- **Splitter** — bursts into three mites when slain.
- **Spitter** — keeps its distance and fires gloom orbs.
- **The Herald** — the wave-10 boss: spawns skitters and fires rings of orbs.

## How to run

No build step, no dependencies, no network requests. Everything is static
files under `game/`, with procedural canvas art and synthesized WebAudio
sound — nothing is fetched from the internet.

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. (Any static file server
works; open `game/index.html` directly and the ES modules will not load under
`file://` in some browsers, so serve it over HTTP.)

## Self-check

Open http://localhost:8080/?test=1 — a scripted check drives the real loop
through start, movement, dash, firing, spawning, kills, the boon draft,
pause, the lose path, restart, and the win path, and reports
`window.__testResult`.

## Structure

```
game/
  index.html      canvas + HUD markup + styles
  src/
    main.js       boot, fixed-timestep loop, ?shot= hooks, ?test=1 self-check
    game.js       state machine, combat, collisions, scoring
    art.js        all procedural drawing (island, lighthouse, creatures)
    enemies.js    creature kinds, AI, spawning, boss behaviour
    waves.js      the 10 wave compositions and scaling
    upgrades.js   the boon pool and draft logic
    hud.js        HUD bars, banners, menus, draft cards
    input.js      keyboard + mouse state
    audio.js      synthesized WebAudio sound
    effects.js    particles, floating text, screen shake
    rng.js        seeded random numbers
```

## License

MIT — see [LICENSE](LICENSE).
