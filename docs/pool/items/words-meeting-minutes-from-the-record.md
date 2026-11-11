---
id: words-meeting-minutes-from-the-record
title: "A council or board meeting has minutes worded from its records"
area: words
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/pool-words-meeting-minutes-from-the-record
pr: #8671
blocked-on:
lead: words
source: story/restore-liked-lines, Nov 8 (a rewrite never deletes a line the owner graded good)
claimed-at: 2026-11-11T05:47:38.879Z
after:
standard: 2
model: sonnet
effort: medium
root: rc4-hand-written-words
checked: fable 2026-11-10
branch: claude/pool-words-meeting-minutes-from-the-record
---

**What.** Four lines of minutes the owner graded good sit in data/english/parts/minutes.json under stopgap SG-WORDS-minutes-no-reader: "Participants discussed {topic}.", "The staff provided an update on {topic}.", "The manager turned next to {topic}." and "Voting against this action: {members}.". No engine words the minutes of a meeting. Word the minutes of a recorded council or board meeting from its agenda and roll call records, using these pieces, and show them where the meeting's record is read.

**Cause.** Found in code: data/english/parts/minutes.json holds four owner-graded lines under stopgap SG-WORDS-minutes-no-reader (src/director/data/stopgaps.json, line 640), and no engine words the minutes of a meeting.

**Fix.** Word a recorded meeting's minutes from its agenda items and roll calls with these four pieces, in a function in src/english beside the bill paper's words. Show them as the detail of a past meeting on the body's page in Politics, drawn with the one list-beside-detail renderer (`rosterScreen` in src/bench/ui/roster-screen.mjs); no screen shows a past meeting today (src/bench/office.ts has only the live meeting, `meetingSceneView`). Read the Politics mocks in docs/mocks/2026-11-08-play/ and the screen-to-mock skill first, and add no new kind of screen. Then delete the stopgap.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: every topic is the bill or agenda item on the meeting's record and every member on the roll call is named from the vote record. An effect is a read, not a record: the minutes are read by a screen or the paper. No hand-written player text: only these bank pieces and new bank pieces word them.

**Done when.** A second session, not the builder, plays a one-year run of the played world (buildBenchWorld) in a drawn place from all 56 (place and seed named), opens a past meeting on the body's page in Politics and reads minutes that discuss the meeting's agenda item and name the members who voted against it, by record id, with a screenshot at 1440x900. A test beside src/english/bill-paper-words.test.ts proves the wording, and SG-WORDS-minutes-no-reader is deleted.

**Waits on.** Nothing.

**Files.** data/english/parts/minutes.json, src/director/data/situation-types.json, src/english/screen-words.ts, src/english/bill-paper-words.test.ts, src/director/data/stopgaps.json

**Notes.** Added Nov 8 by the Story session with the restore of the owner's liked lines (`scripts/dialogue-batch/liked-lines-kept.test.ts`). The graded keys stay in a bank until a scene reads them.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 02:37 UTC) on branch claude/pool-words-meeting-minutes-from-the-record.

Released (2026-11-11): a builder claimed this and did not start it (its draft said so and left the claim in place); Fable B released it so another builder can take it.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 05:27 UTC) on branch claude/pool-words-meeting-minutes-from-the-record.

Released (2026-11-11): Claimed by my own next loop, not worked: each needs Story-session lines under data/english/parts, a dedicated machine for speed runs, or a rewrite beyond one pass (see my earlier release notes on this item). Continue on branch claude/pool-words-meeting-minutes-from-the-record.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 05:35 UTC) on branch claude/pool-words-meeting-minutes-from-the-record.

Released (2026-11-11): Cause matches, but it needs a new past-meeting detail screen in Politics built to the mocks plus a Words-reviewed wording function, more than one session's three hours; not built. Continue on branch claude/pool-words-meeting-minutes-from-the-record.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 05:36 UTC) on branch claude/pool-words-meeting-minutes-from-the-record.

Released (2026-11-11): Not built: its Files include data/english/parts/minutes.json (Story only) and it needs a new past-meeting detail screen in Politics built to the mocks; already released twice for the same reasons. Continue on branch claude/pool-words-meeting-minutes-from-the-record.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 05:37 UTC) on branch claude/pool-words-meeting-minutes-from-the-record.

Released (2026-11-11): Needs a new past-meeting screen and Words-reviewed wording; not built. Continue on branch claude/pool-words-meeting-minutes-from-the-record.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 05:46 UTC) on branch claude/pool-words-meeting-minutes-from-the-record.

Released (2026-11-11): Not built: released by four sessions before me for the same reason. It needs a new past-meeting detail screen on a body's page in Politics (no screen shows a past meeting; office.ts has only the live meeting) built to the mocks, and the Files list includes data/english/parts/minutes.json, which only Story edits. The four pieces exist; wording them from agenda and roll-call records is buildable, but the screen needs a design decision (which meetings are listed, what the list and detail hold) from the lane or Fable. Continue on branch claude/pool-words-meeting-minutes-from-the-record.
