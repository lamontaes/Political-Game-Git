---
id: golden-path-drawn-key-with-no-player-throws
title: "A golden-path spec throws while building when its drawn place has no adult in a household"
area: play
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by: red-main
pr:
after:
blocked-on:
lead: world
source: "Blockers and Handoff on the crew issue 9747, Nov 17, 2026, from the golden-path-year job on PR #9795"
model: fable
effort: medium
root: none
---

**What.** A pull request's golden-path check goes red on a spec the pull request never touched. The spec's drawn place is a colony, a prison town or a barracks, where every adult lives in group quarters, so the world build throws before day one. Nothing a player sees changes.
Seen: the golden-path-year job of #9795, spec M1-11 at Spink Colony, South Dakota.

**Cause.** Measured: at Spink Colony, South Dakota (4660180), seed 21d14f456ab919b7b3861ddb44b75227a50ad06f4afe5a70150e42b576267963, by `GOLDEN_PATH_SEED=21d14f456ab919b7b3861ddb44b75227a50ad06f4afe5a70150e42b576267963 GOLDEN_PATH_PLACE_KEY=4660180 node --max-old-space-size=8192 --import tsx src/bench/m1-11-check.ts` on main 74e6551b: the build throws `NoPlayerHereError` (all 81 adults live in group quarters) from `entrantChoice` in src/bench/world.ts. The runner draws one place per spec from every locality (tests/golden-path/place.ts) and hands the key to the command. `passOver` in src/bench/world.ts passes such a place over for a new game's draw but throws when a key is given, and the runner's key is a draw, not an ask. Nine bench checks and about 35 test files build by that key. At least 94 of the 32,508 localities hold nearly everyone in group quarters.

**Fix.** In `passOver` (src/bench/world.ts), a key that is the runner's drawn key (`GOLDEN_PATH_PLACE_KEY`) is passed over like a new game's draw: the build takes the same state's next place by key, names the place passed over on stdout and in the world's opening record, and dev mode's "How this world opened" shows it. A place asked for by key any other way still throws.

**Time box.** 2 hours for one session at medium effort. When it runs out, push what is found, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: no place is named in the logic, and the test draws its place. No dice: passing a place over is seeded generation of where the world opens, never an actor's outcome.

**Done when.** A second session, not the builder, runs a golden-path check's command with the runner's key set to a drawn place where every adult lives in group quarters (for example Spink Colony, South Dakota, seed 21d14f456ab919b7b3861ddb44b75227a50ad06f4afe5a70150e42b576267963), sees it name the place passed over and finish in the same state's next place, opens dev mode's "How this world opened" there and reads the passed-over row, and says so with `npm run pool -- seen`.

**Waits on.** Nothing.

**Files.** src/bench/world.ts, src/bench/new-game-passover.test.ts
