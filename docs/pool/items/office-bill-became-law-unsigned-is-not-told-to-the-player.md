---
id: office-bill-became-law-unsigned-is-not-told-to-the-player
title: "A bill that becomes law unsigned while the desk stop is off is never told to the player"
area: office
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: "Account lead T56, Nov 14, 2026, from the Words lead's read of #9126 and its Your office screens (the desk test at Bedford, Kentucky)"
checked:
claimed-at:
---

**What.** With the desk switch Off, a passed ordinance sat on the mayor's desk until its deadline and became law unsigned (Bedford, Kentucky, 2104816, seed 32c170e3abe9f5f7feb31111bbc126194618a4cd9a3170a4679fe58824228764: the deadline was Feb 2, 2025 and the ordinance lapsed into law on Feb 3, 2025). The owner ruled on Nov 14, 2026 (card, 06:08Z) that this real-life rule stands and the Journal says so. Nothing tells the player. Seen: Politics, then Your office, and the Journal, after the deadline with the desk switch Off. Seen: Politics, then Your office, in the screens at /mnt/project-files/t56/heber2/ (Potter Lake, Wisconsin, seed fb9b371a2c260c1e5bd2ea80924b870a320f30742d81a7daca8fe7535f0c943d).

**Cause.** Found in code: `deadlinePassed` in src/core2/modules/legislature.ts calls `enact` with action \"unsigned\" and emits no event of its own; the only events on the bill are `bill-presented` (the day it reached the desk) and the law's own `law-takes-effect`, neither of which says it became law without the mayor's signature. I did not read the Journal's rendering, so the player-facing gap is inferred from the events, not seen on a screen.

**Fix.** Design: `deadlinePassed` emits one public-record event naming the bill, the executive and that the deadline passed unsigned; the Journal and the paper word it (\"became law without the mayor's signature\") through the English engine; the rule itself does not change.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** No hand-written player text in code; words come from controls.json or the English engine, with the Words lead's read.

**Done when.** A second session plays a mayor with a veto in a drawn place, on main, switches Bills on my desk Off, lets a passed ordinance reach its deadline, and the Journal says it became law without the mayor's signature, in a place and seed nobody chose.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/english, src/bench/play.mjs

**Notes.**
