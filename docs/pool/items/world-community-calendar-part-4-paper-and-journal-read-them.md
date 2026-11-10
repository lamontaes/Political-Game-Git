---
id: world-community-calendar-part-4-paper-and-journal-read-them
title: "The paper and the journal tell who went and what happened at community events"
area: world
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: world-community-calendar-part-3-attendance-by-recorded-causes
blocked-on:
lead: lives
model: sonnet
effort: medium
root: design-life-record
source: split from world-community-calendar in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** With events and attendance recorded, the town's paper and a person's journal must read them or the events are placeholders. The press module quotes an event and who attended from the records, and the journal tells a person's own attendance. The words themselves are written by the Words line (words-paper-and-journal-everyday-life); this part makes the engine records readable by the news and journal producers.

**Cause.** Design: docs/design/life-record.md and the owner's Nov 1, 2026 question recorded in the parent item; the news side is src/core2/modules/news.ts and the journal banks are data/english/parts/journal.json and news.json.

**Fix.** Add the news and journal producers that read a community-event record and its attendance records, and cite the record ids; leave the wording to the English engine's banks.

**Time box.** 4 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the paper or journal reads the event and attendance records at the moment it writes. No hand-written player text: the words come from the English engine's banks. Speed: the played year stays within 20 percent of base. Ask why: each line cites the event and attendance record ids.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`) in three drawn places (names and seeds in the PR body) and sees the paper or journal quote at least two community events in each place, by record id, with who attended read from attendance records; the played year stays within 20 percent of base on `npm run speed:year`.

**Waits on.** world-community-calendar-part-3-attendance-by-recorded-causes. The lines in data/english/parts/ are Story's to write: send the Words line the list of pieces the producers need (kind of event, who attended, an outcome) and build against keys it gives back.

**Files.** src/core2/modules/news.ts, src/director/, data/english/parts/news.json, data/english/parts/journal.json
