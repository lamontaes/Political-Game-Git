---
id: play-scene-office-hours-eviction-or-sickness-never-triggers
title: "Eviction, sickness or short pay at office hours never plays: the case module has only two problems, a job and a minimum wage"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: "batch 4 capture, Nov 9, 2026 (the item words-batch-4 and its page, kept on the closed pull request #8071, section 'Kinds that could not be triggered'), sent to the pool by the CTO, Nov 12, 2026, on #7365 (comment 6825983162)"
checked:
---

**What.** The batch 4 capture tried to play office hours (a resident brings a problem to the player as an official) for an eviction, a sickness and short pay in the three worlds above. The case module (`src/core2/modules/constituent-cases.ts`) has two problems only, `looking-for-work` and `paid-under-minimum-wage` (the `Problem` type, line 44); there is no eviction or illness case record for the office-hours scene to read, so the batch held the job case alone. Seen: a resident comes to office hours about the eviction notice or the illness that is hurting them, and the player's answer changes it.

**Cause.** Needs cause. Looked at: `Problem` and `bringCase` in `src/core2/modules/constituent-cases.ts`, the `office-hours` type in `src/director/data/situation-types.json` (it fires from `office.approached` naming the official) and the open item `scene-office-hours-visit-never-staged-for-player` (a visit that exists and loses its place in the queue; a different fault). Not settled: which record should open a case about a home or a sickness (the housing engine's eviction, the health record) and which already exists, whether this is a case the game wants at all (the Political Process baseline in `docs/roadmap/political-process-baseline.md`), and what a counted resident's case reads. The cause find names the records and the owning engines, by place, seed and record id.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one session, for the cause find. When it runs out, write what was ruled out into this item's Notes, set the item's state honestly with a one-line note, and stop.

**Rules.** Each of these is a play bug, its own item (CTO, Nov 12, 2026). No dice: the situation fires from a record, never a chance. Wire to the world: the cause is a record an engine writes in a played year. One rule, all 56 places: the cause find draws places and names each place and seed. Simulate it, don't ask.

**Done when.** A second session, in a drawn place and seed the cause find did not choose, plays the world and sees the scene stage from its record, named by record id, and play out in the game (through dev mode where the cause is a wait on a record), and names the place and seed it saw it in; the item's Cause then reads `Found in code:` or `Measured:` with a Fix.

**Waits on.** Nothing.

**Files.** src/core2/modules/constituent-cases.ts, src/director/data/situation-types.json, docs/roadmap/political-process-baseline.md

**Notes.**

Added by the lead (Fable A) on Nov 12, 2026, on the CTO's call on #7365: the six kinds of scene batch 4 could not trigger are play bugs, each its own item. No existing open item covers this kind; related items are named in the Cause.
