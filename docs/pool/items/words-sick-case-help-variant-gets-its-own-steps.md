---
id: words-sick-case-help-variant-gets-its-own-steps
title: "The sick constituent-help arc shares its steps and replies with another arc, so a family of three variants has only two shapes"
area: words
kind: feature
priority: 3
size: M
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
source: PR 9394 (Nov 15, 2026), the arc-variant "differ" test after the lost-job and short-pay variants were deleted
checked:
claimed-at:
---

**What.** The constituent-help family in src/director/data/arc-variants.json has three variants left: plain, eviction and sick. Two of them share one step and one set of replies, so the family has two skeletons, not three, and the arc-variant "differ" test has a floor of min(3, variants minus 1) instead of one skeleton per variant. A constituent who is ill, or caring for someone who is, answers to a different need than a rent notice or a job, and the scene should ask different things and offer different replies (what the official can do about leave, care, bills, time). Seen: a second session plays a sick case and an eviction case at two drawn places and the steps and replies the player is offered differ, with each offered reply answered.

**Cause.** Found in code: in src/director/data/arc-variants.json the families.constituent-help.variants rows `eviction` and `sick` carry the same `state` and the same `replies` list, so only their lines differ; src/director/arc-variant.test.ts reads the skeleton as `state|replies` per variant and counts distinct ones.

**Fix.** Give `sick` its own steps and replies in arc-variants.json (the state the person tells, the replies that fit illness, the follow, again and endings), write the lines through the civic-prose process with the Words lead's rules, and restore the floor in src/director/arc-variant.test.ts to one skeleton per variant.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: the arc stays one row in arc-variants.json read by the one director, never a second path for illness. Nothing is a dice roll: which arc plays is read from the records (the person's or a household member's care need). No hand-written player text in code: the lines are bank pieces graded by the Words lead.

**Done when.** A second session builds two drawn towns with buildBenchWorld, writes down their places and seeds, plays one sick case and one eviction case through office hours, and lists the steps and replies offered: they differ, every reply is answered, and the arc-variant "differ" test passes with one skeleton per variant.

**Waits on.** Nothing.

**Files.** src/director/data/arc-variants.json, data/english/parts/scene-talk.json, src/director/arc-variant.test.ts
