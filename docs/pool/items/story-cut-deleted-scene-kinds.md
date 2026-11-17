---
id: story-cut-deleted-scene-kinds
title: "Fix the tests and scripts that still name a deleted scene kind or a deleted line"
area: words
kind: bug
priority: 1
size: M
status: claimed
standard: 2
claimed-by: claude-story-cut-tests
pr:
after: story-cut-bank-lines-not-composed
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: owner, Nov 17, after playing v0.113.0; CTO order on issue #9750 (comment 6954612785); Story lead's KEPT and DELETED lists (comment 6955131279)
---

**What.** After the bank cut, 18 tests in src/english and scripts/dialogue-batch named lines or kinds that no longer exist, and the English line rules had two red checks.

**Cause.** Design: the owner's ruling, Nov 17, verbatim: "STOP TRYING TO MAKE SHIT SHINE JUST DELETE EVERYTHING THAT IT HASNT WRITTEN EBCAUSE THIS ISNT HELPING." The tests pinned the deleted lines' keys and texts.

**Fix.** Each test takes a live line that proves the same property, or loses the case whose property went with the line. The graded-line records list what the cut deleted. The office-hours replay script is deleted with its scene. `stake-is-named` returns to `awaiting-test` because it has no verdicts left.

**Time box.** 4 hours, one Sonnet session at medium.

**Rules.** No `.skip`, `.only`, `it.fails` or widened tolerance; no pin to a place.

**Done when.** The ten test files named in the cut's pull request pass, except reply-pairs, which waits on the director's cut; the tests of the deleted director kinds are removed in the director's pull request; a second session sees the road to election day played at a drawn place with no stock line.

**Waits on.** The director's cut (claude/story-cut-director, #10011) for the tests of the deleted kinds under src/director, src/bench and scripts.

**Files.** scripts/dialogue-batch, src/english, data/english/rewritten-after-grading.json, data/english/line-rules.json

**Notes.** The reviewers' sheet for replies-may-be-long-and-substantive holds 64 scene paths with no verdict.
