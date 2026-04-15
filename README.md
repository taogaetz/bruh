# BRUH

BRUH is a small browser platformer prototype built with Phaser 3 and SvelteKit.
The current build is basically a stripped-down Spelunky-ish run: procedural rooms, a start screen, simple movement, an exit marker, and infinite level regeneration when you reach the exit.

Not gonna lie: this repo still has some template DNA in the package metadata and a telemetry helper script. The game itself is the source of truth, not the old template copy.

## What is in the game right now

- 4x4 room-based procedural level generation
- guaranteed start-to-exit solution path
- side rooms and snake-pit variants in the generator
- simple arcade movement and jumping
- bomb action wired to `F`
- exit marker that advances you to the next generated level
- Svelte overlay for the title / start screen, Phaser for the game itself

## Controls

- Left / Right or A / D: move
- Up or W: jump
- F: bomb

## Tech stack

- SvelteKit
- Phaser 3
- TypeScript
- Vite

## Project structure

- `src/routes/+page.svelte` — Svelte shell and start-menu overlay
- `src/PhaserGame.svelte` — bridge component that mounts Phaser inside Svelte
- `src/game/scenes` — Boot / Preloader / MainMenu / Game scenes
- `src/game/level` — procedural room and path generation logic
- `static/assets` — static assets loaded by Phaser
- `scripts/lint-no-local-references.mjs` — guardrail against shipping local-only refs

## Local development

Requirements:
- Node.js
- npm

Install:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

If you do not want the Phaser template telemetry ping from `log.js`, use:

```bash
npm run dev-nolog
```

## Checks

Lint + typecheck:

```bash
npm run lint
```

This runs `svelte-check` and a repo scan that fails if tracked text files contain machine-specific references like:
- loopback hostnames
- private/local IP addresses
- Unix home-directory paths
- Windows drive-letter paths
- Docker host shortcuts

Build:

```bash
npm run build
```

Telemetry-free build:

```bash
npm run build-nolog
```

Production output goes to `build/`.

## Notes

- SSR is disabled in `src/routes/+layout.js` because Phaser is browser-only here.
- Most placeholder visuals are generated in code during preload rather than coming from final art assets.
- If the README and the game disagree, the code wins.
