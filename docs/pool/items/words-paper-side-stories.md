---
id: words-paper-side-stories
title: "The town paper prints side stories: one-line briefs from the town's records (police log, school results, honors, new businesses)"
area: play
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The owner asked on Oct 29 for side stories on the newspaper for realism: a fourth car stolen when crime is up, someone opening a business, a local child winning a spelling bee, Division I recruits on the high school team. They are a line or two and not clickable. The CTO ruled (OWNER-DECISIONS Oct 29 17:40) that the one press desk prints them from records it already sees, chosen by cause, never padded. Wording exists (#6800, brief: true); the school honors record is on words/school-honors; the wire lacks the police log and the school results, and the desk has no briefs column.

**Rules.** Wire to the world: every brief reads a record the world keeps (a crime.victimized event, a school measures row, a school.honor event, an organization.founded event), never a typed item. No dice: the desk picks briefs by its own score (proximity, reader care, people involved) up to the outlet's space, and prints none when the town recorded none. One engine: the same desk and printItem, no second press.

**Done when.** In a played year (buildBenchWorld) of three drawn places named with their seeds, the town's local paper prints briefs every month that its records hold one: the police log, graduation and test results, a school honor, a new business, each with brief true from wordPrintedStory and its source record id; a test fails when a brief kind is on the wire and the desk had space but printed none.

**Files.** src/core2/modules/press.ts,src/core2/press-desk.ts,src/core2/data/press/parameters.json,src/core2/school-honors.ts,src/core2/modules/school.ts,src/bench/printed-words.ts,src/bench/printed-words.test.ts

**Notes.** lead: words. Owner, Oct 29, to the words session. Ruling: OWNER-DECISIONS Oct 29 17:40 UTC.
