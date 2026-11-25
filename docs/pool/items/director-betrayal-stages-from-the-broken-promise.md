---
id: director-betrayal-stages-from-the-broken-promise
title: "A broken promise stages the betrayal scene from the promise itself, only when the other person broke it"
area: director
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: story
model: opus
effort: medium
root: none
source: Story lead, Nov 19, from the bank 6a-3 writer's probes (claude/story-lines-home-bank6a-3)
checked:
---

**What.** The `betrayal` scene (a friend who broke a promise comes to explain) never stages from a broken promise in play. When something does stage, it reads an unrelated record. So the scene cannot be written: its packet holds only names. Seen: the day after someone breaks their word to the player.

**Cause.** Found in code: src/director/ledger.ts (around lines 1411 and 1426) marks `kept-fact-due` on any moment whose day equals a promise's `endedAt`, without checking the promise's `outcome` or `holderId`. A broken promise has no moment of its own. In the writer's probe at Ten Broeck, KY (seed `1c9012db…`), a broken pay-on-time promise marked an unrelated `family.quarrel` moment. A kept promise, or one the player broke, would mark one too. `composeBinding` in src/director/purpose-scene.ts has no block that reads the promise.

**Fix.** In ledger.ts, a promise that ends broken by someone other than the player makes its own moment, citing the promise row, with `kept-fact-due` set only for outcome broken and a holder who is the player. In purpose-scene.ts, add a promise block that reads `promisesBetween` for the kind, the outcome and who ended it, so lines can say what was promised. Then the Story session writes the scene's lines.

**Time box.** 3 hours.

**Rules.** No dice: the scene stages from the promise record, never a chance. Ask why: the scene cites the promise and the record that broke it. The player says only what they chose, and no reply promises an act no ending records (`promise-endings.json` has no `betrayal-explain` row).

**Done when.** A second session, in a drawn place and seed in the running game (dev mode allowed), sees a broken promise to the player stage `betrayal` the next time they meet, its packet naming the promise; a kept promise and one the player broke stage nothing.

**Waits on.** Nothing.

**Files.** src/director/ledger.ts, src/director/purpose-scene.ts, src/director/data/situation-types.json

**Notes.** Nov 19 (Story): filed from probes at Umatac GU, Londonderry VT, Frederiksted VI and Ten Broeck KY; none staged betrayal from its own promise.
