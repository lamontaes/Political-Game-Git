---
id: people-opening-stance-record-with-reasons
title: "The player's circle keeps each opening stance as a record with the parts it was formed from"
area: people
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after: people-opening-stance-from-loadings
source: added with npm run pool -- add
standard: 2
model: sonnet
effort: low
root: design-life-record
lead: lives
---

**What.** viewOn forms an opening stance from lean, faith and degree but keeps nothing, so nobody can ask why a neighbor opens at a given stance. For the player and the people they deal with (keepsWhy), store one record per person and question the first time it is read, holding the value and the lean, faith and degree parts, in the views module's state. The dependency people-opening-stance-from-loadings is done, and keepsWhy already exists.

**Cause.** Found in code: src/core2/modules/views.ts viewOn (line 726) forms an opening stance and keeps nothing; keepsWhy is imported at line 50 for the player and their circle, and agreementWith (line 769) recomputes the stance each read.

**Fix.** Store one record per person and question the first time it is read (value, lean, faith and degree parts) for keepsWhy people, and have agreementWith return the stored values.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Bookkeeping stays a debug switch: reasons are saved only where keepsWhy says so. Replace, never layer: one formation path. Ask why: the record answers why by id.

**Done when.** A second session plays a buildBenchWorld world in a drawn place (seed named) and sees two neighbors of different faith or schooling hold different stored opening stances with their parts, by record id, and agreementWith for a platform on that question return the stored values; a test in src/core2/views.test.ts covers it.

**Waits on.** Nothing.

**Files.** src/core2/modules/views.ts, src/core2/views.test.ts

**Notes.** Found Oct 20: the work was built beside PR 5495 and set aside because that PR already forms the stance from the CES faith means. The stored record is the part it does not have.
