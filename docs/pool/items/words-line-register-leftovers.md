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

**What.** The register (scripts/words/line-register.ts, baseline tests/guards/english/line-register-baseline.json) lists what is left: bank lines tied only to a kind of subject, conversation lines no engine reaches, banks no code reads, sentences typed in code and sentences held in data files. Each one is tied, reached, read, moved to a bank or deleted, and the baseline is lowered as each goes. Seen: the baseline holds no entry for a bank, a conversation piece, a code file or a data file.

**Cause.** Found in code: `registerCounts` in scripts/words/line-register.ts finds 5,563 bank lines tied only to a subject kind or to nothing, 20 conversation pieces that neither `conversationDataFromBank` nor `composedConversationBank` places, four banks (address, hearing, legislation, minutes) whose file name appears in no source file, 126 sentence-shaped literals in src/bench, src/director and src/english, and 1,140 sentence-shaped strings in json data files beside that code.

**Fix.** Work the baseline down by list: the four unread banks and the 20 unreached pieces first (delete what nothing reads, per the Words lead's list), the code literals into banks, then the subject-only lines get a tied fact or are deleted. The engine rule that no line without a tie can be offered is its own item and PR.

**Time box.** One list per session, 3 hours each, Opus at medium effort.

**Rules.** Replace, never layer: a line moved to a bank is deleted from the code or data file it came from in the same change, and only the baseline file is lowered, never a second list. A line the Words lead has not read stays; deletions follow the lead's list.

**Done when.** The baseline's list in question is empty at the head, with the guard green. A second session (not the builder) looks one line up in dev mode's scene view at a drawn place from all 56 (place and seed named) and sees where it lives, what it is tied to and whether it plays.

**Waits on.** Nothing.

**Files.** scripts/words/line-register.ts, tests/guards/english/line-register-baseline.json, data/english/parts/*.json
