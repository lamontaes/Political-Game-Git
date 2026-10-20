---
id: office-stopgap-offices-missing-engine
title: "Stopgaps in offices (missing-engine): 1 open"
area: office
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
after:
size: M
source: "src/core2/data/stopgaps.json, src/core2/modules/offices.ts, kind missing-engine"
claimed-at: 
---

**What.** Narrow SG-GOV-special-election-appointee in src/core2/modules/offices.ts by running special elections for the player's own state's US Senate seats and statewide executive seats (governor, lieutenant governor, attorney general, secretary of state, treasurer, auditor and the like, as the offices table holds them) as real races. openSpecialRace in src/core2/modules/world-races.ts accepts only us-house and legislature-* seats, so these fall to officesCalendarWork, where the best-suited eligible person takes the seat on the day. Accept us-senate and the statewide executive kinds, count them on the whole state's places (statePlaces, as the regular Senate race does, not legislativePlace), have decideSpecial seat the winner for the unexpired term, and date them from the state's law for that office family, adding usSenate and statewideExecutive entries to special-election-law.json.

**Rules.** One rule, all 56 places: the same race engine runs every seat and the timing is state data by office family, with no state named in code. No dice: the winner follows the two parties' named candidates and the state's lean, money and incumbency as the other world races do, never a roll. Replace, never layer: the stand-in stays only for the seats still without a race (judges and bodies the world does not count) and the stopgap row is narrowed to name them. An effect is a read, not a record: the winner's term is read by the officials, press and director engines the day they take the seat. Estimate, never UNKNOWN: a state with no found timing keeps the parameters.json estimate marked ESTIMATED.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose, a vacancy in the state's Senate or a statewide executive seat leads to a special election with two named candidates and a winner seated for the unexpired term, shown by vacancy, race and term record ids; src/core2/world-races.test.ts proves it with the vacancy forced through a death in office, and the row SG-GOV-special-election-appointee in src/core2/data/stopgaps.json is narrowed to judges and other uncounted bodies.

**Files.** src/core2/modules/world-races.ts, src/core2/modules/offices.ts, src/core2/data/elections/special-election-law.json, src/core2/world-races.test.ts, src/core2/data/stopgaps.json

**Notes.** First row: Where the voting engine isn't running, a special election's seat goes to the best-suited eligible person on the day instead of a vote. With voting open it is a real race. Its date is the state's law for the office where

Oct 20 (pool feeder): spec written; the row was already narrowed on Oct 19 (gov-special-election-races-outside-town, done) to House and legislative seats, so what remains is the statewide kinds; judges stay on the stand-in because courts come after early access, and the row stays open for them. M. M2's election engine is built, so the old blocker no longer applies.
