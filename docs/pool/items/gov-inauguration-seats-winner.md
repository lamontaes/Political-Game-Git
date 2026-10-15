---
id: gov-inauguration-seats-winner
title: "The inauguration seats the person who won, not a drawn stand-in"
area: gov
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In `src/core2/modules/world-races.ts`, `inaugurate` seats the president and vice president as a drawn identity (`drawOfficialIdentity`, role "state-executive-challenger") for the winning party, with no person behind the term. When the town's ballot named the winner, that candidate is the person who won (`winnerId`), and the running mate should be a named candidate too. Seat the person who won and the running mate the ballot named, filled in as people (`fillInIdentity`), and where the country's ballot named no one, draw them once at filing time as the officials engine does for governors and senators, so a candidate and the person seated are the same.

**Rules.** An effect is a read, not a record: the person who won is the one the offices and officials engines seat and the news names; No dice: the winner is the count's, the running mate the ticket's; One rule, all 56 places: no place named in code; Ask why: the term keeps the election record it came from; Replace, never layer: the drawn challenger identity at `inaugurate` goes.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) through an inauguration, in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): the president sworn in on January 20 has the person id the ballot named, the vice president the running mate's, and the term cites the election row. The test is in `src/core2/world-races.test.ts`. The owner plays it: wins an election he followed in the news and sees the same name take the oath.

**Files.** src/core2/modules/world-races.ts, src/core2/modules/voting.ts, src/core2/modules/officials.ts

**Notes.** From the officials session's "Needs from other sessions" (docs/coordination/officials.md, "presidential challengers are still drawn stand-ins"). Found while verifying gov-needs-officials-32.
