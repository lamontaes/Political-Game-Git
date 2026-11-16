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

**Cause.** Found in code: `registerCounts` in scripts/words/line-register.ts finds 7,997 bank lines that can be said to anyone (5,557 tied only to a kind of subject, 2,434 whose slots are filled from a news story, bill or calendar and not from the speaker's or hearer's own record, 6 with no use), 20 conversation pieces that neither `conversationDataFromBank` nor `composedConversationBank` places, four banks (address, hearing, legislation, minutes) whose file name appears in no source file, 126 sentence-shaped literals in src/bench, src/director and src/english, and 1,140 sentence-shaped strings in json data files beside that code.

**Fix.** Each class has an owner of its deletion. Lines that can be said to anyone: the engine rule that a move and a reply piece must declare what in the speaker's or the hearer's records it is tied to, and a line with none cannot be offered (its own PR, after the dev scene view), with the Words lead's delete list (the three news-answer-react pieces, the bare news answers, the untied "Did you hear about {topic}?") applied the same day. Unreached pieces and unread banks: the Words lead's list, delete what nothing reads. Code literals and data-held strings: each is moved into a bank (the opening address and local addresses in the address series) and deleted at its source in the same change. Every PR lowers the baseline with `node --import tsx scripts/words/line-register.ts --write-baseline`.

**Time box.** One list per session, 3 hours each, Opus at medium effort.

**Rules.** Replace, never layer: a line moved to a bank is deleted from the code or data file it came from in the same change, and only the baseline file is lowered, never a second list. A line the Words lead has not read stays; deletions follow the lead's list.

**Done when.** The baseline's list in question is empty at the head, with the guard green. A second session (not the builder) looks one line up in dev mode's scene view at a drawn place from all 56 (place and seed named) and sees where it lives, what it is tied to and whether it plays.

**Waits on.** Nothing.

**Files.** scripts/words/line-register.ts, tests/guards/english/line-register-baseline.json, data/english/parts/*.json
