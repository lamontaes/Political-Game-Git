---
id: core-strain-lost-on-shared-time-ties
title: "A quarrel or a broken word strains a tie built from shared sittings or work, not only the hours written on the tie"
area: core
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/project-thread-csmftn-strain
pr: #9491
after: legislature-members-have-no-tie-to-each-other
blocked-on:
lead: people
model: opus
effort: medium
root: none
source: Lying builder, Nov 15, while pricing a lie's strain on a legislator pair tied only by their sittings
merged-at: 2026-11-15T21:50:33.296Z
---

**What.** Strain (a quarrel, a refusal, a lie found out) is written as negative hours on the relationship row, and the row cannot go below zero, so a tie that stands on hours another engine reads (shared sittings, `sitting-closeness.ts`; shared work, `work-closeness.ts`) loses at most the hours written on the row. Two council members tied only by their meetings who quarrel, or one who learns the other lied about a vote, read the same closeness the next day. Anything that weighs what a strain would cost (the lie chooser's `strainCost`) sees a cost the write then does not apply. Seen: in dev mode, after a member is found out lying to a colleague they know only from the chamber, the colleague's closeness to them drops.

**Cause.** Found in code: `relationship()` in src/core2/state.ts computes the next level with `closenessAfter`, which clamps `before + hours` at zero (`levelFromHours`), and `closenessBetweenAfter` in src/core2/closeness.ts adds shared hours on top of the row, so a deficit beyond the row's own hours is dropped.

**Fix.** Keep the deficit: the row carries the strain hours its own time did not cover, faded like the rest, and `closenessBetweenAfter` takes them off the row's hours plus the shared hours before converting to a level. No new number.

**Time box.** 2 hours, one Opus session at medium effort.

**Rules.** No dice: the strain is the hours the scene's own ending says, never a roll. Wire to the world: the found-out record's strain must reach the closeness the vote asks and favors read afterward.

**Done when.** At 4846968 seed 8647-mason and one drawn place, a state senate pair with no relationship row and a sitting tie reads lower closeness after a found-out record than before, by the closeness `strainCost` priced, in a test through the game's own `relationship()` path; a second session sees it in dev mode on main.

**Waits on.** legislature-members-have-no-tie-to-each-other.

**Files.** src/core2/state.ts, src/core2/closeness.ts
