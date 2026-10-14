# OPUS-GOV status (new account, from Oct 14, 2026)

Only OPUS-GOV writes this file. The earlier log is `docs/coordination/gov.md`.

- **Owns:** `src/rules` and the government engines (laws, budgets, offices, elections, campaigns, legislatures, executive).
- **Branch now:** `gov/wiring-votes-and-views`, draft PR #4165 to main.
- **Source:** the stress audit of Oct 14 (`docs/reports/stress-audit-2026-10-14/README.md`, PR #4160), defects 3, 18, 19, 4 and 6.

## What the owner can play now

Once PR #4165 merges:

- **Speeches change votes.** What a council member hears changes how they vote. Public comment, witnesses at a committee hearing, a lobbyist's visit, a resident bringing a problem to their office and a candidate's speeches each move the listener's view on that question. The move is larger when the listener trusts the speaker, is close to them, shares their party, or has seen them vote that way before. In the audit's own Hurlock, Maryland, a board member now votes yes on universal preschool after one resident speaks for it at public comment. His opening view would have voted no. The same argument repeated by the same person wears out: each repeat counts less.
- **Speak at public comment yourself.** When you sign up to speak, the members hear you and can be moved. Before, a sign-up was recorded and heard by no one.
- **Groups follow minds.** Residents join the group on their side of a question. Anyone who turns against their group leaves it on the day their view crosses over. Nobody belongs to both sides.
- **Who runs.** Only a cause or standing in town pushes someone to file for office. A grudge or a family worry no longer does.
- **Unemployment follows your state's law.** A laid-off worker's weekly benefit, its cap, the waiting week and the number of weeks come from their state's law. American Samoa, Guam and the Northern Marianas have no program.

## Checklist

- [x] Defect 3: speaking, persuading and voting are one chain of reads (views engine moves the listener by the speaker's standing; council, ballot-measure, record and election choices read the current view).
- [x] Defect 18: interest-group membership follows the view; joining one side leaves the other; no one in both (0 in three one-year worlds).
- [x] Defect 19: only cause and calling drives and standing push someone to file (sub-agent, Sonnet).
- [x] Defect 4: outcome-web landing rows and `outcomesOn` deleted, about 280 lines and 32 data rules (sub-agent, Sonnet).
- [x] Defect 6: unemployment claims read the law in force; stand-in deleted, its stopgap resolved (sub-agent, Sonnet).
- [ ] Next from the audit, this lane: 11, 12, 13, 14, 16, 24.
- [ ] Follow-up: the unemployment law rows describe each state's benefit basis in prose; the claim reads it with patterns. Add a structured basis field to `scripts/research/build-starting-law.py`.
- [ ] Follow-up: interest groups lobby every seat covering the town on a state or federal bill, town board members included. Limit it to the bill's own chambers.

## Sub-agents

- Sonnet (high): defect 6. Finished; 8 tests pass in a random place.
- Sonnet (high): defects 19 and 4. Finished; candidacy 5 of 5 pass. Two outcome-web tests are red on main too (dates before the 2025 opening).

## Needs from other sessions

- OPUS-PEOPLE: views and speech are theirs, and this branch changed them. A case now moves a listener by the speaker's standing (trust, closeness, party, record), not lean nearness alone, and the same case from the same speaker wears out with each repeat. A person's own act for their cause no longer moves their own stance; the drives engine already strengthens the drive. A drive forming no longer re-counts the event behind it. A retelling never reaches the person who gave the speech, and a body's own members no longer speak at its public comment.
- OPUS-CORE: added `leave(personId, organizationId)` to the core API, the mirror of `join`, for group members who change sides. Done for them: candidacy and legislature now read faded closeness (`closenessBetween`); SG-CORE-closeness-gov-raw-reads resolved.

## Next (from the CTO, Oct 14)

- Laws stress audit (PR #4161), defects 1–4, 7, 8, 16, 17, 20, 23, 25: a taste for change reads the bill's direction against the law in force; a passed law's reconsideration slides with how recent and how wide its margin was; the mayor's and governor's desk gets the bill as a choice; delegate seats and Alabama's effective-date rule from data; a repeal recorded as an ending; the authority check reads each level's powers. Not `budgets.ts` money flows or `law-reach/group-b-money.ts` (another session's this round).
- Owner ruling: taxes and benefits change only through bills that set a rate or amount from the laws data. Bill drafting follows the owner's bill-on-paper design (DECISION-REGISTER.md, "LEGISLATION DRAFTING WORKFLOW"): typed provisions and operations as data, the paper view is PLAY's.
- Empty county races on East Franklin, New Jersey (PLAYED_WORLD_SEED 4d71705b…): incumbents decide to run from their record, everyone with standing is considered, and where nobody runs the place's law decides and is recorded.

- Player-path audit: the executive proposes where the charter or constitution allows it (data) and signs or vetoes everywhere; a player who lost can speak from the podium and ask a member they know to carry a bill, the member's decision reading the asker's standing and relationship (owner confirmation pending on the second; build it).
- Capability research: voters read a scandal from the news they actually received, by outlet reach and trust; a bribe buys a real decision through the chooser and is a record the press and justice can surface; later, censure, expulsion, leadership votes and a party withdrawing support.
- Owner rulings that bind this work (Oct 14, late): knowing is a read (a stance cites a law, vote or act only through a record of how the person learned of it); ask why (every proof names each member's vote reasons).

## Questions for the owner

- None. Read `DECISION-REGISTER.md` and `OWNER-DECISIONS.md` before asking.

## Justice

Branch `gov/justice-small`. Owner's order, October 14, 2026: "Courts, trials, prisons: build a small version. Conceptually get it working, especially for the background, and allow for the player."

### Checklist

- [x] A real bribe in the played world: an employers' group lobbyist weighs offering one to each member the group meets before a vote.
- [x] Prosecutors per county and state from the offices data, with a registered stand-in where the data has none.
- [x] Complaints: an official who refused a bribe, or someone told of one, decides whether to report it.
- [x] Investigation: the prosecutor weighs evidence, the corrupted office's prominence and their own party; complaints against the same person join one investigation; it follows the payments on the books.
- [x] Charge and plea: no charge, a plea or a trial, from evidence, the defendant's money and the prosecutor's record.
- [x] Trial on a date from the state's time to disposition; verdict from evidence against the defense.
- [x] Sentence from the state's range: fine to the treasury on the journal, probation or prison.
- [x] Prison: jobs end, seats vacated, no choices until release; release with the record, read by the candidacy inputs as a scandal.
- [x] The player: hearing and verdict scenes through the director's data; days run without choices in prison.
- [ ] A background year with a full chain. 11 played years (4 plain, 7 where the player proposed a minimum-wage raise) made 1 bribe offer and 0 reports. The only bribe route is the employers' lobby on a minimum-wage bill, and only the player proposes one (see "Needs").
- [ ] Forfeiture of the bribe at sentencing (SG-GOV-justice-no-forfeiture).

### Next, from the capability research (docs/research/capability-cases-2026-10-14.md)

- [ ] U1, the rest: a target who turns witness (cooperating testimony in exchange for a plea), from the target's own reads; the prosecutor's workload as a read on opening and charging.
- [ ] U13: an auditor, inspector general or ethics body as a second door into the complaint record, reading a government's books and producing a public report.
- [ ] U3 (conflict to flag): a conviction now feeds the candidacy inputs' on/off scandal flag; the research and the owner's October 5 ruling (the flat scandal penalty is deleted) want each voter's own knowledge of it instead.
- [ ] U6 (with the pillar): the bribe buys something real (a vote position, a contract, a permit), so background corruption has causes.

### What the owner can play now

On the bench, a player who offers bribes to council members can be reported by one who refuses, charged, and tried. The charge and the verdict open scenes in the player's story. A prison term then runs with the world going on and no choices for the player, and the player comes back with the conviction on record. A player on the council who proposes a minimum-wage raise draws the employers' lobby, whose lobbyist may now offer the members a bribe.

### Needs from other sessions

- OPUS-GOV pillar (legislature, interest groups): background bodies propose no bill with money at stake. Only the player's minimum-wage proposal creates an employers' lobby, so the background world offers no bribes. Background proposals of amounts (minimum wage where local authority allows, budget lines with vendors) would give corruption a cause in every place.
- OPUS-WORLD (jobs): skip people in custody when deciding who looks for work and whom an employer hires. Until then the justice engine clears a prisoner's new job before its first shift (SG-GOV-justice-prison-hiring).
- OPUS-CORE: a call for a module to take a person's own choices away for a time (custody), instead of the direct write in `justice-custody.ts` (SG-GOV-justice-custody-core-call).
- OPUS-PEOPLE (health): read the custody record (`inCustody` in `src/core2/modules/justice.ts`) for prison's effect on health; death in prison stays the health engine's call.
- OPUS-PEOPLE (words): mined-bank subjects for the `hearing` and `verdict` situation types and for the `justice.*` events.

### Sub-agents

One read-only Explore helper mapped the director's situations, the player stop and the bench's year runners. No sub-agent wrote code.
