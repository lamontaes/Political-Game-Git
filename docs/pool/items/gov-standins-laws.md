---
id: gov-standins-laws
title: "Law-reach stand-ins (groups A and B) replaced or relabeled as sourced estimates"
area: laws
kind: stopgap
priority: 2
size: M
status: claimed
claimed-by: claude/standins-laws
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T21:52:10.527Z
---

**What.** Checked against main on Oct 19: every open SG-GOV-REACH-A-* and SG-GOV-REACH-B-* stopgap in `src/core2/data/stopgaps.json` is already named in a live pool item (the laws-outcome-* items, the gov-justice-* items and the world items), so this shell would only repeat them. No stopgap was left without an owner. The CTO may drop it as covered (only the CTO drops items).

**Rules.** Look before you register: a duplicate item for a ruling or a stopgap that already has an owner is a defect (AGENTS.md "Placeholders"); the pool is the only backlog, one item per piece of work.

**Done when.** Ready to drop: a script over `src/core2/data/stopgaps.json` and `docs/pool/items/*.md` finds no open SG-GOV-REACH stopgap missing from a live item, shown by that check in the PR body.

**Files.** docs/pool/items/gov-standins-laws.md

**Notes.** If a new SG-GOV-REACH stopgap is registered without a pool item, add one for it then.
