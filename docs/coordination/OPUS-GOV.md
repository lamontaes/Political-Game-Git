# OPUS-GOV status (new account, from Oct 14, 2026)

> **History.** This describes the old engine or a process that ended in October 2026. Don't follow it; read `AGENTS.md`, `ARCHITECTURE.md` and `docs/README.md`.

Only OPUS-GOV writes this file. The earlier log is `docs/coordination/gov.md`.

- **Owns:** `src/rules` and the government engines (laws, budgets, offices, elections, campaigns, legislatures, executive).
- **Branches now:** `gov/estate-tax` (#4290), `gov/starting-wage` (#4297), `gov/floor-deals` (#4281; it also carries the ordinance form, since #4278 merged into the bill-sections branch after #4277 reached main). Merged today: #4277, #4275, #4193, #4206, #4214, #4236, #4241, #4248, #4253, #4255, #4259, #4263, #4266.
- **Source:** the stress audit of Oct 14 (`docs/reports/stress-audit-2026-10-14/README.md`, PR #4160), defects 3, 18, 19, 4 and 6.

## What the owner can play now

Since PR #4165 merged:

- **Speeches change votes.** What a council member hears changes how they vote. Public comment, witnesses at a committee hearing, a lobbyist's visit, a resident bringing a problem to their office and a candidate's speeches each move the listener's view on that question. The move is larger when the listener trusts the speaker, is close to them, shares their party, or has seen them vote that way before. In the audit's own Hurlock, Maryland, a board member now votes yes on universal preschool after one resident speaks for it at public comment. His opening view would have voted no. The same argument repeated by the same person wears out: each repeat counts less.
- **Speak at public comment yourself.** When you sign up to speak, the members hear you and can be moved. Before, a sign-up was recorded and heard by no one.
- **Groups follow minds.** Residents join the group on their side of a question. Anyone who turns against their group leaves it on the day their view crosses over. Nobody belongs to both sides.
- **Who runs.** Only a cause or standing in town pushes someone to file for office. A grudge or a family worry no longer does.
- **Unemployment follows your state's law.** A laid-off worker's weekly benefit, its cap, the waiting week and the number of weeks come from their state's law. American Samoa, Guam and the Northern Marianas have no program.

Once PR #4193 merges:

- **Laws stand once passed.** A council no longer passes a law and repeals it two weeks later. Members who like change back changing old law, not undoing what the body just did, and members hold to their own recent votes. In the audit's Lydia, South Carolina, the county passed 8 of 39 bills in 400 days instead of 96 of 200.
- **Sign or veto as mayor or governor.** A passed bill waits on your desk with your office's real deadline (a governor's from the state's own rule); leave it and it becomes law unsigned. Needs PLAY's desk screen (`decideOnDesk`).
- **Each level passes only what it may.** A county can't impose a Medicaid work requirement; Congress can't touch state sales tax.
- **Ask a member to carry your bill.** Without a seat (or after losing), ask a member you know; they decide from their own position, how close you are and your standing in town (owner decision open: SG-GOV-carry-request).
- **The executive brings bills.** A mayor, county executive, governor or president brings a bill through the member most inclined to carry it; in a sitting the executive does this for changes no member files.
- **Vacancies and incumbents.** A vacant local seat is filled from the town's own residents (an Ohio legislator was appointed an Alaska borough commissioner), and an appointee standing again runs as the incumbent.

Once PRs #4206 and #4214 merge:

- **A bribe buys a vote, and a scandal travels by the news.** A member who took a bribe votes with it as one of their reasons; voters hold a scandal against an official only if a story reached them.
- **Town halls, employer groups and an official's case desk.** Officials hold town halls over bills that split the town; employers organize against any bill that binds them; an official's open cases wait on their desk.
- **Legislatures sit through their sessions.** State legislatures and Congress convene on their real dates, take bills in over the opening weeks in both chambers and vote them week by week; what the floor never reaches dies at adjournment. A bill you schedule goes to the body's next real sitting.
- **Budgets are bargained down.** A failing budget's most opposed change is halved up to three times before it's dropped; Congress no longer drops seven lines every year.
- **Recalls follow the law.** No recall over a disliked ordinance where the state requires grounds, none in a term's first 180 days, no second petition after one failed or is pending, one organizer per petition.

## Queue (CTO, Oct 14, in order)

1. [x] Bills in their body's real form: numbering, enacting clause, motion, title record (#4236, merged).
2. [x] Why one question is every town's first bill: a fixed axis; the floor weighs how much of the town a change touches (#4236, merged).
3. [x] A member's vote on a federal budget line weighs their state's stake (#4241, merged).
4. The 56-place audit (`docs/reports/trace-audit-2026-10-14/`):
   - [x] Subject committees (#4248, merged).
   - [x] Signatures, vetoes, overrides and budget roll calls on the public record (#4253, merged).
   - [x] Congress as one national body (#4255, merged).
   - [x] The balanced-budget rule: sequestration's exemptions, over five years (#4259, merged).
   - [x] Recall petitions finding their bill by id; township budgets (#4263, merged); the minimum wage raise and 11 record-only laws registered (#4266, merged).
   - [x] Absences: a member misses only a vote they care little about, by the same choice as going to work (#4275, merged).
   - [ ] (parked on the license question below) Members voting from district, record, caucus and deal. Measured party unity (share of members voting with their party on bills the parties split on), one year each: Congress 88% to 95% (real: about 90%, CQ); West Virginia's legislature 99.5%, Arizona's 94%. Next: each state's own within-party spread (Shor-McCarty state legislative data) in place of Congress's; measured with `scripts/gov-wiring/vote-parts.ts` and a party-unity count per bill.
5. Owner rulings on bills (OWNER-DECISIONS.md, "afternoon"):
   - [x] Sections composed from the record (series, old and new value, the statute cited); editable terms are number, date and shape; a graduated tax keeps its brackets (#4277).
   - [x] Town and county ordinances in their own form: number, that body's enacting words, sections, a closing effective-date section (#4278).
   - [x] Members trade votes for sections of their own and move poison pills on the floor; favors were already deals (#4281). Next: trades in committee markup, where most bills die.
   - Needs from OPUS-PEOPLE: a purpose phrase per policy series from the words batch, for a section's opening and the bill's title.
6. [x] Estate and inheritance taxes as law series: the federal tax and the 18 places that levy one, paid when an estate settles, heirs taking a view on the law (#4290; the `settleEstate` change is in OPUS-CORE's file, flagged on the PR).
   - [x] The audit's flat $15 floor: a state's researched minimum wage stands at the opening (#4297).
7. [ ] Federal candidates in federal races; the empty race decided by the place's law. The board (Oct 14, evening) gives no-candidate seats and statewide pools to the GOV elections session; left to it.

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

- None open (pool item gov-needs-opus-gov-74 checked the last three on main, Oct 15).

## Next (from the CTO, Oct 14)

- [x] Laws stress audit (PR #4161), defects 1–4, 7, 8, 16, 17, 18, 20, 23, 25, on PR #4193. Reconsideration rule registered as owner decision SG-GOV-reconsideration-rule. Was: a taste for change reads the bill's direction against the law in force; a passed law's reconsideration slides with how recent and how wide its margin was; the mayor's and governor's desk gets the bill as a choice; delegate seats and Alabama's effective-date rule from data; a repeal recorded as an ending; the authority check reads each level's powers. Not `budgets.ts` money flows or `law-reach/group-b-money.ts` (another session's this round).
- Owner ruling: taxes and benefits change only through bills that set a rate or amount from the laws data. Bill drafting follows the owner's bill-on-paper design (DECISION-REGISTER.md, "LEGISLATION DRAFTING WORKFLOW"): typed provisions and operations as data, the paper view is PLAY's.
- Empty county races on East Franklin, New Jersey (PLAYED_WORLD_SEED 4d71705b…): incumbents decide to run from their record, everyone with standing is considered, and where nobody runs the place's law decides and is recorded.

- [x] Executive proposes (by request, data `executive-proposal.json`; SG-GOV-local-executive-proposal) and signs or vetoes; [x] ask a member to carry a bill.
- Player-path audit: the executive proposes where the charter or constitution allows it (data) and signs or vetoes everywhere; a player who lost can speak from the podium and ask a member they know to carry a bill, the member's decision reading the asker's standing and relationship (owner confirmation pending on the second; build it).
- Capability research: voters read a scandal from the news they actually received, by outlet reach and trust; a bribe buys a real decision through the chooser and is a record the press and justice can surface; later, censure, expulsion, leadership votes and a party withdrawing support.
- Owner rulings that bind this work (Oct 14, late): knowing is a read (a stance cites a law, vote or act only through a record of how the person learned of it); ask why (every proof names each member's vote reasons).

## Questions for the owner

- **Can a non-commercial dataset calibrate the game?** Each state legislature's own party spread (to bring West Virginia's 99.5% party unity toward its real level) comes only from Shor and McCarty's state data (Harvard Dataverse, January 2025 release), licensed CC BY-NC-SA 4.0: no commercial use. The register's license rule (#11) covers text, not data. Until a ruling, state chambers keep one national scale (`stateMeanScale`, ESTIMATED) and this item is parked, not built.

## Treasuries

Builder: Claude (Opus, high), branch `gov/treasuries-spend`, PR #4169, started October 14, 2026. No sub-agents built code; one Sonnet reviewer read the report.

What the owner can play now: every treasury pays its budget each month. The town's council budget becomes money that reaches the town's businesses, its staff and the world outside. A federal cut to Social Security lowers the next check of a retiree who claimed during play. Report: `docs/reports/treasuries-2026-10-14/README.md`.

Checklist:

- [x] Monthly treasury close for federal, state, county and city: revenue in, every line out
- [x] Transfers down: federal aid to the state and local treasuries, state aid to the county and town
- [x] In-town lines first: public pay drawn on its line, law-reach benefits, local contractors
- [x] Social Security in town reads the federal line (awards claimed in play; the rest wait on OPUS-CORE)
- [x] Counted workers' withholding; withholding records after the payment; no unmatched lines
- [x] Staff pay checked against its line (defect 19)
- [x] Paid-leave premium cap, bribe record timing, poll cost kind
- [x] Budget notice names its adopter; `departmentRequests` for a bill with no executive
- [x] One-year proof in the played world (Norway, Michigan; Lydia, South Carolina)
- [x] A cut lands as money and mood; the law is blamed only once a heard story ties it (owner ruling, Oct 14)
- [x] One base for budget-line measures; a repealed balanced budget restores its cut (CTO, Oct 14)
- [x] CI fixes: D.C.'s state-level treasury passes on what it collects; property tax with no levying government goes to the collector's
- [x] CI green on the PR head, October 14

Next in this area:

- State surpluses build up where Census revenue exceeds spending: officials decide from their principles to save or spend it (owner ruling, Sept 29).
- The federal debt limit reaches the federal treasury's borrowing (owner ruling, Sept 29).
- Counted workers' withholding shortfall kept as a balance owed (owner ruling, Sept 22: debt persists).
- Appointee pay against its line (executive.ts, the other GOV builder's file).

Needs from other sessions:

- OPUS-CORE: rows in #4191's `outside-flows.json` for `treasury` and `federal-borrowing`, and `outside-revenue` matched instead of a plug, so the stricter M0-08 passes; `setStandingContractAmount` for recipient-income contracts (SG-GOV-opening-award-level); a rerate for the residents' retirement flows (SG-GOV-counted-social-security-level); public employers paid from their treasury (SG-GOV-public-employers-outside).
- Other GOV builder: a budget bill with no executive carries `departmentRequests` lines (`legislature.ts:439`).

Questions for the owner: none.

## Elections

Builder: Claude (Opus), branch `gov/elections-that-matter`, PR #4171, started October 14, 2026. Source: the elections stress audit (`docs/reports/stress-audit-elections-2026-10-14/README.md`, PR #4168), the CTO's player-path findings and the owner's rulings of October 14.

What the owner can play now (once PR #4171 merges):

- **Campaigns raise and spend.** Every candidate's campaign asks the people it can reach for money; each gives by their own reasons and cash, within the legal limit. It buys ads, mail, events and polls from the town's businesses. In Amory, Mississippi, the mayor's campaign raised $3,236 and spent $2,536 before the June 3, 2025 election.
- **Candidates answer from their party and record.** Two nominees of different parties never answer alike. An officeholder answers toward how they voted.
- **Every voter decides by one set of reasons**, and how likely each is to vote slides with what's at stake, the campaigns' contacts, their own habit and what voting costs them.
- **Your campaign day** is a handful of choices: knock on doors, hold an event, give an interview, raise money, rest.
- **Your speech** is composed one part at a time from four offered parts, drawn from your positions and record.
- **Debates move their audience** the way a speech does.
- **Election day:** your ballot is yours alone; you mark it at your precinct's polling place, which has poll workers from your neighbors.
- **Filing:** under a party takes membership (join it first), with deadlines, cycles, special elections, ties and felony disenfranchisement from each state's data. Mississippi's, Illinois's and Missouri's towns now hold their elections.

Checklist:

- [x] Campaigns that spend and reach (audit defects 1, 31 to 34, 36)
- [x] Candidates who read their party (2, 6, 7); answers read the voting record
- [x] One vote model, turnout as a sliding propensity (3, 4, 5, 12 to 17, 24, 35)
- [x] Filing, calendars and law from data (18 to 23, 25 to 30); one data-driven party side
- [x] Player-path findings: the player's ballot is the player's; party filing takes membership; county races hold the state's primary
- [x] Owner rulings: campaign day choices; speech composition; debates move views; polling places with poll workers for the director's scene
- [x] Silent-engines defect: Mississippi towns vote in 2021, 2025, 2029; Illinois and Missouri spring elections; a 56-place calendar guard
- [x] Speed: Robbins 118.6 seconds against the base's 113.5 and 117.4 (noise about 4); Shuqualak 154.9 against 159.0
- [ ] Next: the bench controls for campaign day, speech parts, joining a party (OPUS-PLAY); the English adapter for speech parts (OPUS-PEOPLE)

Sub-agents (3-2-1 rule):

- Sonnet (high): filing, calendars and law from data. Finished.
- Opus (high): campaigns that spend, candidates who read their party. Finished.
- Sonnet (high): campaign-day choices. Finished after a usage-limit pause.
- Sonnet (high): speech composition. Finished after a usage-limit pause.

Needs from other sessions:

- OPUS-CORE: the counted population runs about five times the town (audit defect 37); pool item core-census-weight-model carries it.
- OPUS-PEOPLE: staging poll workers (SG-PEOPLE-poll-workers) is pool item elections-poll-workers. The English adapter for speech parts (move key and fact ids to words) is not tracked yet.
- GOV wiring: who runs leaves many town seats with one or no candidate (audit defects 9 to 11); not re-measured on main.
- OPUS-PLAY: controls for the campaign day, the speech parts and joining a party are pool item play-campaign-day-controls.

## Justice

Branch `gov/justice-small`. Owner's order, October 14, 2026: "Courts, trials, prisons: build a small version. Conceptually get it working, especially for the background, and allow for the player."

#Once PRs #4206 and #4214 merge:

- **A bribe buys a vote, and a scandal travels by the news.** A member who took a bribe votes with it as one of their reasons; voters hold a scandal against an official only if a story reached them.
- **Town halls, employer groups and an official's case desk.** Officials hold town halls over bills that split the town; employers organize against any bill that binds them; an official's open cases wait on their desk.
- **Legislatures sit through their sessions.** State legislatures and Congress convene on their real dates, take bills in over the opening weeks in both chambers and vote them week by week; what the floor never reaches dies at adjournment. A bill you schedule goes to the body's next real sitting.
- **Budgets are bargained down.** A failing budget's most opposed change is halved up to three times before it's dropped; Congress no longer drops seven lines every year.
- **Recalls follow the law.** No recall over a disliked ordinance where the state requires grounds, none in a term's first 180 days, no second petition after one failed or is pending, one organizer per petition.

## Checklist

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
- OPUS-PEOPLE (director's polling place) and the voting engine: a player in prison was taken to the polls (seed a454f3569122862e, Prairie Elk Colony, Montana, February 28, 2026, mid-term). Whether a prisoner may vote is each state's felony-disenfranchisement law; the polling visit and voter eligibility should read `inCustody` against it.

### Sub-agents

One read-only Explore helper mapped the director's situations, the player stop and the bench's year runners. No sub-agent wrote code.
