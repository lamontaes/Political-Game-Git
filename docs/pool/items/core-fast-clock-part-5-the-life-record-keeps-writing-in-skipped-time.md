---
id: core-fast-clock-part-5-the-life-record-keeps-writing-in-skipped-time
title: "The fast clock, part 5: the player and the people around them still remember what happened in skipped years"
area: core
kind: feature
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-core-fast-clock-part-5-the-life-record-keeps-writing-in-skipped-time
pr: #8624
after:
blocked-on:
lead: lives
model: sonnet
effort: medium
root: design-country-tier
source: split from core-fast-clock-twenty-years by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
checked: fable 2026-11-10
claimed-at: 2026-11-11T05:04:37.355Z
branch: claude/pool-core-fast-clock-part-5-the-life-record-keeps-writing-in-skipped-time
---

**What.** A skip must not leave a hole in anyone's life. What happened to the player's household and circle in skipped years (a death, a birth, a job taken or lost, a move, an election) has to be on their cards and in the Journal when play resumes. This part is a test first, and code only where the test finds a hole.

**Cause.** Design: docs/design/life-record.md, and the CTO's note of Nov 10, 2026 on docs/design/country-tier.md: the life record keeps writing remembered events for the player and the people around them during a skip.

**Fix.** Write the test first: after five skipped years, the player's household and three people of their circle hold remembered events dated inside those years for what the records say happened to them. Where a monthly step of parts 2 to 4 changes a person without the engine's own event, route it through the event the engine already emits day by day, so `rememberEvent` hears it. Add no new record kind.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** An effect is a read, not a record: the card and the Journal read the events. No hand-written player text: sentences come from the banks that already tell these kinds. Two-level population: only the player's household, circle and people in focus keep a list.

**Done when.** A second session, on main in a drawn place it names with its seed, presses the 20 years control (part 6), then opens the Journal and the cards of three people around the player: each holds dated sentences from the skipped years, and dev mode's Trace on each sentence opens a record.

**Waits on.** core-fast-clock-part-1-a-results-mode-for-skipped-time, core-fast-clock-part-2-births-deaths-and-illness-in-skipped-time and core-fast-clock-part-3-prices-pay-and-jobs-in-skipped-time.

**Files.** src/core2/person-life.ts (new), src/core2/life.ts, src/core2/results-mode.test.ts (new)

**Notes (Fable B, Nov 10).** The life record's own steps, which this part also waited on, are on main (pull requests #8115 and #8139, which holds #8123), so Waits on now names only the three fast clock parts.

**Notes.** Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 05:04 UTC) on branch claude/pool-core-fast-clock-part-5-the-life-record-keeps-writing-in-skipped-time.
