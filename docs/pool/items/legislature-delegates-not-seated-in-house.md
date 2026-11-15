---
id: legislature-delegates-not-seated-in-house
title: "Seat D.C.'s and the territories' House delegates in the House, where they sit, debate and serve on committees"
area: gov
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: nation
model: sonnet
effort: medium
root: none
source: Lying thread, Nov 15, from the officials-ties test at told1
---

**What.** D.C.'s House delegate is an official with no term on the House: `members(api, "federal:us-house")` holds the 435 voting seats and no delegate, so the delegate sits on no body and shares no sitting. Found at Failolo, American Samoa (territory:AS:failolo, seed 3a141c73deabbaa4ed64d91c4f3882be8f9746955f0c121830835dd18cb23cc9): official:seat:US-DC:us-house:00 has no serving term. Seen: in dev mode, the delegate for the District of Columbia is listed among the House's members (non-voting) and knows colleagues from its sittings.

**Cause.** Found in code: `members()` in src/core2/modules/legislature.ts reads the House roster, which is the 435 voting seats; delegate rows are written as officials (src/core2/modules/officials.ts) without a term on the House office.

**Fix.** Give each delegate a term on the House office marked non-voting, read by the roll call as not voting and by everything else as a member.

**Time box.** 2 hours, one Sonnet session at medium effort.

**Rules.** One rule for all 56 places.

**Done when.** At the named place and seed the D.C. delegate has a serving House term, casts no roll-call vote, and reads a tie from the House's sittings; a second session sees it in dev mode on main.

**Waits on.** Nothing.

**Files.** src/core2/modules/officials.ts, src/core2/modules/legislature.ts
