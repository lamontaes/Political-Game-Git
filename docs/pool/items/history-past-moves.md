---
id: history-past-moves
title: "Moves before the start are run, not drawn: when each person came to the county, and from where"
area: core
kind: feature
priority: 1
size: M
status: done
claimed-by: claude/wire-opening-history-moves
pr: #6648
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T16:38:14.630Z
---

**What.** Under the owner's Oct 27 ruling (history before 2025 is simulated, OWNER-DECISIONS 'The world has a past'), the move into the county is still drawn. src/core2/opening-kin.ts decides whether and when an adult moved by a seeded 'move line' crossed by the ACS mover rate, writes life:moved-into-county with no origin, and past-family.ts and conversation.ts read that date. This item runs each full adult's residence through the pre-start window by the moves engine's own rule (src/core2/modules/moves.ts: the life-stage rate by age and state, held back by ties, pushed by a lost job from the past-work run), with the origin from records: a parent's place outside the county, else the counties whose IRS top destination is this one (src/core2/data/moves/destinations.json read in reverse), else the state. The work run then places the spells before the move in the origin place, which clears that part of SG-HIST-past-work-day-one-town.

**Rules.** No dice: the seeded move line in opening-kin.ts is deleted; the move happens when the person's own pull reaches one whole move, from their age, ties and recorded job losses. Replace, never layer: the generated move date and its readers move to the run's record in the same change. One rule, all 56 places: the origin comes from the IRS table and the person's relatives, never a named place. Speed: a town's year stays under two minutes and within 20% of main.

**Done when.** In buildBenchWorld in a drawn place (place and seed in the PR body), each full adult who came to the county has a person.moved-in record by record id with its origin place and the record that pushed it (a past-work layoff id or the life-stage month), the Journal tells the move from that record, the past-work spells before it are in the origin place, a second seed in the same place shows different moves, a test in src/core2/past-moves.test.ts passes, and npm run speed:year stays under two minutes.

**Files.** src/core2/opening-kin.ts, src/core2/past-work.ts, src/core2/modules/moves.ts, src/core2/past-family.ts, src/director/conversation.ts, src/director/journal.ts

**Notes.** TODO

Oct 29 (CTO): set done; PR #6648 merged (the done flip failed while branch protection refused the flip job's push).
