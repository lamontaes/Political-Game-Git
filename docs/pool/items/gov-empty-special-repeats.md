---
id: gov-empty-special-repeats
title: "An empty race resolves by its law: holdover, or another special, read from data"
area: gov
kind: feature
priority: 1
size: M
status: done
claimed-by: claude/empty-special-repeats
pr: #4804
blocked-on: gov-holdover-rule-data
milestone:
after: gov-record-defects-finish,gov-holdover-rule-data
source: "split from gov-empty-race-holdover"
claimed-at: 2026-10-16T19:34:38.574Z
---

**What.** When a count has no candidate with votes, `holdElection` in `src/core2/modules/voting.ts` leaves `winnerId` null and opens the next cycle, so the seat's holder stays only by an accident of the term record, and a repeated empty special has no rule at all. Read the holdover rule for the place and office from the data that gov-holdover-rule-data produces: the holder serves until a successor qualifies, or the vacancy rule runs again as a new special election. Each empty result is recorded with its reason (term kept, or a new vacancy and special), including each repeat. The player would notice that a town seat nobody ran for is held by the old member with a stated reason, or a new special appears on the calendar, instead of a silent gap.

**Rules.** Replace, never layer: the accident-of-the-term-record behavior in `voting.ts` is deleted in the same change and the PR body counts what was removed; No dice: no roll picks the holdover; the data rule for the place and the office decides, and the record says which rule; The chain is the acceptance: follow one empty race to the held term or the new vacancy, the calendar entry, and the news or journal line; No hand-written player text: the reason shown is worded by the English engine from record parts; One rule, all 56 places: the rule comes from the holdover data for all 56 places, with no place named in code; Wire to the world: it covers every office family the data covers, regular and special races alike.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): an empty regular race and an empty special each resolve by the data rule and leave a record (term kept with its reason, or a new vacancy row and special contest) named by id. Tests in `src/core2/voting.test.ts` or a new `src/core2/empty-race.test.ts` prove both branches in a drawn place, and `npm run zero-dice` stays clean. The owner plays it: lets a council seat go unfilled at the filing deadline and sees the old member hold it, or a special appear, with the reason in words.

**Files.** src/core2/modules/voting.ts, src/core2/modules/offices.ts, src/core2/modules/elections.ts, src/core2/data/offices/ (holdover data from gov-holdover-rule-data)

**Notes.** Touches the same code as #4343; start after it merges. (as of 2026-10-15)
