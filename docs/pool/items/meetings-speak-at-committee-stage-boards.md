---
id: meetings-speak-at-committee-stage-boards
title: "A resident can press Speak at a board with committees"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: Account lead T46
pr: #9083
after: meetings-resident-remark-reaches-a-committee-board
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: follow-up to #9022 and #9076 (Account lead T46, Nov 14); filed by hand on the branch
---

**What.** At a board with a committee stage a resident in the meeting room sees no Speak control and no "You can speak" line, because #9022 hid them (`residentIsHeard` in src/bench/office.ts) while a remark there was heard by nobody. #9076 now makes the members hear it. Seen: the meeting panel under the title, where the Speak for and Speak against buttons and the "You can speak" line show.

**Cause.** Found in code: `residentIsHeard` in src/bench/office.ts gated the panel's `speaks` flag, the resident's line and `meetingSpeak` on the body having at most `committeeOfTheWholeMaximum` members; with #9076's `hearRemarks` the gate has no reason left.

**Fix.** Delete `residentIsHeard`, the `speaks` flag it fed and the conditions in src/bench/play.mjs and `meetingSpeak`; the existing lines from #9022 appear at every board. Test: the kept place Jaguas, Puerto Rico (7237336) in src/bench/meeting-attend.test.ts.

**Time box.** 1 hour

**Rules.** Replace, never layer: the gate is deleted with every reference. No new wording.

**Done when.** A second session sees it in the running game: at a drawn board with a committee stage, a resident sees Speak and the "You can speak" line, speaks, and the next morning the members know them; at a small board nothing differs.

**Files.** src/bench/office.ts, src/bench/play.mjs, src/bench/meeting-attend.test.ts
