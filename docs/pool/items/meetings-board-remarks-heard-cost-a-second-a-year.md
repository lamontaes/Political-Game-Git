---
id: meetings-board-remarks-heard-cost-a-second-a-year
title: "A resident's remarks at a board meeting are heard by every member as a speech, and cost a second a year"
area: gov
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "the Account lead and the Skills thread, Nov 15: the paired performance guard measured the Train at 1.31 against 1.2 at Vilas, SD (place 4667340)"
claimed-at:
after:
lead: speed
model: opus
effort: medium
root: rc5-full-detail-every-day
---

**What.** Each remark made at a board's public comment is delivered as a speech to every member and to everyone else who spoke, through the speech engine. The comment came with the committee-stage boards. Seen: the played year at Vilas, South Dakota (place 4667340, seed c200623d61b817cdbdbb9e459ce67a3c381f9d7893848b5e1a43ce0ef2ac9716) spends 1.0 s a year in `publicComment` against 0.55 s at main.

**Cause.** Measured: a CPU profile of that year (place 4667340, seed c200623d61b817cdbdbb9e459ce67a3c381f9d7893848b5e1a43ce0ef2ac9716) (inclusive time) puts `hearRemarks` (`src/core2/modules/meetings.ts`) at 0 ms on main fa34439d and 993 ms on Train 3b168daf, and `publicComment` at 563 and 1,023 ms; the remarks came with #9076 and #9083 (committee-stage boards hear a resident's remark). The audience is full people (the members), so `groupUnwatched` does not apply. This is the player's own chain, where the rule is full records.

**Fix.** No change tonight (the Account lead, Nov 15): a cut to who hears a remark at the player's own meeting needs a rule. Options to put to the rule's owner: a remark moves each member once per meeting not once per speaker; or the members' answer to a remark is computed at the vote, when something reads it.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, write what was read in this item and stop.

**Rules.** Speed (`AGENTS.md`): no change may make a year more than 20 percent slower. No dice: members' answers come from their views, not a roll. Replace, never layer: a faster hearing replaces the current one.

**Done when.** A second session, not the builder, names the rule that was ruled, and then plays a year at a drawn place and seed it names and sees the remarks' effect on the members' votes unchanged in a roll call and `publicComment` inclusive time below 700 ms.

**Waits on.** Nothing.

**Files.** src/core2/modules/meetings.ts; src/core2/modules/speech.ts
