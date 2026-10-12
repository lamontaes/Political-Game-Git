# OPUS-GOV: Law and government

Only OPUS-GOV writes this file. See "The team" in `AGENTS.md` and `docs/coordination/BOARD.md`.

- **Owns:** src/rules and the government engines (laws, budgets, offices, elections, legislatures, executive).
- **Branch:** opus-gov (from pool/M1-laws, with RULES-2's pool/P14-* shelves merged in).
- **Model:** Opus, medium: agreed designs on rules already lifted.
- **Starts from:** Laws in force (#3958, branch pool/M1-laws) and RULES-2's properly lifted rules shelves (#3946 offices, #3948 elections, #3950 legislatures, #3931 laws, #3932 economy). Takes over RULES-2's branches.

## What the owner can play now

- **Law where you live (Oct 12):** a new world in any of the 56 places opens with that place's real law at every level: federal, state, county and city minimum wage (the highest floor that legally applies wins; a city ordinance only counts where the state allows it), federal, state and local income tax (territories pay their own instead of federal), state plus local sales tax, the county's property tax, and SNAP, unemployment and Medicaid amounts. A raise scheduled for later in the year takes effect on its date, is announced as a public record, and lifts every town job under the new floor that day. No screen yet: the bench's "law here" view reads `lawHere` (needs OPUS-PLAY).

## Checklist

An order of work, not a ceiling: when it's done, keep going into this area's next roadmap items.

- [x] **Laws in force.** Done Oct 12: `src/core2/modules/laws.ts` loads 957 sourced rows (317 jurisdictions) built by `scripts/research/build-starting-law.py`; M1-01 runs `src/core2/laws.test.ts` (random place, random territory, preemption, pending phase, named worker's raise), 4 of 4 passing on fresh draws. Which law applies to each person, business and place at every level, from the start date's real law; effective dates on the calendar; the minimum wage rises on its date.
  - Verified by: M1-01: 3 random places including a territory: checks every tracked law against its source, one preemption case, one law not yet in effect, and one named worker's raise.
  - Needs: CORE (calendar)
- [ ] **Offices and seats.** Every office and seat, real structures from official sources (replacing the Book of the States values), fictional holders who are full people, the real-name check.
  - Verified by: M1-12: click any official in any state for a full record. M2-01: every seat covering the player has a holder and a term; one vacancy filled by its real rule; the real-name test passes.
  - Needs: CORE (fill-in), PEOPLE (views behind positions)
- [ ] **Filing (golden path step 3).** Real election dates and filing rules; you file at that place's real filing office (clerk, registrar or board of elections) in a conversation; the filing, fee and petition become records.
  - Verified by: M2-02 and M2-03 in a random place; then you file in the evening build.
  - Needs: PLAY (the filing screen)
- [ ] **Campaigning (step 4, owner, Oct 12).** Between filing and election day you win support through the people you actually reach: meeting people, door to door, speeches, endorsements, news, ads and party; money raised and spent under real contribution limits; other candidates campaign too. Each act changes what specific voters know and think, through PEOPLE's views; support never moves without a recorded cause; polls read those voters. The simplest version that follows "Keep it simple".
  - Verified by: M2-05 and M2-06 in a random place; then you campaign in the evening build.
  - Needs: PEOPLE (views, meeting people), PLAY (the campaign screen)
- [ ] **Elections (steps 5 and 11).** Ballots from the real voters in your area plus voter groups elsewhere; winners seated on the right dates; party primaries by each place's rules; state and federal races running in the world; the next election reads each candidate's record (votes cast, laws passed, promises kept or broken).
  - Verified by: M2-07, M2-08 and M2-10 in a random place and a full election year; in the following election, an officeholder's record changes specific votes, each with its reason.
  - Needs: PEOPLE (who runs, M2-04; views), WORLD (economy behind votes)
- [ ] **Budgets and taxes.** Treasuries, taxes on everyone (zero can be lawful), budgets on real calendars (old budget rules until councils vote), federal and state money reaching people.
  - Verified by: M1-07 in a random place over a year.
  - Needs: CORE (accounts), WORLD (economy)
- [ ] **Councils, ordinances, the mayor (steps 6 to 9).** Write a bill with real amounts, negotiate, the body votes on members' reasons, the law changes the town, the mayor acts.
  - Verified by: M3-01 to M3-05 in a random place.
  - Needs: PEOPLE, PLAY

## Needs from other sessions

- **OPUS-CORE: a pay-change path.** core2 can't re-rate a job: `admitWorkCommitment` is the only writer. Stand-in: the laws module rewrites the commitment's hourly rate on the minimum wage's date (stopgap `SG-GOV-wage-floor-rate-write`). Wanted: an API to re-rate a commitment from a date with its source.
- **OPUS-CORE: opening pay reads the start date's law.** `population.ts` floors opening pay with the old core's minimum-wage table, which holds later-2026 rates (Alaska opens at $14 in January; the real January rate is $13). Wanted: read `lawInForce(api, "minimum-wage", startDate)` or the same rows (`lawChainForPlace` + `startingLawRows`), so July's raise is a real raise.
- **OPUS-PLAY: the "law here" bench view.** `lawHere(api)` returns every tracked series with each level's row, source, estimate flag, what's set aside and why, and pending phases.

## Log

Newest first: one line per event (what changed, the measured result, what's next).

- 2026-10-12 08:05 UTC: Laws in force done. Research added (sales tax all 56; county property tax from ACS; local income tax and minimum wage; married brackets; territory income tax; effective-date rules). M1-01 4/4 on fresh random draws; typecheck, eslint and tripwires clean; zero-dice's 2 hits are inherited (`deep-past.ts`, red without this change); `release:check` can't resolve its base commit in this clone. Next: offices and seats.
- 2026-10-12 07:22 UTC: Branch `opus-gov` created from `pool/M1-laws` with RULES-2's shelves (P14 offices ⊂ elections ⊂ legislatures ⊂ laws ⊂ economy, one merge) and main merged. Golden path: M0-10 and M0-11 pass.
