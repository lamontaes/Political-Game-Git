# Political Life Simulation

Foundation repository for a persistent American political-life RPG and autonomous political simulation. The current build contains authoritative documentation, a deterministic headless simulation, persistent character/history records, a Node-only SQLite save repository, automated tests, and a React developer viewer.

Lexington-Fayette, Kentucky is represented only by a clearly marked placeholder. No detailed real-world civic dataset is included yet.

## Requirements

- Node.js 22.13 or newer
- npm

## Commands

```sh
npm ci
npm run dev
npm run demo -- optional-seed
npm run test
npm run lint
npm run typecheck
npm run build
npm run validate
```

`npm run demo` executes the simulation under Node without React or a graphical environment. It creates a seeded world, advances time twice, materializes one lightweight person, replays the same actions, and reports whether the resulting world is reproducible.

## Documentation authority

Start with [AGENTS.md](AGENTS.md), then read the [Game Constitution](docs/GAME-CONSTITUTION.md). The Constitution is the highest-authority product document; implementation convenience does not override it.

## Current boundary

The implemented life-history foundation stores typed biography, rich events, memories, knowledge, claims, relationship interactions, generic queries, versioned snapshots, and validated SQLite saves. It does not yet provide a desktop save picker or cross-version migrations. Elections, legislation, autonomous careers or families, staff, polling, full belief behavior, and Observer Mode remain future systems—not partially implemented features.
