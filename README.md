# Political life simulation

A political and government RPG with a full life simulation underneath: the player turns 18 in a real American place, runs for office, and governs while the people, money and places around them react. The engine is TypeScript (`src/core2`). The game runs in the bench (`src/bench`) and in the Electron desktop shell (`desktop/`).

## Run it

Requires Node.js 22.13 or newer.

```sh
npm ci
npm run bench   # the game at http://localhost:3000/play, Dev mode beside it
```

Run world builds, full suites and package builds in a cloud environment, not on a laptop (`AGENTS.md`, "Workspaces and storage").

## Read next

- `AGENTS.md`: the rules every contributor and agent follows.
- `ARCHITECTURE.md`: how the game is built.
- `docs/README.md`: which docs are current and which are history.
- `docs/pool/README.md`: all the work, one file per item.
