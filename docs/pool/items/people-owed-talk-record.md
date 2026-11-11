---
id: people-owed-talk-record
title: "A reply that puts a talk off to a day writes an owed-talk record the director can read when the day comes"
area: people
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/pool-people-owed-talk-record
pr: #8429
blocked-on:
source: added with npm run pool -- add
lead: effects
after:
standard: 2
model: sonnet
effort: medium
root: design-life-record
checked: fable 2026-11-11
claimed-at: 2026-11-11T05:23:56.072Z
branch: claude/pool-people-owed-talk-record
---

**What.** A reply such as "Give me tonight. Sunday we sit down with the bills." already records that a talk is owed: the reply's own record names who is owed, about what and by which day. But nothing reads that. Neither person keeps it, nothing can ask "is a talk with this person owed and overdue?", and nothing tells whether the two talked since. This item makes both people remember the owed talk and gives the director one read that says whether it came due unkept. Seen: a talk the player or a relative put off, coming due on the promised day. Feeds: scene-owed-talk-comes-due

**Cause.** Found in code: `replyInScene` in src/director/purpose-scene.ts (lines 1798 to 1836) writes `owedWith`, `owedTopic` and `owedDueOn` as facts on the `scene.reply` record when the ending is one of `owedTalk.keeps` or `owedTalk.endings` in the scene rules; src/director/family-stake-scene.test.ts (lines 307 to 324) asserts it. No row in src/core2/data/life/remembered.json names `scene.reply`, so `rememberEvent` in src/core2/person-life.ts keeps nothing about it on either person, and no function reads the three facts. The same reply records contact between the two through `coreAPI(core).relationship(...)` (purpose-scene.ts, line 1871), so the tie's `lastContactDate` already says when they last talked.

**Fix.** Add no table and no new record. (1) Add one row to src/core2/data/life/remembered.json: record `scene.reply`, only when the record carries the fact `owedWith`, remembered by both people it names, keeping `owedWith`, `owedTopic` and `owedDueOn`. (2) Add one read to src/core2/person-life.ts, `owedTalks(core, personId)`: the person's remembered owed talks, each marked kept when the tie with that person has a `lastContactDate` after the reply's day, and due when `owedDueOn` is on or before today. It reads the person's own short remembered list, never the log. (3) Extend src/director/family-stake-scene.test.ts: advance to the due day with no contact and read the talk as due and unkept; record contact and read it kept. The director's scene that fires from it is scene-owed-talk-comes-due, not this item.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the director's scene for a talk that comes due reads this record, and the relationship engine reads whether the two talked since. No dice: whether the day passes unkept follows recorded time together, never a chance.

**Done when.** A second session plays a drawn place in buildBenchWorld, files and answers the household stake talk with the put-off reply, and sees an owed-talk record name the relative, the topic and the due day; a test advances the world to the due day with no time together and reads the record, and with time together reads it closed, naming the place, the seed and the record ids.

**Waits on.** Nothing.

**Files.** src/core2/data/life/remembered.json, src/core2/person-life.ts, src/core2/person-life.test.ts, src/director/family-stake-scene.test.ts

**Notes.** Needed by scene-owed-talk-comes-due (packet docs/design/scenes/from-life/owed-talk-comes-due.md). Filed by Scene researcher A, Oct 27; lead effects owns the relationships writer.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 01:21 UTC) on branch claude/pool-people-owed-talk-record.

**Notes (Nov 11, 2026, cause rewritten).** The first builder (#8429) found the old cause out of date: the director already writes the owed facts, and src/core2/modules/people.ts holds no tables to write a record into. Fable B confirmed it in the code and rewrote the item as a remembered row and one read, with no new table: the owed facts are already on the reply, and whether the two talked since is already on the tie. The old Fix named a second record of the same fact.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 05:23 UTC) on branch claude/pool-people-owed-talk-record.
