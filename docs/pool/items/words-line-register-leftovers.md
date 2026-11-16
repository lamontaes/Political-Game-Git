---
id: words-line-register-leftovers
title: "Tie, reach, read or delete every line the line register lists"
area: words
kind: cleanup
priority: 2
size: L
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
source: Words builder A, Nov 16 (owner: every line of dialogue or narration in the code is registered and traced, so there are no leftovers)
claimed-at:
checked: words builder A 2026-11-16
---

**What.** The register (scripts/words/line-register.ts, baseline tests/guards/english/line-register-baseline.json) lists every line the game can say and what is left to do with it. The baseline goes to zero: no line tied to nothing of the speaker or the hearer, no conversation piece no engine places, no bank nothing reads, no sentence typed in code or in a data file. Seen: the baseline file holds no entry in any list.

**Cause.** Found in code: after the tie rule (src/director/subject-tie.ts, `acceptSubjects` in `subjectsBetween`: a Subject with no tie record to the speaker or the hearer is refused) the register finds 217 bank lines that can be said to anyone (204 opening-speech lines naming only a kind of subject, 28 speech-stages, the four unread banks address, hearing, legislation and minutes), 176 short conversation replies that carry nothing of their own ("Oh, my."), 20 conversation pieces that neither `conversationDataFromBank` nor `composedConversationBank` places, 126 sentence-shaped literals in src/bench, src/director and src/english, and 1,140 sentence-shaped strings in json data files beside that code.

**Fix.** Opening-speech lines: the desk's address-as-scene series (each part declares its `tie`). Speech-stages: the speech planner declares its tie. The four unread banks, the 20 unreached pieces and the 176 short replies: the Words lead's delete list, applied by the story builder (a reply that says nothing is deleted, never saved by inheriting a tie). Code literals and data-held strings: each is moved into a bank and deleted at its source in the same change. Every PR lowers the baseline with `node --import tsx scripts/words/line-register.ts --write-baseline`.

**Time box.** One list per session, 3 hours each, Opus at medium effort.

**Rules.** Replace, never layer: a line moved to a bank is deleted from the code or data file it came from in the same change, and only the baseline file is lowered, never a second list. A line the Words lead has not read stays; deletions follow the lead's list.

**Done when.** The baseline's list in question is empty at the head, with the guard green. A second session (not the builder) looks one line up in dev mode's scene view at a drawn place from all 56 (place and seed named) and sees where it lives, what it is tied to and whether it plays.

**Waits on.** Nothing.

**Files.** scripts/words/line-register.ts, tests/guards/english/line-register-baseline.json, data/english/parts/*.json
