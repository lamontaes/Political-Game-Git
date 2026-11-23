---
id: play-address-middle-parts-america-beat
title: "The President's address cuts away to America in its middle parts"
area: play
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play
model: sonnet
effort: medium
root: design-director-on-core2
source: playtest Nov 23 row P8; the Player's post on #9995 (comment 7115790148)
checked: sonnet 2026-11-23
---

**What.** The address's middle beats are the House floor twice and home; the depot platform cutaway to America is gone. The owner's Oct 29 ruling has the cutaways alternate the President working with America, so a middle part should show the town. Since #10273 the beat is wrong in every life. Seen: on the address's second Continue in a new life.

**Cause.** Found in code: `partLevels` (`src/bench/montage.ts`) indexed sentences by their raw `part` number, but the player's parts are the distinct numbers in order (`partsOf`). A drawn world's address had sentence parts 0, 2, 3 and three parts, so part 1 read as empty and defaulted to "occasion", the chamber, and the country part was never reached (Muldraugh, Kentucky, seed `b60036534e9c`; Brewster, Kansas, seed `ae825a327e24`).

**Fix.** Read each part's level from its own distinct part number's sentences, skipping the salutation and an occasion lead-in, so a point block keys the part. No line changes.

**Time box.** 2 hours, one Sonnet session.

**Rules.** Replace, never layer: the fix changes the one `partLevels` function and adds no second montage path. One rule, all 56 places: no place or picture is named in logic, and the test draws its places.

**Done when.** A second session sees, in the running game, in two drawn lives, the address's middle beat is the depot platform and the LIVE corner is unchanged; `montage.test.ts` "middle parts cut away to America" fails on main and passes here.

**Waits on.** Nothing.

**Files.** src/bench/montage.ts, src/bench/montage.test.ts
