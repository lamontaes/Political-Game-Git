---
id: gov-record-vote-outcome-written-at-tally
title: "A member's recorded vote carries the roll's outcome, written when the tally closes"
area: gov
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: low
root: none
source: added with npm run pool -- add
---

**What.** The legislature's roll call wrote every member's record row with passed: null and nothing set it after the tally, so a member's vote showed a side and no result (gap sheet of Nov 12, row 19; seen on PR #8471's screen in Providence, Rhode Island, seed b81d4b98-af43-41b5-8d47-7571d882c213: five votes dated the game's first day). The outcome is the roll's own result, written once by the legislature and read by every view. Seen: a member's vote on a bill reads passed or failed beside their side, on the Campaigns record and the Government screen. Seen: a member's vote on a bill reads passed or failed beside their side on the Campaigns record.

**Cause.** Found in code: src/core2/modules/legislature.ts, chamberVote called recordVote with passed: null for each member (near line 4015) and countVote, which decides the chamber's outcome after the tie-break and the Senate's cloture test, never wrote it back; the record type in src/core2/modules/record.ts allows boolean | null. Opening-history votes are not affected: src/core2/past-laws.ts writes passed from the roll call (call.passes) for every vote it records.

**Fix.** chamberVote holds each member's record row and returns it; countVote writes the rows with recordRoll once the chamber's outcome is decided (carried unless the tally is yes <= no or the Senate is short of cloture). Passed means the chamber carried the bill, as floorCountOf reads it. No view recomputes it.

**Time box.** 2 hours

**Rules.** One model: the outcome is the roll's own result, written once by the legislature and read by every view; a view that recomputes it is a duplicate. No dice. Estimate, never UNKNOWN: a recorded vote carries a boolean outcome.

**Done when.** A second session, in a drawn place named with its seed (start with Providence, Rhode Island, seed b81d4b98-af43-41b5-8d47-7571d882c213), opens a council member's record on the Campaigns screen and sees each recorded vote with passed or failed beside its side, matching the Government screen's count for the same bill.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts,src/core2/modules/record.ts,src/core2/past-laws.ts,src/bench/government-bodies.ts,src/core2/vote-outcome-recorded.test.ts (new)
