---
id: office-proof
title: "Proof:"
area: office
kind: feature
priority: 2
status: claimed
claimed-by: claude/office-proof
pr:
blocked-on:
milestone:
source: "docs/coordination/OFFICE-STATE.md line 24 (unchecked checklist line)"
claimed-at: 2026-10-16T04:28:01.759Z
---

**What.** The state office day has never been shown in play: ten days as a state representative and ten as a governor in a random place are still unrecorded. Run both, record each day (what held the player, what he did, what the engines did), and fix the defects the run finds or file them as pool items. The player would notice a state seat that plays like the local and federal ones.

**Rules.** One rule, all 56 places: the place is drawn from all 56 and the seed named; Wire to the world: each day moves votes, money or people in a generated world; The chain is the acceptance: follow one act from the day to a bill, a payment or a person; No dice: no scripted outcomes; the engines decide; Speed: measure the office day before and after against the 20% limit; Ask why: each odd result gets a recorded cause by file and line, or 'not found'; Look before you ask: check OFFICE-STATE.md and SESSION-C.md first so nothing is redone.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): ten consecutive days as a state representative and ten as a governor in the drawn state, the PR body listing each day's stops and acts with record ids, any defects fixed or filed as pool items, and the speed ratio. The owner plays it: reads a transcript and then plays the same ten days himself.

**Files.** src/core2/office-day-state.ts, src/core2/modules/office-day.ts, scripts/core2-year/, docs/coordination/OFFICE-STATE.md

**Notes.** Checklist line from OFFICE-STATE.md; verify against main before starting.
