---
id: elections-territory-village-player-race
title: "A New Game life in an American Samoa village finds no local race to enter in six years"
area: elections
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: elections
standard: 2
model: sonnet
effort: high
root: rc9-place-facts-one-default
checked: fable 2026-11-10
---

**What.** A New Game life in an American Samoa village finds no local race to enter in six years. In Malaeimi, American Samoa (territory:AS:malaeimi, replay f857db7436bf7449, the fixed town list's Cabo Rojo number), the path check on main listed no contest the player could enter from 2025 to 2031: no local office the player may run for exists or comes up. The golden path starts with a local race in every one of the 56 places; American Samoa's own elected local government (village and county offices, or the Fono's House districts) has no race the player is offered. Without a local race the file-for-office step cannot start there. Seen: a New Game life in an American Samoa village finds a local race to file for (golden path in all 56 places).

**Cause.** Measured: path check on main in Malaeimi, American Samoa (territory:AS:malaeimi, replay f857db7436bf7449), `node --import tsx src/bench/path-check.ts` with `GOLDEN_PATH_SEED=f857db7436bf7449 GOLDEN_PATH_PLACE_KEY=<the territory key>`, lists no contest the player can enter from 2025 to 2031. The cause is a data gap: no local contest rows for the territory in the data the one election engine reads.

**Fix.** Research what American Samoa elects locally and when, and add those offices and calendar rows (with citations) to the data the one election engine reads (`src/core2/data/elections`, `src/core2/modules/offices.ts`), so the player is offered a race within two years of turning 18.

**Time box.** 8 hours for one sonnet session.

**Rules.** One rule, all 56 places: a territory's offices are data rows the one election engine reads; no per-place code path. Research before building: what American Samoa elects locally and when, cited. Estimate, never UNKNOWN.

**Done when.** A second session starts a New Game in a drawn American Samoa place (named with its seed) and runs the path check, and sees the player filed for a race within two years of turning 18, named by contest id, on the Campaigns screen; the offices and calendar rows cite their source.

**Waits on.** Nothing.

**Files.** src/core2/modules/elections.ts, src/core2/modules/offices.ts, src/core2/data/elections/municipal-cycles.json, src/bench/path-check.ts

**Notes.** Filed by Lane 1, Nov 4, from the fixed-town measure.
