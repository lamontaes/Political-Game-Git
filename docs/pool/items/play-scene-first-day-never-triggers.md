---
id: play-scene-first-day-never-triggers
title: "A first meeting at work never plays: no job started for a watched person in three drawn worlds"
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

**What.** The batch 4 capture tried to play the `first-day` scene (a newcomer meets the people at work) in the three worlds above. The type has one live cause, `money:job-started` with no counterpart, and one awaiting producer, `school-started` (`src/director/data/situation-types.json`); no job started for a watched person in the played months, and no school-started record exists. Seen: the player or someone in their circle starts a job and has a first day with the coworkers, in the Journal.

**Cause.** Needs cause. Looked at: the type's two causes and the dropped item `director-hire-scene` (which found the hire already reaches the director as `job-started` and has worded scenes). Not settled: whether a watched person starts a job in a played year at all (and why none did in these worlds), whether the player's own first job is the case the owner wants, and which engine writes the school-started record. The cause find settles which record should fire the type and why none did, by place, seed and record id.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one session, for the cause find. When it runs out, write what was ruled out into this item's Notes, set the item's state honestly with a one-line note, and stop.

**Rules.** Each of these is a play bug, its own item (CTO, Nov 12, 2026). No dice: the situation fires from a record, never a chance. Wire to the world: the cause is a record an engine writes in a played year. One rule, all 56 places: the cause find draws places and names each place and seed. Simulate it, don't ask.

**Done when.** A second session, in a drawn place and seed the cause find did not choose, plays the world and sees the scene stage from its record, named by record id, and play out in the game (through dev mode where the cause is a wait on a record), and names the place and seed it saw it in; the item's Cause then reads `Found in code:` or `Measured:` with a Fix.

**Waits on.** Nothing.

**Files.** src/director/data/situation-types.json, src/director/ledger.ts, src/core2/modules/jobs.ts

**Notes.**

Added by the lead (Fable A) on Nov 12, 2026, on the CTO's call on #7365: the six kinds of scene batch 4 could not trigger are play bugs, each its own item. No existing open item covers this kind; related items are named in the Cause.
