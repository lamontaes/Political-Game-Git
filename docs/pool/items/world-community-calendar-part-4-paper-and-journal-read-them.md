---
id: world-community-calendar-part-4-paper-and-journal-read-them
title: "The paper reports community events, and a candidate can campaign at one"
area: world
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: world-community-calendar-part-2-event-records-on-scheduler
blocked-on:
lead: lives
model: sonnet
effort: medium
root: design-life-record
source: split from world-community-calendar in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** With dated community-event records in the town, two things read them. The paper reports the event: the town's own festival by name, the parade, the fair, homecoming. And on a day an event is held, a campaign can go to it: the campaign day's event choice offers the community event as its venue, for the player and for a rival alike. Nothing here decides who attended, person by person. Feeds: world-community-calendar

**Cause.** Design: docs/design/life-record.md and the owner's Nov 1, 2026 question recorded in the parent item; the news side is src/core2/modules/news.ts and the journal banks are data/english/parts/journal.json and news.json.

**Fix.** Add the news producer that reads a community-event record and cites its record id (src/core2/modules/news.ts, beside the producers it already has); leave the wording to the English engine's banks. In `campaignDayChoices` (src/core2/campaign-day.ts, line 629), on a day a community event is held in the place, the existing event choice offers that event as its venue, read from the event record; add no new campaign act and no second events path. The reach of a speech at the event comes from the size the event record carries, through the event act's existing reach rule.

**Time box.** 3 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the paper or journal reads the event and attendance records at the moment it writes. No hand-written player text: the words come from the English engine's banks. Speed: the played year stays within 20 percent of base. Ask why: each line cites the event and attendance record ids.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`) in three drawn places (names and seeds in the PR body) and sees the paper report at least two community events in each place, by record id. In the running game, on a day a community event is held, the player's campaign day offers it as a place to hold an event, and holding it there reaches people as the event act's own record shows. The played year stays within 20 percent of base on `npm run speed:year`.

**Waits on.** world-community-calendar-part-2-event-records-on-scheduler. The lines in data/english/parts/ are the words writer's to write: list on the pull request the pieces the story needs (the kind of event, its name, its date) and build against the keys that come back.

**Files.** src/core2/modules/news.ts, src/core2/campaign-day.ts (`campaignDayChoices`, line 629), src/director/

**Notes (Fable B, Nov 10, the owner's answer).** Owner, Nov 10, 2026, about 7:16 p.m.: "I've ruled on these community events. I've talked about ham days once, you know, just doing some basic research. But there can also be some general events as well." The size he picked is the small one: each town's own real festivals from one research pass, a few general events a year, the paper reports them and a candidate can campaign at one. A system that decides who attends, person by person, is not part of it.
