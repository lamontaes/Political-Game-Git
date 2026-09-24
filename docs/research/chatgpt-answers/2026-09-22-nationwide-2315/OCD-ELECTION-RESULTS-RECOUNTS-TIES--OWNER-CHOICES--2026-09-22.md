# Election results, calls, recounts, ties and authority: research handoff

**Scope.** National design route for state legislative, statewide executive, local and U.S. House/Senate elections. This is not a fifty-state legal implementation matrix. Rules vary by state, office, election type and sometimes vote total. NCSL is used as the requested cross-check; exact game-law claims should be connected to the jurisdiction/office rule pack and controlling statute before implementation.

**Owner decisions received 2026-09-22:** Show both media projection and legal certification in close races. Election night has a few skippable updates; outlets may make different calls when their available evidence differs. A narrowly losing candidate may choose to request a recount where the applicable law grants standing, grounds and time, or concede. If a race remains tied after the required process, show the lawful decisive event when it occurs (for example, the actual lot drawing or subsequent election where that jurisdiction requires one). These are game presentation/choice decisions, not claims that every jurisdiction offers a candidate recount or uses the same tie procedure.

## What the sources establish

### 1. Election night is a report, not the legal result

- The U.S. Election Assistance Commission (EAC) says election-night results are not final even when the media projects a winner; only election officials provide official results. Unofficial totals continue to be released while ballots are counted. The canvass reconciles ballots and voters, required audits and other steps precede a written certification. Which local/state official or board certifies, and when, varies by jurisdiction and contest. Recounts can push certification dates; no federal uniform recount timeline exists. [EAC: Election Results, Canvass, and Certification](https://www.eac.gov/election-officials/election-results-canvass-and-certification)
- California illustrates the long tail: county canvass completes by day 30, county certification to the Secretary of State by day 31, statewide certification by day 38. This is an example, not a national deadline. The canvass includes valid late-counted mail/provisional ballots, reconciliation, write-ins, damaged-ballot duplication and a sample hand count. [California Secretary of State: Official Canvass](https://www.sos.ca.gov/elections/official-canvass/)
- Arizona's official voter information gives a concrete short route: counties canvass first; the state canvass follows, with a stated 2024 general-election date of November 25 and county deadline November 21. [Arizona Clean Elections Commission: 2024 results process](https://www.azcleanelections.gov/state-general-results)

**Finding:** there is no single national “election is decided tonight” event. Election-night returns are provisional reporting; the legal result follows the jurisdiction's canvass, certification and contest/recount process.

### 2. Media calls are editorial projections, not an election-office action

The EAC explicitly distinguishes a media projection from official results. A press call can be wrong or withheld even after a substantial lead; it does not change ballots, certification, the officeholder, or the statutory start date. A game may model it as a newsroom's sourced judgment from partial returns, with an explicit “projected” label. It should be a separate event from official returns and certification.

### 3. Recounts: no national threshold or single requester

- NCSL's current cross-state overview reports that 26 states and D.C. have automatic recounts, 41 states and D.C. allow some requested recount, automatic triggers range from 1% to a tie, and 0.5% is the most common trigger. This means neither 0.5% nor “candidate may always demand one” is a safe national rule. [NCSL: Election Recounts (updated Sept. 9, 2026)](https://www.ncsl.org/elections-and-campaigns/election-recounts)
- EAC describes common pathways: candidate request, voter request in some places, statutory close-margin trigger, or court order. Fees/cost allocation, eligible requester, deadlines and recount method are state-law matters; no uniform federal statutory recount timeline exists. [EAC](https://www.eac.gov/election-officials/election-results-canvass-and-certification)
- NCSL's state House/Senate tie summary says an automatic recount is generally the first step where state law provides one; absent that, candidates commonly request recounts when the initial count appears tied. Its rules cover state legislative ties, not all governor, congressional or local contests. [NCSL: Resolving Tied Elections for Legislative Offices](https://www.ncsl.org/elections-and-campaigns/resolving-tied-elections-for-legislative-offices)

**Main design implication:** model a recount as a jurisdiction/office-specific procedure triggered by (a) automatic threshold, (b) timely eligible request, or (c) court order. A close margin is not itself authority to recount everywhere. Record the request/trigger, cost/deposit if modeled, recount result and effect on certification. Do not hardcode one national margin.

### 4. A confirmed tie has many different legal resolutions

The NCSL state-legislature cross-check finds broad families, after recount where required: drawing lots/random selection (28 states), a new election (12), selection by governor/election board (Montana, Tennessee, West Virginia), legislative selection (Nevada, New Hampshire), office-specific/conditional rules (North Carolina), no specific statute identified (New Jersey, New York), and Texas/Missouri alternatives involving a special election or agreed lot. [NCSL tie summary and state table](https://www.ncsl.org/elections-and-campaigns/resolving-tied-elections-for-legislative-offices)

Examples checked against official sources:

- **Vermont legislative race:** automatic recount; if still tied, court orders a runoff within three weeks of recount. [Vermont Statutes, 17 V.S.A. § 2602k](https://legislature.vermont.gov/statutes/section/17/051/02602k)
- **South Dakota county/local example:** after canvass, tie leads to recount and then lot; this county statute illustrates why office level matters. [South Dakota Codified Law § 9-13-27.2](https://sdlegislature.gov/Statutes/9-13-27.2)
- **Michigan general procedure:** county board of canvassers appoints a public lot-drawing procedure for a tie that causes failure to elect; exceptions and separate constitutional/office rules mean it is not a blanket cross-state template. [Michigan Election Law § 168.851](https://www.legislature.mi.gov/documents/mcl/pdf/mcl-168-851.pdf)
- **Alaska:** NCSL lists a tie-triggered recount followed by lots if the tie remains; verify the governing Alaska provisions for the particular office before encoding. [NCSL table](https://www.ncsl.org/elections-and-campaigns/resolving-tied-elections-for-legislative-offices)

The state-legislative tie distribution is explicitly **not** a complete tie matrix for congressional, local, primary or governor races. Governors' tie procedures are often constitutional. Do not translate this table wholesale to those contests.

### 5. Plurality is the default; majority and runoff are exceptions

- NCSL says most U.S. elections use plurality: highest vote count wins even without a majority. A majority requirement must come from the applicable rule; it is not implied by the word “winner.” [NCSL, Election Administration in the United States, alternative voting methods](https://documents.ncsl.org/wwwncsl/Elections/Election%20Administration%20in%20the%20United%20States_3.6.25_508.pdf)
- General-election majority/runoff exceptions include Georgia (top-two runoff 28 days after election if no candidate receives a majority), Louisiana's top-two system, and Mississippi statewide-office runoff. These are not one uniform rule; office coverage and timing differ. [NCSL: Runoffs in Primary and General Elections](https://www.ncsl.org/elections-and-campaigns/primary-runoffs)
- Primary nomination rules are a separate layer. Several states require a majority for party nomination and hold a primary runoff; other states use different thresholds or only allow/request a runoff in certain cases. The same NCSL source identifies Alabama, Arkansas, Georgia, Mississippi, Oklahoma, South Carolina and Texas as majority-primary states, with North Carolina and South Dakota exceptions. Do not apply primary runoff rules to the general election.
- Ranked-choice voting can achieve a majority through additional rounds of tabulation rather than another polling day; it should be represented as its own ballot/count method, not mislabeled as a runoff. [NCSL: RCV in Practice](https://www.ncsl.org/elections-and-campaigns/ranked-choice-voting-in-practice-implementation-considerations-for-policymakers)

### 6. When authority starts

Existing project decision A08 (in the request packet) says authority begins on the legal date, not election night. This is consistent with the distinction between returns/calls and certification, and with the separately tracked transition from winning to taking a seat. Keep these milestones distinct:

1. ballots counted / unofficial result;
2. media projection, if any;
3. canvass and certification (or a pending contest/recount);
4. winner determined under the governing law;
5. office authority begins on the jurisdiction's lawful commencement date.

A projected or apparent winner must not act as officeholder merely because a newsroom called the race. The separate owner-approved rule for the election-to-seat transition controls inauguration/term commencement; this request does not replace it.

## Proposed player-facing route (design recommendation, not a legal claim)

1. **Election night:** show returns as incomplete and unofficial, with count status/source and a changing leader. Let media outlets make independent calls only when the newsroom has enough reported evidence; display “projected winner” and do not treat it as certification. Different outlets can wait or disagree.
2. **Post-election days/weeks:** jurisdiction officials canvass remaining valid ballots, reconcile records, conduct required audit, and publish a certified result. A close race can remain unresolved in-world. Use broad time beats until actual jurisdiction deadlines are sourced; avoid a universal fixed number of days.
3. **Close contest:** run an automatic recount only when the specific election rule says so. Allow a request only from eligible actors within their actual window, and include court-ordered recounts only if that legal path exists. Announce the recount, then update totals and certification state from its outcome.
4. **Tie after the legally required count:** resolve through the applicable tie procedure (lot, runoff/new election, authorized official/board, legislature, or a jurisdiction-specific rule). If law is not sourced for the office/jurisdiction, label it unknown and do not secretly sort IDs or invent a winner.
5. **Majority rule:** apply only where the sourced office/election rule requires it. Distinguish primary nomination runoffs, general-election runoffs, RCV rounds, and tie-breaking elections.
6. **Authority:** activate office powers only on the legal commencement date, not on election night, a media call, or an unofficial lead.

**My recommendation:** ship a national baseline of plurality + separate unofficial/canvass/certification states, and let event detail vary by sourced jurisdiction rule packs. Add media calls as newsroom outputs because they create useful political/news drama, but keep their legal status explicitly nil. A tie should pause the race into a visible process state; it should never be resolved by stable ID ordering. For unsupported jurisdictions, show “pending legal procedure” and block assumption of authority until a lawful result/date is available.

## Owner choices to settle before it enters the game

These are product decisions; sources cannot choose them for the owner.

1. **DECIDED:** Several skippable return updates and potentially different outlet calls, using aggregate reports instead of precinct micromanagement.
2. **Should media calls exist in ordinary play?** (A) yes, as outlet-specific projections; (B) only for player/major races; (C) no, show official updates only. I recommend A for races the press follows, with confidence and “not official” language.
3. **DECIDED:** Player may choose to request a recount only where simulated law provides standing, grounds and deadline, or concede. Other election-contest choices remain unapproved.
4. **Should a recount/contest consume time or money for the candidate?** Legal fees and who bears recount costs vary. Options: show only procedure; charge sourced fees/cost recovery; abstract cost as campaign resources. I recommend the first until jurisdiction fee rules are modeled.
5. **DECIDED:** Show the legally decisive tie event when it occurs, using the jurisdiction/office procedure. Do not always stage a special election.
6. **Should unresolved legal gaps halt winner/authority determination?** (A) yes, keep “pending”; (B) fallback to plurality and flag unknown tie only; (C) generic national tie-break. I recommend A for actual ties and majority rules; plurality can remain a default only where the game's declared rules permit it.
7. **DECIDED IN PART:** Outlets may make different calls when their available evidence differs. Whether an outlet declines to call and the precise confidence model remain open; any call must derive from information available to that outlet, not the hidden final result.
8. **Should local races receive the same depth as state/federal races?** I recommend the same legal state machine, with lower-frequency media coverage and simpler presentation for low-salience contests.

## Explicit unknowns / implementation boundary

- No exhaustive official-law validation was performed for all 50 states, D.C., territories, every local office, or each office's recount/tie rule. The NCSL tie page specifically limits its coverage to state legislative seats; the NCSL recount/runoff surveys are cross-checks and starting points, not substitutes for a law profile.
- Exact recount margin, who may ask, deadline, fee, method, certification clock, tie mechanism, runoff timing and authority date need to be attached to the jurisdiction + office + election type. Some jurisdictions have constitutional provisions or special-election exceptions.
- This research does not specify election-outcome probabilities or vote-share adjustments. The candidate/participation model remains the source of vote totals; no magic vote percentages are proposed.
- Federal elections are administered through state/local systems under federal constraints. No universal federal recount or certification schedule was found; presidential electors have additional federal deadlines and should remain a distinct route.

## Source register

- [U.S. Election Assistance Commission: Election Results, Canvass, and Certification](https://www.eac.gov/election-officials/election-results-canvass-and-certification) — official federal explanatory source.
- [California Secretary of State: The Official Canvass](https://www.sos.ca.gov/elections/official-canvass/) — official state process/timetable example.
- [Arizona Clean Elections Commission: General Election Results](https://www.azcleanelections.gov/state-general-results) — state-authorized voter education process example.
- [NCSL: Election Recounts](https://www.ncsl.org/elections-and-campaigns/election-recounts) — up-to-date cross-state recount survey; exact law should be verified.
- [NCSL: Resolving Tied Elections for Legislative Offices](https://www.ncsl.org/elections-and-campaigns/resolving-tied-elections-for-legislative-offices) — state-legislative tie cross-check, updated Oct. 29, 2024; expressly excludes some office classes.
- [NCSL: Runoffs in Primary and General Elections](https://www.ncsl.org/elections-and-campaigns/primary-runoffs) — cross-state distinctions between primary and general runoffs.
- [NCSL: Election Administration in the United States](https://documents.ncsl.org/wwwncsl/Elections/Election%20Administration%20in%20the%20United%20States_3.6.25_508.pdf) — plurality baseline and alternatives.
- [Vermont Statutes, 17 V.S.A. § 2602k](https://legislature.vermont.gov/statutes/section/17/051/02602k); [South Dakota Codified Laws § 9-13-27.2](https://sdlegislature.gov/Statutes/9-13-27.2); [Michigan Election Law § 168.851](https://www.legislature.mi.gov/documents/mcl/pdf/mcl-168-851.pdf) — official primary-law tie examples.
