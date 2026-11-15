---
id: elections-incumbent-filing-refused-for-fee-leaves-house-seat-without-a-major
title: "A sitting U.S. House member who decided to stand again is refused at the counter for the filing fee, so their party has no one on the ballot"
area: elections
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: elections
model: opus
effort: medium
root: none
source: Account lead measurement, Nov 15, 2026 (party-asks item)
---

**What.** In a played world a share of U.S. House seats reach the filing deadline with no filer from one major party, and the missing party is often the sitting member's own. Measured on the Train head 693479ab (15 months played, 18 drawn places, named in the party-asks item's Notes): 5 of 10 U.S. House seats had a major party missing, against 8.7 percent of real 2024 House races without major-party competition (`benchmarks.json`, `usHouseNoMajorPartyCompetitionShare`). Seen: a House race on the Politics screen's Elections tab and the ballot with one major party's name missing, and no scene from that party's chair.

**Cause.** Found in code: `fileRunners` in `src/core2/modules/candidacy.ts` and `checkEligibility` in `src/core2/modules/elections.ts`, measured at Mountain Home, North Carolina (drawPlace seed `fields-measure2`, tag b; Republican-held seat `seat:US-NC:us-house:11`): the incumbent's stand-again decision is `run: true` (`reasons.standAgain` 0.9), made on 2025-01-21, and `fileRunners` in `src/core2/modules/candidacy.ts` files on 2025-10-20 through `fileFor`. `checkEligibility` (`src/core2/modules/elections.ts`, rule `filing-fee`) refuses because the member holds $1,291 against the $1,740 fee (their cash was $3,479 on 2025-01-22, $1,334 on 2025-06-01 and $1,291 on the filing day). The decision then reads `filing: { status: "refused", unmet: ["filing-fee"] }` and nothing files again. No Republican was weighed in the member's place because the decision says the seat is held. A member of Congress in Mississippi held $1.43 million and one in Wyoming $410,000 in the same measurement, so the opening cash drawn for a sitting federal official spans hundreds of times and the low end cannot pay a filing fee. In life a candidate's committee pays the fee (FEC: candidate committees pay filing fees from campaign funds).

**Fix.** First read the two causes apart: (1) the incumbent's decision is held after the filing is refused, so the seat counts as defended while no one filed; (2) the fee is paid from the person's own cash, not the campaign committee's. In `fileRunners`, a decision to run whose filing was refused for a rule the person can still meet (the fee) is weighed again on each day of the window until it files or the window closes, and the seat is treated as open for the party's ask once the deadline passes with no filing. Pay the fee from the campaign's money where the person has a committee, otherwise from their own. Check the opening cash drawn for sitting officials in the same pull request and, if it spans far beyond what a member's pay and savings allow, bring the row to the CTO as its own item, not a weight here.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note and stop.

**Rules.** No dice. One rule, all 56 places: no place named in logic. Estimate, never UNKNOWN. An effect is a read: the fee is read by the money journal.

**Done when.** A second session plays Mountain Home, North Carolina (seed `fields-measure2` tag b, or any drawn place whose House member holds less than the fee) to the 2025 filing deadline on main and sees on the Elections tab a Republican filed for the seat, or the party's chair asking someone; a pinned test at that place and one other place passes in about a minute each; 12 drawn places played to the deadline show a smaller share of House seats with a major party missing than the 50 percent measured.

**Waits on.** Nothing.

**Files.** src/core2/modules/candidacy.ts, src/core2/modules/elections.ts

**Notes.** Mountain Home's Democratic side had four state officials (auditor, attorney general, governor, treasurer) file for the House seat on 2025-10-20, three of whom withdrew under the one-seat rule; that is the wide pool path and is not changed here.

Account lead rulings, Nov 15: a person who decided to run and was refused only for the fee keeps trying through the window (built, #9507). No committee is invented before the filing: the fee comes from a campaign account that already holds money, else from the person's own cash (#9153 rule; AGENTS.md "Simulate it, don't ask"). An officeholder's opening cash follows the pay their office has paid, through the renters thread's opening-cash rule (item `people-an-officeholders-opening-cash-follows-the-pay-their-office-has-paid`). Correction: the earlier note that the long step differs from the one-step run is retracted; the difference was Train head versions. The House gap's other cause was a label, not a missing ask (item `elections-resident-filing-before-the-party-meeting-files-with-no-party-label`).
