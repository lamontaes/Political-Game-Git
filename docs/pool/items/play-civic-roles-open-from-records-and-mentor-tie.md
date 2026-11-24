---
id: play-civic-roles-open-from-records-and-mentor-tie
title: "Open a life's civic roles from records, and tie a mentor to the office they hold"
area: play
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: design-life-record
source: filed by hand by the cluster 29 builder
---

**What.** Three shortcuts remain from cluster 29 part 3: the opening does not record a person's civic roles (SG-LIVES-civic-roles-not-recorded in opening-roles.ts and parameters.json), the civic inputs are tagged SG-P8-civic-inputs, and a mentor in a scene is anyone who holds office rather than the person's own tie (SG-WORDS-mentor-is-officeholder in src/director/circumstance.ts). Seen: a scene with a mentor names the office they hold from the person's own tie.

**Cause.** Design: docs/design/life-record.md keeps one short list of what a person went through, and a civic role (volunteer, precinct worker, board member) should be a record the opening writes from the person's own household, job and place, and a mentor should be read from a tie record that names the office they hold, not from the office alone. Which roles the opening records, and how a tie names a mentor, is a design call the builder has not made; no engine yet keeps a civic-role record.

**Fix.** Design first: choose the record that holds a civic role, which engine writes it at the opening, and how the mentor scene reads the tie. Then build onto that engine and delete the three stopgaps.

**Time box.** 3 hours for the design note, then a build item.

**Rules.** Replace, never layer: the three stopgaps are deleted in the build. One engine per mechanic: the civic role is a row the life-record engine keeps, not a second tracker.

**Done when.** A design note in this item names the record, its writer, its readers and the three rows to delete; once built, a second session sees it in the running game: it makes a new adult life in a drawn place (place and seed named), and a scene with a mentor names the office they hold from the tie record (id named).

**Notes.** Not built: the lead said part 3 needs design first.

**Waits on.** Nothing; the design note comes first.

**Files.** src/core2/opening-roles.ts, src/director/circumstance.ts, src/core2/data/stopgaps/lives.json (new rows are never added; rows deleted)
