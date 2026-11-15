---
id: press-exposure-unattended-answer
title: "An official you are not playing answers the paper's call by their own lean, and the story prints it"
area: words
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: scandal-call-says-what-the-paper-found
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Account lead builder, Nov 15, from the Words lead's word (08:43Z) and the Account lead's ruling (08:49Z) on #9463
---

**What.** When the paper exposes an official the player is not playing, nobody takes the reporter's call, so the story prints nothing about comment. A real official would answer: own it, deny it or say nothing. Seen: a played exposure story about an unattended official says whether they admitted it, denied it or declined, in the paper's words.

**Cause.** Found in code: src/core2/modules/press.ts `keepComment` keeps a comment only from a scandal call the player answered (`scene.reply`), and src/bench/printed-words.ts `printedFacts` prints a comment only from that row. The answer an unattended official would give by their traits was built on #9463 (`decisionLean` on `scene-talk.move`, confess or lie over refuse) and taken out at the Account lead's ruling: a fact no line reads does not ship, and no call is not a decline.

**Fix.** On the run day, an unattended official's own answer (their `scene-talk.move` lean: confess over refuse, lie over refuse, or neither) is kept as a comment row the way a call's is, marked as given without a call; the Words lead writes the sentences that read it (admitted, denied, said nothing) in data/english/parts/news.json. No call is its own state, never "declined".

**Time box.** 2 hours, one Opus session at medium.

**Rules.** No dice: the answer comes from the official's traits through decisionLean, never a roll, and the story cites the comment row by record id.

**Done when.** A second session has an unattended council member's bribe leaked in a drawn town and reads the printed story the next day: it says how they answered, by their lean; a pinned test at Gilbert, Iowa (1930630), seed reporters-call-1, checks the comment row and the printed sentence by record id.

**Waits on.** The Words lead's sentences for the three answers.

**Files.** src/core2/modules/press.ts, src/bench/printed-words.ts, data/english/parts/news.json

**Notes.**
