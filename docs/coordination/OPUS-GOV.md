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
