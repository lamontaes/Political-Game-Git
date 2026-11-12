---
id: play-scene-layoff-never-triggers
title: "A layoff the player lives through never plays: a forced job loss reached the circle as news and no layoff scene was staged"
area: director
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

**What.** The batch 4 capture tried to play the `layoff` scene (the boss delivers the news at work) in the three worlds above. Dev mode's own layoff control (`forceLayoff` in `src/bench/dev-mode.ts`) was used on a worker in the circle in each world. The job-ended record reached the circle as news arriving (scene `news-arrives`), but no `layoff` scene was staged for the worker. The type waits for a `work.job-lost` record decided by someone other than the worker (`causeFacts` `decidedBy` is `other`, counterpart none, in `src/director/data/situation-types.json`). Seen: a worker laid off by their employer has the scene at work with the boss, in the Journal.

**Cause.** Needs cause. Looked at: the type's cause row, the done items `director-layoff-boss-producer` and `dev-mode-force-job-loss-through-layoff` (which made the boss the counterpart and added the dev control) and the capture's three worlds. Not traced: whether the forced loss writes `decidedBy: other`, whether the ledger's moment for it keeps the label `money:job-ended` with no counterpart, and whether the household's one family scene (or the worker's being in the circle rather than watched) takes the day first. The cause find settles which record should fire the type and why the news scene won instead, by place, seed and record id.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one session, for the cause find. When it runs out, write what was ruled out into this item's Notes, set the item's state honestly with a one-line note, and stop.

**Rules.** Each of these is a play bug, its own item (CTO, Nov 12, 2026). No dice: the situation fires from a record, never a chance. Wire to the world: the cause is a record an engine writes in a played year. One rule, all 56 places: the cause find draws places and names each place and seed. Simulate it, don't ask.

**Done when.** A second session, in a drawn place and seed the cause find did not choose, plays the world and sees the scene stage from its record, named by record id, and play out in the game (through dev mode where the cause is a wait on a record), and names the place and seed it saw it in; the item's Cause then reads `Found in code:` or `Measured:` with a Fix.

**Waits on.** Nothing.

**Files.** src/director/data/situation-types.json, src/director/ledger.ts, src/bench/dev-mode.ts, src/core2/modules/jobs.ts

**Notes.**

Added by the lead (Fable A) on Nov 12, 2026, on the CTO's call on #7365: the six kinds of scene batch 4 could not trigger are play bugs, each its own item. No existing open item covers this kind; related items are named in the Cause.
