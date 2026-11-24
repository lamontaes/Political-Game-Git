---
id: office-member-panel-lists-names-without-saying-who-they-are
title: 'Your office''s right panel, titled with the player''s office ("Commissioner"), lists the other members'' names and never says who they are'
area: play
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
model: sonnet
effort: medium
root: none
source: "Account lead T56, Nov 14, 2026, from the Words lead's read of #9126 and its Your office screens (screen absent-row.png)"
checked:
claimed-at:
---

**What.** The panel titled \"Commissioner\" shows a line of names (\"Judy Middleton · Avery Page · Luna Fields\") and a Draft a bill button. Nothing says these are the other members of the player's body, and the player's own name is among them. Seen: Politics, then Your office, in the screens at /mnt/project-files/t56/heber2/ (Potter Lake, Wisconsin, seed fb9b371a2c260c1e5bd2ea80924b870a320f30742d81a7daca8fe7535f0c943d).

**Cause.** Needs cause. The panel's source in src/bench/play.mjs was not traced.

**Fix.** None until the cause is found.

**Time box.** 1 hour for one Sonnet session at medium effort, after the cause is found.

**Rules.** No hand-written player text in code; words come from controls.json or the English engine, with the Words lead's read.

**Done when.** A second session opens Your office as a council member in a drawn place, on main, and the panel says in words who the listed people are, and the player is not listed among them.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/office.ts, src/bench/data/controls.json

**Notes.**
