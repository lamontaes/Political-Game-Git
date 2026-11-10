---
id: words-journal-requires-facts
title: "A journal piece is said only where its required facts are present"
area: words
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: story/journal-requires-facts
pr: pending
blocked-on:
lead: words
source: "found while fixing the journal's hard lines: requiresFacts on a journal piece was dropped when the bank was turned into the journal's words, so a piece gated on a fact nobody gives was said anyway"
claimed-at: 2026-11-10T15:00:00.000Z
---

**What.** `journalDataFromBank` (src/english/mined/journal-bank.ts) now carries a piece's `requiresFacts` into the wording the journal words, and the grounded English engine's existing check (`requiresFacts` on a variant: the fact must be present with support, grounded-english.ts) holds the piece back, the one check the scene bank uses. Nothing new was written to check it.

**Every journal piece that has requiresFacts (17).** Three say the weather (`weather-hot`, `weather-cold`, kind `day:`): no journal row words a `day:` line, so none plays today. Fourteen memoir "hard" pieces need `hard-time`, a fact the director never gives: before this change all fourteen played anyway after a death in the family or a lost job ("It was hard.", "That was difficult."); now none of them plays. In New London, New Hampshire (seed a519d3f12067a057f09efd327b4b01707d878ce07cd9b22a53d4dd9e20862c39), a death line read "My father died. That was difficult. John was 56 years old. John had been seriously ill."; it now reads "My father died. John was 56 years old. John had been seriously ill." (PR #8153 deletes these fourteen's feeling words outright and gives the one it keeps a fact the director does supply.)

**Done when.** src/english/mined/journal-requires-facts.test.ts passes (it fails before the change): a piece with a required fact absent is never chosen, and is chosen once the moment holds it with support; journal-death-school on seed 5 shows no feeling line.

**Files.** src/english/mined/journal-bank.ts, src/english/journal-words.ts, src/english/mined/journal-requires-facts.test.ts

**Time box.** 1 hour.

**You will see.** "My father died. John was 56 years old. John had been seriously ill."
