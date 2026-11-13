---
id: words-home-day-talk-reads-the-hour-and-whose-day-it-was
title: "The everyday talk at home asks about a work day at 7 in the morning, of someone with no job, and says the same thing two days running"
area: words
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after: words-opening-evening-talk-raises-what-the-president-said
blocked-on:
lead: words
model: opus
effort: medium
root: rc4-hand-written-words
source: lead's play of main plus the 10:00 UTC riders, Nov 11, 2026 (Panama, Nebraska, seed f06ba996-7a12-41f6-a670-66607f7659bb); owner, Nov 11, 2026 (docs/coordination/OWNER-DECISIONS.md, "Nov 11: every line goes through the English engine")
checked:
claimed-at:
---

**What.** This is the talk a player has most: clicking someone at home on a day with no news. Played in Panama, Nebraska (seed f06ba996-7a12-41f6-a670-66607f7659bb), a 17-year-old with no job, talking to their father each morning after pressing Day. Wednesday, 7:00 AM: "You were up early." Thursday, 7:00 AM: "You were up early." Friday, 7:00 AM: "Busy one at work today?" The replies each morning: "I'm beat. Just glad to be home.", "I missed you today.", "Sit with me a minute?", "Fine. Nothing worth telling." Then one line back ("Take it easy tonight.") and the talk is over. Every line was written for an evening after work, none has an insert, the day's work is asked of the one with no job, and nothing in it comes from what either person did. Seen: any day at home, when the player clicks a member of the household and nothing else opens the talk.

**Cause.** Found in code: `quietDay` in src/director/conversation.ts (line 911) builds the subject from the weekday, `lastContact` and `workToday`, and never reads the hour, so the same subject plays at 7:00 AM and 8:30 PM. It sets `dayDone` when either person has a shift on the date, before the shift has happened and whichever of the two holds the job, and the three raises that need `dayDone` ("Busy one at work today?", "You were up early.", "Another work day, huh?") are said to the listener as if the day were theirs and over. The bank (data/english/parts/conversation.json, subject `quiet`) holds 13 fixed lines, 5 raises and 8 answers, 12 of them with no insert; the answers are mapped in src/director/data/conversation-rules.json (`replyKinds.quiet`: tired, fine, talk, alone, miss) and none is tied to a record. Nothing keeps what was raised yesterday, so the same raise is picked on following days. After one reply the talk has no second move (words-talk-ends-as-soon-as-it-starts names the same shape for news).

**Fix.**

1. **Use the opening's composer.** `wordConversationMove` (src/english/conversation-words.ts) joins pieces that carry a `piece` field with `composeGroundedLine`. Use that path; never a second one.
2. **The facts, each from its record, in `quietDay`.** The part of the day from the clock the talk is opened at (`morning` before the day's work or school, `evening` after), as a stage, never a fixed hour typed in code: read the shift's own hours through `workToday` and the school day through the reader the Jobs and study screen uses. Whose day it is: `their-shift` with `{employer}` when the listener works today, `my-shift` when the speaker does, `their-school` with `{school}` on a school day, each citing the job or enrollment record. What happened: in the evening, the listener's day from the day's own records (the shift worked, the place visited, the person talked to), one fact, cited. `last-together` stays.
3. **The parts.** Morning raises look ahead ("You're on at {employer} today?", "School today, or is {weekday} a day off?"); evening raises look back ("How was {employer}?"); a raise that needs a fact names it. At least 8 cores for each of morning and evening and 8 for the no-work, no-school day, which names `{weekday}` or `{last-together}`. The answers are composed the same way and say one true thing: where the player is headed or was (`{employer}`, `{school}`, the place on the day's record), never "I'm beat" before the day has started.
4. **Not the same raise two days running.** The subject keeps the key of its last raise per pair (the director's ledger already keeps what a person was told); `rankChoices` puts yesterday's wording last.
5. **A second move.** After the player's answer the other person says one line that answers it from their own day's record, and the player is offered at most two replies; then the close. The reply set passes `expectUpToFourDifferent` (src/director/reply-set-check.ts).
6. **Delete what this replaces, with every reference.** The 13 fixed `quiet` lines and their rows in `replyKinds`; then `npm run words:grade` and `npm run words:rules` twice. Lower the guard's count for `conversation` in tests/guards/english/line-inserts-baseline.json.
7. **Tests.** In src/director/conversation.test.ts, on drawn places: a household talk opened in the morning never names a finished day; one opened in the evening names a place or employer from that day's records; a person with no job and no school is never asked about work or school; the same raise is not picked on two following days; every reply set passes `expectUpToFourDifferent`.

**Time box.** 5 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code: every line is a bank piece joined by the English engine from record facts. Estimate, never UNKNOWN: a fact no record holds is not asked about. No dice: the raise is ranked from the records and what was said yesterday, never drawn by chance. One rule, all 56 places: the tests draw their places and nothing names one. One screen names a thing once, and a person is said the way people say them (lead, Nov 11, skill words-engine). The words split (owner, Nov 10): the builder drafts the parts in its pull request with `Review: words`.

**Done when.** A second session, in the running game on main at 1440x900, starts three new lives in drawn places it writes down with their seeds, and on three following days clicks a member of the household once in the morning and once in the evening. No morning talk speaks of a finished day; each evening talk names a place, an employer or a school from that day's record; nobody without a job is asked about work; no raise repeats on following days; and each talk has a second exchange. It then sets one before-and-after picture for each place under docs/seen/. tests/guards/english passes with the lowered count.

**Waits on.** words-opening-evening-talk-raises-what-the-president-said (the composer it uses).

**Files.** src/director/conversation.ts, src/director/data/conversation-rules.json, src/director/reply-set-check.ts, src/director/conversation.test.ts, src/english/conversation-words.ts, data/english/parts/conversation.json, tests/guards/english/line-inserts-baseline.json

**Notes.** Found by the lead, Nov 11, 09:15 UTC, playing a new life on main plus the 10:00 UTC train's riders with a script that clicks each person at home once a day. The same play found that a talk on the opening evening made the first Day skip a day; that is fixed on its own pull request (a talk before the first morning holds the clock). The first evening's talk about the President's address (words-opening-evening-talk-raises-what-the-president-said) played well in the same life.
