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

**Fix.** No new sentences (Words lead, Nov 15 10:10Z, rulings-f23b8d9a.md point 3). On the run day the official's own character picks the move through the same reply lines the player is offered on the call (own it, deny it, decline), by their `scene-talk.move` lean, and the answer is kept as a comment row the way a call's is (`keepComment`), so the paper prints it in the same two forms: the quote, or the decline line. No call stays its own state, never "declined".

**Time box.** 2 hours, one Opus session at medium.

**Rules.** No dice: the answer comes from the official's traits through decisionLean, never a roll, and the story cites the comment row by record id.

**Done when.** A second session has an unattended council member's bribe leaked in a drawn town and reads the printed story the next day: it quotes the reply line their lean picked, or prints the decline line; a pinned test at Gilbert, Iowa (1930630), seed reporters-call-1, checks the comment row and the printed sentence by record id.

**Waits on.** scandal-call-says-what-the-paper-found (#9482), which keeps the call's comment row and prints it.

**Files.** src/core2/modules/press.ts, src/director/purpose-scene.ts

**Notes.**
