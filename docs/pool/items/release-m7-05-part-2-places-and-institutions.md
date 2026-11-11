---
id: release-m7-05-part-2-places-and-institutions
title: "M7-05 part 2: each real school and institution in the data listed with a decision"
area: release
kind: research
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: cto
model: opus
effort: medium
root: none
milestone: M7
source: split from release-m7-05-legal-check in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** List each real school, bank, business and institution that appears by name in the shipped data, and give each a decision (keep, rename or remove) for the owner. Real places themselves are the game's setting and stay; this part covers named organizations. Seen: the names of real schools and businesses on the map and in scenes, which the owner keeps, renames or removes before launch.

**Cause.** Design: docs/roadmap/later-specs-draft.md section M7-05 (approved by the owner Oct 12) and docs/packages/M7-early-access.md.

**Fix.** Search the shipped data for named schools, banks, businesses and institutions, list them with their data file and row, and propose a decision for each. Flag the list under OWNER DECISIONS NEEDED rather than waiting on it.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Research before building: the list is read from the shipped data. Owner decisions are flagged, never waited on: build the proposal and ask in the PR body. Look before you ask: read OWNER-DECISIONS.md and the Sept 26 ruling first.

**Done when.** A second session opens a drawn place in the running game, reads the organization names it shows, and finds each one on the list with a decision, by data row. The list covers every place's data the same way.

**Waits on.** Early-access preparation (AGENTS.md: saves and release work wait for it) and the weekly reschedule.

**Files.** docs/roadmap/later-specs-draft.md, docs/packages/M7-early-access.md, docs/coordination/OWNER-DECISIONS.md
