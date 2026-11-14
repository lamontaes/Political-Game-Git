---
id: gov-governor-running-mates
title: "Each governor candidate in a joint-ticket state runs with a running mate, and the ticket wins or loses together"
area: gov
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/project-thread-6jyjic
pr: #9080
after:
blocked-on:
lead: governing
source: Account lead T1 on #8928 (comment 6837726060, Nov 12), from the work on #8939; owner chose "Build it now" by decision card, Nov 13 23:51Z, and "I pick, or choose for me" for the player's running mate, Nov 14 00:07Z
standard: 2
model: opus
effort: medium
root: none
---

**What.** In the town's own state, where the law elects the lieutenant governor on one ticket with the governor (31 of the 56 places), each governor candidate files with a running mate when the state's law joins the ticket (at filing, after the primary, or the lieutenant governor's own primary nominee joins), nobody runs for lieutenant governor alone, and one vote counts both. A player running for governor picks their running mate from three or four people of their party, or takes the world's pick. Seen: the ballot at the polls, where the governor's race reads "For Governor and Lieutenant Governor" and each line names the candidate and running mate; the Campaign board's "Your running mate" section; and the election-night results, where both offices show the same ticket's totals.

**Cause.** Design: owner decision cards, Nov 13 23:51Z ("Build it now") and Nov 14 00:07Z (the player picks from three or four, or "Choose for me"); the stand-in row `SG-GOV-outside-ticket-raced-alone` in `src/core2/data/stopgaps/gov.json`, whose marker sat in `src/core2/modules/elections.ts` `contestFor`.

**Fix.** Read when the ticket forms from the research row (`ticketJoins` in `data/research/offices/state-offices.json`, read by `governorTicketStage` in `offices.ts`). A running mate is a filing in the ticket office's contest with `ticketWith` naming the governor candidate's filing, chosen by `officialCandidate` weighed for that ticket (`nameRunningMate`), standing while the governor candidate stands (`ballot`). Candidacy and the standing nominees skip an office the tickets fill (`filledByTickets`); its primary is not counted; on election day the office's count is the governor's, mapped through each ticket (`decideTicket`), seated by the same `settleCount`. The ballot shows the ticket as one line; the Campaigns board offers the player's choice (`runningMateChoice`, `chooseRunningMate`).

**Time box.** 8 hours for one opus session.

**Rules.** Replace, never layer: the office's own contest field, primary count and general count are removed for ticket states, not kept beside. One rule, all 56 places: the stage is the research row. No dice: the running mate is the person with the strongest reasons, or the player's pick. Speed: the ticket office's count is mapped from the governor's, no second count.

**Done when.** A second session runs a played world in a drawn joint-ticket state (named by the research row) with a seed it did not choose, through the next governor election, and sees by record id: every governor filing on the ballot has one running mate filing (`ticketWith`) of its party, nobody else filed for lieutenant governor in an at-filing or after-primary state, the lieutenant governor result's winner is the running mate of the governor result's winner on the same day, and the ballot at the polls shows the governor's race as one block with both names on each line. Playing as a governor candidate, the Campaign board offers three or four people with Choose and Choose for me, and the choice is the running mate on the ballot.

**Waits on.** Nothing.

**Files.** data/research/offices/state-offices.json, src/core2/modules/offices.ts, src/core2/modules/elections.ts, src/core2/modules/voting.ts, src/core2/modules/officials.ts, src/core2/modules/candidacy.ts, src/director/polling-place.ts, src/bench/campaign.ts, src/bench/handler.ts, src/bench/play.mjs, src/bench/ui/ballot-paper.mjs, src/bench/data/controls.json, src/core2/data/stopgaps/gov.json, src/core2/governor-running-mates.test.ts (new)
