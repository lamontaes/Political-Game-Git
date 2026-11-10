---
id: words-journal-no-feeling-words
title: "A friend's turn in public life is told as the friendship, never as a mood word (journal-bank 'names no feeling' red on main)"
area: words
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: story/journal-no-feeling-words
pr: pending
blocked-on:
lead: words
source: src/english/mined/journal-bank.test.ts "names no feeling anywhere in the bank", red on main since #7501; ruled by docs/coordination/prior-rulings/people.md section 24 (CTO, Nov 10)
claimed-at: 2026-11-10T13:40:00.000Z
---

**What.** The two `memoir-meant-friend` pieces said "That made me glad." and "I was happy about that." after a friend's filing, oath or win. The owner's locked verdict of Sept 6 (prior-rulings/people.md section 24: "Imply relationship tension through ordinary concrete behavior/dialogue rather than narrating feelings") forbids naming the feeling, and the journal bank's test has said so since #7501. They now say the tie the line already cites: "We got along well." and "We were friends."

**Done when.** `src/english/mined/journal-bank.test.ts` passes; `journal-story.test.ts` still finds each friend's line on a friend tie; the English guards and `english-parts-banks` pass.

**Files.** data/english/parts/journal.json
