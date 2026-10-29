---
id: words-recall-organizer-claims-a-promise
title: "The recall organizer says the official promised to vote no, though no record holds a promise"
lead: words
area: play
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: words/recall-answer-names-the-vote
pr: #6751
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-29T06:21:53.888Z
---

**What.** In the recall scene, after the official asks 'What does it say I did?', the organizer's only answer line is 'That you voted for {bill} after telling us you wouldn't.' (scene-talk.follow-answer.that-you-voted-for-bill-after-telling-us-you-wouldn-t). In the bench, Glen Gardner, New Jersey (Advanced, seed b23911b2fe0df22194203278814dcf1a3b191f9760f8a779db2b0727d592900a, place 3426550), council member Julia O'Donnell sponsored Ordinance 2025-1 herself and no record holds any promise to vote against it, yet Jeffrey Moran says she broke one on February 20, 2025. The petition's record names the bill and the member's vote, so the answer can only say what they did.

**Rules.** Ask why: a line states only what the cause record and the person's own records hold; a broken promise needs a record of the promise (a pledge, a platform stance, a reply in an earlier scene). No hand-written player text in code: the fix is in the bank and its grounding, never a string in code.

**Done when.** In a drawn place where a recall petition names a member who made no recorded promise on the bill, the organizer's answer line names only the vote, and a variant naming a broken promise plays only where a record of the promise exists, shown by a test on the composed scene citing the recall-petition record id, with a screenshot.

**Files.** data/english/parts/scene-talk.json, src/director/purpose-scene.ts

**Notes.** Found Oct 28 02:00 by the laws-and-effects lead capturing recall-reply-moves-the-drive in the bench.
