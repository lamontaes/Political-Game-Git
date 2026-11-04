---
id: tests-known-office-needs-staff
title: "public-knowledge-index.test.ts is red on main: an office with no staff is offered to approach"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On main, src/core2/public-knowledge-index.test.ts fails 'reads observations between provider calls': the known-office offer provider (knownPublicTargets in src/core2/modules/life.ts) offers a known office that has no recorded staff. The look-up that finds an office (office-directory in modules/people.ts) already requires staff, so a person could be sent to approach an office nobody works at.

**Rules.** An effect is a read: an office is approached only where staff can answer. One engine per mechanic: the offer and the look-up read the same rule. The test is not loosened; the provider is fixed.

**Done when.** src/core2/public-knowledge-index.test.ts passes on main with the provider fixed, and the people-lookup, life and drives tests still pass.

**Files.** src/core2/modules/life.ts

**Notes.** TODO
