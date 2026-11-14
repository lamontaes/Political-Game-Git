---
id: core2-office-approached-two-meanings
title: "The record kind office.approached means two different acts, and one of them binds to no scene type"
area: core2
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
source: filed by hand by the meetings and floor builder, Nov 14 2026
checked: meetings and floor builder 2026-11-14
---

**What.** The record kind office.approached means two different acts, and one of them binds to no scene type

**Cause.** Found in code: src/core2/modules/constituent-cases.ts (bringCase) emits office.approached when a resident brings a case to an official; src/core2/modules/life.ts (civicEvent) emits the same kind when the official approaches an organization. Measured (uncontrolled probe, three places): 10, 1 and 8 life.ts records whose moments are labeled cause:event:office.approached, schedule journal-line, bindings empty.

**Fix.** Give the life.ts act its own kind name (a data row in the kind list) and read it where the office-hours situation type reads the resident's case, so each kind binds to the type that fits it.

**Time box.** One session, half a day.

**Rules.** One engine per mechanic; no new stopgaps; no figures or counts in any scene line; plain American English. Names the place and seed.

**Done when.** A second session runs a seated member at three drawn places for 150 days and sees office-hours scenes only for residents' cases, and the member's own approach recorded under its own kind, each by record id.

**Waits on.** Nothing.

**Files.** src/core2/modules/constituent-cases.ts, src/core2/modules/life.ts, src/director/data/situation-types.json

**Notes.** From report 1 of the meetings and floor thread.
