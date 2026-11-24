---
id: core-life-record-part-2-a-talk-brings-up-a-remembered-event
title: "The life record, part 2: in a talk, a person brings up something that happened to them or to you, from the list"
area: director
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/pool-core-life-record-part-2-a-talk-brings-up-a-remembered-event
pr: #8646
after:
blocked-on:
lead: director
model: opus
effort: high
root: design-life-record
source: split from core-life-record by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
checked: fable 2026-11-10
claimed-at: 2026-11-11T05:47:05.671Z
branch: claude/pool-core-life-record-part-2-a-talk-brings-up-a-remembered-event
---

**What.** People now remember what happens to them, and no conversation ever uses it. A neighbor who lost a job last spring, or who was at your wedding, talks as if nothing had happened. This part lets a talk bring up a remembered event, with the event's record kept as the scene's source.

**Cause.** Design: docs/design/life-record.md (the scenes read the list). Searched on Nov 10 on the life record's branch claude/fable-life-gaps: no file under src/director calls `lifeOf` or `whoRemembers`. The life record's list (`lifeOf`, `rememberEvent` and `whoRemembers` in src/core2/person-life.ts) arrives on main with pull requests 8115, 8123 and 8139.

**Fix.** Where a talk chooses what a person brings up (`bringItUp`, src/director/bring-it-up.ts line 228, and the talk composer in src/director/conversation.ts), add remembered events as things to bring up: an event both people remember, or one of the speaker's own from the last year, weighed by the tie between the two and how much the event changed. Keep the event's record id on the scene as its source. Add no scene kind. Lines come from the banks: name each spot the composer needs on the pull request and Story writes them.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** A scene exists only if it writes something back (skill scene-standard): bringing up an event moves the tie or what one knows of the other. No dice: what is brought up follows from the tie, the event and the speaker's traits. Ask why: nobody brings up what they never learned. Story writes every line (CTO, Nov 10).

**Done when.** A second session, on main in a drawn place it names with its seed, plays a year and finds a talk in which someone brings up an event from their life or the player's. Dev mode's Trace on that line opens the remembered event, and the same event is a sentence on that person's card. It takes a screenshot of the talk and the card.

**Waits on.** Nothing. The life record's steps it waited on are on main (pull requests #8115 and #8139, which holds #8123). The build does not wait for lines: its pull request names each spot that needs them, and Story writes them after.

**Files.** src/director/bring-it-up.ts, src/director/conversation.ts, src/core2/person-life.ts (new)

**Notes.** Claimed by next for opus-5251 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 05:47 UTC) on branch claude/pool-core-life-record-part-2-a-talk-brings-up-a-remembered-event.
