---
id: elections-a-person-can-cheat-a-count
title: "A person with a hand in an election can cheat its count, decided like any crime, and it is found only by a recount, a witness or a record"
area: elections
kind: feature
priority: 3
size: L
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: elections
source: "Account lead's scene build-out, Nov 15, 2026 (the build-out's rulings-and-briefs, section 1, in the project's shared files); not for now (Account lead, Nov 15 02:39Z)"
model: fable
effort: medium
root: none
---

**What.** Real local races were stolen at the box: a county boss had voters mark ballots in front of him and pulled ballots from the box, the box later turned up unsealed, and a judge threw out the county's votes (Georgia, 1962; Atlanta Magazine excerpt of the candidate's memoir); a faction sent carloads of men to take a precinct's ballots and the marshal stopped them (Jackson County, Missouri, 1922; Flatland KC). The owner has ruled that the world is not made of people incapable of unlawful acts, so a person who runs or works an election may cheat its count when their own record says they would, and it is found only the way real fraud is found. Seen: a race night whose count does not add up, the recount scene that finds it, and the paper's story; a lost race the player can contest.

**Cause.** Design: rulings, each read in full. DECISION-REGISTER.md line 394 (item 9: the engine does not make "every actor incapable of unlawful conduct"). OWNER-DECISIONS.md line 108 ("Crime is not only need": every crime and every kind of corruption is decided by traits, risk as known from records and need, through the shared chooser, never rolled). docs/coordination/prior-rulings/press.md lines 25 to 29 (Oct 5: caught "ONLY via investigations, leaks, records, or people who turn on you. No detection roll"). Found in code: no engine models a falsified count; src/core2/modules/voting.ts keeps recounts (`recountOf`, line 4145, with `insideRecountMargin` and `recountRuleFor`) on an honest count, and src/core2/modules/corruption.ts is the pattern for a crime decided through the chooser.

**Fix.** Decide who could cheat (a person whose role touches the count: a poll worker, a precinct official, a party official, a candidate's agent), when (only on a count they touch, in a race where they have a stake from their record: a candidate they are tied to, a faction they belong to, money they were given), and how (through `chooseAct` with the three reasons of ruling 108, as `corruption.ts` does for a bribe). Write the act as a record on the precinct's count (ballots added or removed), with the falsified totals the count then reports. Exposure only through existing routes: a recount under the place's rule finds the difference, a witness present at the precinct who decides to tell (the same tell decision corruption uses), or a record that does not add up (more ballots than voters on the roll, read from the voter registration record). Every weight is an ESTIMATED or TUNABLE row with its spread in the elections parameter table.

**Time box.** 8 hours for one Fable session to design and a Sonnet session to build, in two pull requests (the act and its record; then exposure through the recount and the witness).

**Rules.** No dice: no fraud rate, no roll; the act is a decision from the person's record and the risk they can see. One rule, all 56 places: the roles and recount rules come from place data, never a named state. Every number is a parameter row. A played year stays under two minutes: the decision runs only on election day, only for people whose role touches a count.

**Done when.** A second session, on main, in a place drawn from all 56 and a seed nobody chose, finds over played elections a count falsified by a named person with the reasons the chooser kept, sees it found (or not) only through a recount, a witness or a roll that does not add up, and reads the recount scene and the paper's story naming it by record id; in a world where nobody's record gives a stake, no count is falsified.

**Waits on.** Nothing. Not scheduled now (Account lead, Nov 15 02:39Z: "file it as a pool item ... not now").

**Files.** src/core2/modules/elections.ts, src/core2/modules/corruption.ts, src/core2/choice.ts, src/core2/modules/voting.ts, src/core2/data/elections/parameters.json
