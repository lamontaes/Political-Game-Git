---
id: gov-standins-laws
title: "Law-reach stand-ins (groups A and B) replaced or relabeled as sourced estimates"
area: laws
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The law reach groups A and B still hold about forty open stand-ins (SG-GOV-REACH-A-* and SG-GOV-REACH-B-* in src/core2/data/stopgaps.json), many of them records written on people that no engine reads. Redo them one family at a time against main's current files, as the closed branch stopgaps/gov-world did against an older main. For each, delete the unread record and let the law act through the engine that owns the thing it changes (a price, a payment, zoning, the outcome web), or register why it cannot yet.

**Rules.** Placeholders: a stand-in row closes only by a replacement or by a labeled estimate with its source and spread, never by deleting the row alone. Replace, never layer: the old marker and its wording are deleted in the same change, and the PR body counts them. Look before you ask: read docs/coordination/DECISION-REGISTER.md and OWNER-DECISIONS.md and search docs/ before registering or reopening anything. An effect is a read, not a record: a record written on a person that nobody reads is deleted.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 and a seed the builder did not choose (name both in the PR body), each family handled has its reach rows read by a named engine at the moment it decides, shown by record id, its stopgap rows resolved with a one-line resolution, and src/core2/law-reach-group-a.test.ts, law-reach-group-b.test.ts, law-reach-balance.test.ts and the tripwire tests pass.

**Files.** src/core2/law-reach/group-a.ts, src/core2/law-reach/group-b.ts, src/core2/data/laws/reach-group-a.json, src/core2/data/laws/reach-group-b.json, src/core2/data/stopgaps.json

**Notes.** Replaces the law-reach share of PR #4146 (30 rows there). The justice rows (police oversight, juvenile age, stand your ground, facial recognition, carry permit) are the pool items gov-justice-incident-producer and its five sequels, not this one. See also the measurement in laws-outcome-map.
