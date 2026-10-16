---
id: gov-stopgap-central-bank-appointments-faked-mechanic
title: "Stopgaps in central-bank-appointments (faked-mechanic): 1 open"
area: gov
kind: stopgap
priority: 2
status: done
claimed-by: claude/gov-board-appointer
pr: #4510
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/central-bank-appointments.ts, kind faked-mechanic"
claimed-at: 2026-10-15T23:04:49.239Z
---

**What.** A central bank board seat's new member is the seeded candidate whose lived inflation sits closest to the board's middle, chosen without the president or the Senate (SG-WORLD-board-appointments, `central-bank-appointments.ts` line 39). `nominateAndConfirm` in `src/core2/appointments.ts` already lets the president's side pick among candidates by alignment, qualification and acquaintance and lets the Senate confirm. Register the board appointer so seats are filled by that path. The player would notice board seats filled by a named nomination and a Senate vote, with reasons, and monetary policy shifting as the president's side changes.

**Rules.** No dice: the appointer picks by alignment, qualification and acquaintance and the Senate votes by its members' reasons, never by closeness to a middle; Ask why: the nomination and the confirmation vote keep their reasons by record id; Replace, never layer: the seeded closest-to-middle chooser is deleted in the same change; The chain is the acceptance: follow one seat from vacancy to nomination, confirmation, the rate decision that board member votes, and a price that moved; One rule, all 56 places: board structure is data and no bank is named in code; Placeholders: SG-WORLD-board-appointments closes only when appointments run.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a board seat in the year is filled by `nominateAndConfirm` with the nominee, the Senate roll and the reasons named by record id, and the next rate decision lists that member's vote. Tests in `src/core2/appointments.test.ts` plus the board test. Close the stopgap row. The owner plays it: sees a Fed governor nominated and confirmed in the news.

**Files.** src/core2/central-bank-appointments.ts, src/core2/central-bank-board.ts, src/core2/appointments.ts, src/core2/data/stopgaps.json

**Notes.** First row: A seat's new member is the seeded candidate whose lived inflation sits closest to the board's middle, chosen without the president or the Senate.
