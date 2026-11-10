---
id: release-m7-05-part-1-real-person-check
title: "M7-05 part 1: every name in shipped data checked against the real-officeholder hashes"
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
model: sonnet
effort: medium
root: none
milestone: M7
source: split from release-m7-05-legal-check in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Confirm no real politicians appear (the owner's Sept 26 ruling). List every person name in the shipped data and check each against the real-officeholder name hashes; fix or remove each match.

**Cause.** Design: docs/roadmap/later-specs-draft.md section M7-05 (approved by the owner Oct 12) and docs/packages/M7-early-access.md.

**Fix.** Write one script that lists every person name in the shipped data tables and checks the hash of each against data/research/offices/real-officeholder-name-hashes.json, and run it. For each match, change the name through the data row and rerun.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Research before building: the list is read from the shipped data, not recalled. Replace, never layer: a matching name is changed in its data row, not hidden in code. One rule, all 56 places: the check covers every place's data the same way.

**Done when.** A second session runs the script on main and reads its list: every name in shipped data checked, zero matches or each match fixed, with the counts in the PR. The second session also opens a drawn place and finds no name from the match list among its officials, by record id.

**Waits on.** Early-access preparation (AGENTS.md: saves and release work wait for it) and the weekly reschedule.

**Files.** data/research/offices/real-officeholder-name-hashes.json, docs/roadmap/later-specs-draft.md, scripts/research
