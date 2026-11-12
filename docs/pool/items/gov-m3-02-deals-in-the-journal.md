---
id: gov-m3-02-deals-in-the-journal
title: "The journal tells the deals the player made and the favors they owe, read from the bill and obligation records"
area: gov
lead: governing
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
standard: 2
model: sonnet
effort: medium
root: design-life-record
source: governing lead Oct 29
after:
checked: fable 2026-11-10
---

**What.** M3-02's test sentence says favors and promises land on the record and in the journal. They land on the record: a taken deal writes the bill's deal row and an obligation row (`offerDeal`, src/core2/modules/legislature.ts), and legislature.test.ts checks `obligationsOf`. The journal never tells them: the office-act moments in src/director/journal.ts (about lines 655 to 680) tell town halls, interviews and the player's yes or no votes, and nothing reads a deal or an obligation. Add a journal moment for a deal the player made, taken or declined, and for a favor they owe, read from those rows by id. Seen: the Journal, which tells the favors and promises the player's deals made.

**Cause.** Found in code: src/director/journal.ts has no reader of the bill's deal row or of obligationsOf (src/core2/modules/legislature.ts, line 3592), although offerDeal (line 3477 of the same file) writes both.

**Fix.** Write a remembered event when the player makes or declines a deal and when they owe a favor, citing the deal row and the obligation row by id, through the life record's one writer, and word it from an English engine bank (Words reviews).

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: the journal lines come from the English engine's banks, which Words writes and reviews. An effect is a read, not a record: the moment cites the bill's deal row and the obligation row by id, never a copy of them. Ask why: a declined deal's line can say why only from the member's recorded position.

**Done when.** A second session, in a drawn place built with buildBenchWorld and the seed it prints, has the player make a deal for a vote through the office panel's talk, then finds the journal showing a moment that cites the bill's deal row and, for a taken deal, the obligation row, by record id, with its line worded from a bank; the M3-02 command names the test file.

**Waits on.** core-life-record (the list and the one reader the journal will read).

**Files.** src/director/journal.ts, src/director/journal.test.ts, data/english, src/core2/modules/legislature.ts

**Notes.** Filed by the governing lead, Oct 29, from the M3-02 command (branch governing/m3-spec-commands). src/director and data/english are the Words session's: ask Words first and get `Review: words`. Favors being collected later is a separate gap (the work order: `obligationsOf` has no caller).
