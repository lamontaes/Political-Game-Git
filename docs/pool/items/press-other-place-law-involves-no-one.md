---
id: press-other-place-law-involves-no-one
title: "Another state's new law counts every reader as involved, so it crowds the President's address out of the national news"
area: core
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/red-press-other-state-law
pr: #8761
after:
blocked-on:
lead: laws
model: opus
effort: medium
root: rc1-world-outside-town
source: red on main in src/director/opening-story.test.ts, found by the federal views helper on Nov 11, 2026
checked:
claimed-at: 2026-11-11T08:30:00.000Z
branch: claude/red-press-other-state-law
---

**What.** In Arrowhead Springs, Wyoming (seed `da5c1844fcee4270`), no national outlet printed the President's inaugural address within four weeks, and the opening-story check "is printed by the press as national news within weeks" fails on main (also Carnuel, New Mexico, seed `12aef90a529b9e19`). In the week of February 3, every national desk printed a Hawaii law taking effect instead. Seen: the national stories in dev mode's news in a new life's first weeks.

**Cause.** Found in code: `involved` in `runDesk` (src/core2/press-desk.ts) counts, for a law taking effect, the followers its law-reach records name, and when none are named it counts every named follower, "since a law in force binds the town". A law of another state reaches no one here, so it fell through to every follower plus the counted ones, the largest people term on the wire.

**Fix.** A law whose jurisdiction is not in the town's law chain (`lawChain(api).levels`: the nation, its state, county, township and city) involves no follower. Nothing else changes.

**Time box.** 1 hour.

**Rules.** One rule, all 56 places: the chain is read from the laws engine, no state is named. No dice.

**Done when.** src/core2/press-other-state-law.test.ts passes on a fresh draw and on the named case; undone, the named case fails with a South Carolina law's story at a people term above 0. A second session on main, in a drawn place it writes down with its seed, reads the national stories of a new life's first six weeks in dev mode and finds no other state's law printed above the President's address for reach.

**Waits on.** Nothing.

**Files.** src/core2/press-desk.ts, src/core2/press-other-state-law.test.ts (new)

**Notes.** The address also ties a cabinet nomination in the week of January 27 and loses on the alphabet; that half is press-address-ties-break-on-the-alphabet.
