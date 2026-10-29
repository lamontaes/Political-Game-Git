---
id: words-scene-family-absence
title: "A family member's absence is a scene when a record explains it, silent otherwise"
area: words
kind: feature
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
source: added by the acting CTO, Oct 25 (owner ruling)
lead: words
milestone: play-first
claimed-at:
---

**What.** The owner ruled Oct 25 that a family member's absence is told to the player as a scene when a record explains it: moved away, in the hospital, jailed, died. Today a household member who leaves simply stops appearing, and the player learns nothing. The scene reads the record that took them (a move event, a hospital admission, a justice case's custody, a death record) and stages one moment in the house or by message from a kin member who says what happened, with the player's reply from controls and the result in the journal. Where no record explains the absence, nothing is said; the engine never invents a reason, and an absence with no record is a defect to file, not a line to fill.

**Rules.** Serves LAW.md §2, Scenes like Wildermyth: scenes come out of what is actually happening in the world, narrated into a moment. Ask why: the scene cites the record (move, admission, custody, death) that earns it. No hand-written player text: the kin member's lines come from the English engine's bank. Silent otherwise: no record, no scene, never a placeholder.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a household member whose record shows a move, hospital stay, jailing or death is told to the player in one scene citing that record id, a member with no such record produces no scene, and a bench screenshot at 1440×900 shows the scene with place and seed under it.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff on main.

**You will see.** When someone in your house is gone for a reason the world recorded, a family member tells you what happened and you answer; when there is no reason on record, no one says anything.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/director/situations/, src/director/scene.ts, src/director/scene-talk.ts, src/core2/modules/households.ts (read only), data/english/parts/, src/bench/play.mjs

**Notes.** Owner, Oct 25; build all three scenes without asking (OWNER-DECISIONS, Oct 25). Pairs with the Oct 24 read that people in the house need a reason to be there.

Oct 29 (CTO, second account): PR #6130 closed as stale under the owner's standing approval; back to open. Branch `play-first/words-scene-family-absence` is kept; claiming this item takes it over.
