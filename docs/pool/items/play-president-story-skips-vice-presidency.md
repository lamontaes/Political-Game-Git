---
id: play-president-story-skips-vice-presidency
title: "A President who was vice president has a story that leaves out the vice presidency"
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
lead: play-first
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: "Owner's Nov 23 sitting, row C3 (docs/coordination/playtest/2026-11-23-1.md, PR #10292)"
checked:
claimed-at:
---

**What.** When a vice president succeeds to the presidency, the new President's card tells only the presidency; the years as vice president are in the terms table but absent from the story. The player reads a President with no past. Seen: the official's card, the story under the name, after a succession.

**Cause.** Found in code: the function officialLines in src/bench/card.ts (the `same` test) keeps only terms in the same seat as the card's term, so the vice president term, on another seat, is dropped before the story is told. Measured: a world built with buildBenchWorld at Allamuchy, New Jersey (3400640), seed c3, main 7f04c334, the president's seat vacated: before, the card told only "began serving as president".

**Fix.** Keep a term in another seat when it has the same personId as the card's term.

**Time box.** 1 hour.

**Rules.** Everything comes from the simulation: the lines are the term records already kept; no line is typed or reworded.

**Done when.** A second session builds a world with buildBenchWorld in a drawn place, vacates the president's seat, runs to the succession, opens the new President's card in the screenshot and finds the vice presidency among the history lines by its term record id.

**Waits on.** Nothing.

**Files.** src/bench/card.ts
