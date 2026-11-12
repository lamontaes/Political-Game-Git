---
id: core-fast-clock-part-4-elections-counted-from-the-voters-in-skipped-time
title: "The fast clock, part 4: in skipped time an election is counted from the voters, with no campaign days played, and the campaign-stride switch is deleted"
area: core
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/pool-core-fast-clock-part-4-elections-counted-from-the-voters-in-skipped-time
pr: #8606
after:
blocked-on:
lead: elections
model: opus
effort: high
root: design-country-tier
source: split from core-fast-clock-twenty-years by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
checked: fable 2026-11-10
claimed-at: 2026-11-11T05:12:03.127Z
branch: claude/pool-core-fast-clock-part-4-elections-counted-from-the-voters-in-skipped-time
---

**What.** In skipped time every race is still campaigned event by event; the only shortcut is a switch that plays one rival campaign day in four. This part decides a race the player is not in from its voters on election day, through the one election engine, and deletes the switch. A race the player or the people around them are in is not touched.

**Cause.** Found in code: `fastForward()` (src/core2/fast-forward.ts, 28 lines; read in src/core2/modules/campaigns.ts line 6570) thins rival campaign days by a stride of four (stopgap SG-SPEED-fast-forward-campaigns, src/core2/data/stopgaps/speed.json line 3) and nothing else about a campaign changes in a long run. Measured in the calendar-only year above: the press week cost 1.8 seconds and local meetings 0.9 of the 14.6.

**Fix.** In results mode a race the player, their household and their circle are not in is decided on election day by the one election engine's count, from the voter groups' standing views and the candidates' records. No campaign day, door, poll, ad, interview or press week is played for it. Where the group results of core-speed-world-campaign-days-as-group-results (parts 1 to 3) are on main, apply them once a month as the campaign's effect; where they are not, apply none and register that as a stopgap. Then delete src/core2/fast-forward.ts, its switch in campaigns.ts and the stopgap row.

**Time box.** 10 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** One election engine: results mode calls the same count, never a second one. No dice: who wins follows from the voters' views and the candidates' records. Replace, never layer: the stride switch is deleted in this change. The next election uses the record: every seat filled in skipped time has a term row a later race reads.

**Done when.** A second session runs the part's test in a drawn place it names with its seed: four skipped years that include a general election. Every seat on the ballot has a winner and a term, and the printed line shows turnout and the winner's share for three races beside the same races in the day-by-day world. After part 6 it presses the control in the running game, opens the town's council on the Politics screen and finds every seat held by a person with an election date inside the skipped years. A search of src finds no `fastForward`.

**Waits on.** core-fast-clock-part-1-a-results-mode-for-skipped-time.

**Files.** src/core2/fast-forward.ts, src/core2/modules/campaigns.ts, src/core2/modules/elections.ts, src/core2/modules/voting.ts, src/core2/data/stopgaps/speed.json

**Notes (Fable B, Nov 10).** Waits on used to add: "It reads the group results of core-speed-world-campaign-days-as-group-results-part-3-asks-endorsements-by-group when they are on main and does not wait for them." That sentence is true and is kept here. In Waits on it named a second item, and `next` reads every item named there as something to wait for, so this part was never offered.

**Notes.** Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 05:12 UTC) on branch claude/pool-core-fast-clock-part-4-elections-counted-from-the-voters-in-skipped-time.
