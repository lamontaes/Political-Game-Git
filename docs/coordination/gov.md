# OPUS-GOV: Law and government

Only OPUS-GOV writes this file. See "The team" in `AGENTS.md` and `docs/coordination/BOARD.md`.

- **Owns:** src/rules and the government engines (laws, budgets, offices, elections, legislatures, executive).
- **Branch:** opus-gov (from pool/M1-laws, with RULES-2's pool/P14-* shelves merged in).
- **Model:** Opus, medium: agreed designs on rules already lifted.
- **Starts from:** Laws in force (#3958, branch pool/M1-laws) and RULES-2's properly lifted rules shelves (#3946 offices, #3948 elections, #3950 legislatures, #3931 laws, #3932 economy). Takes over RULES-2's branches.

## What the owner can play now

Nothing yet.

## Checklist

An order of work, not a ceiling: when it's done, keep going into this area's next roadmap items.

- [ ] **Laws in force.** Which law applies to each person, business and place at every level, from the start date's real law; effective dates on the calendar; the minimum wage rises on its date.
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

None yet.

## Log

Newest first: one line per event (what changed, the measured result, what's next).
