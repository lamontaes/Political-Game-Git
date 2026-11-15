---
id: director-celebration-ask-lines-over-limit
title: "The celebration-ask scene's line count test is red on the train: 72 lines against a limit of 45"
area: director
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: found gating #9411 (Nov 15)
claimed-at:
checked: words builder A 2026-11-15
---

**What.** `src/director/celebration-gathering-scene.test.ts` "every line of the two purposes carries its own facts, with no name said twice and no stray words" fails with `celebration-ask: expected 72 to be less than or equal to 45` (line 507, the per-purpose count) on the clean train. Seen: the celebration ask scene's bank holds more lines than its own test allows, so the test no longer guards it.

**Cause.** Measured: `npx vitest run src/director/celebration-gathering-scene.test.ts -t "every line of the two purposes"` (no world is built; the count is of bank pieces, so no place or seed applies), bisected from the train head aa927a84 (red) to c315218502 (green) by running that one test; git names 0b315dc9 ("The opening lands the player at home when the household is home") as the first bad commit, but that commit touches no bank file (src/bench/handler.ts, opening.ts, play.mjs), so the count comes from scene-talk entries united by fold (data/english/parts/scene-talk.json) that the bisect crossed, not from it. Next step: count the `celebration-ask` pieces at c315218502 and at aa927a84 and name the fold that added the difference.

**Fix.** Find the fold that added the lines; delete pieces that are rewordings of another (the unique-text and one-rule checks), or, if the scene truly needs them, raise the limit with the old premise stated and the Words lead's yes. Do not loosen the test alone.

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** Replace, never layer. Ask why: name the fold and the pieces by key.

**Done when.** A second session, on main, runs the test (a count of bank pieces; also plays one birthday at a drawn place from all 56, named in the PR) and sees it pass, and the PR names the pieces removed by key. Seen: the celebration scene's replies in a played birthday are four different answers.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/director/celebration-gathering-scene.test.ts
