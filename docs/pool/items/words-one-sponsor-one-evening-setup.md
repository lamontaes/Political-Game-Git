---
id: words-one-sponsor-one-evening-setup
title: "The one-evening ask test builds its sponsor's two asks instead of waiting for a played year to have them"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/director/one-sponsor-one-evening.test.ts waits for a played year in which one sponsor asks the player about two bills on one evening. Once governing/ask-skips-held-bills sends each bill to its committee the evening before (legislature-ask-skips-bills-the-committee-will-hold), a held bill leaves the agenda before the asks, so the case is rare: on seed fd20a2a4fc1f6997, six places over 150 and 240 days had none, and twelve draws at 240 days ran out of memory. The governing lead covers the staging with a built-world test meanwhile (Words agreed, Nov 2).

**Rules.** Generated-world proof and the played-world rule (played-world-proof): the case is built from the legislature's own ask records in a bench world, never hand-inserted lines; one rule for all 56 places; no dice.

**Done when.** In a drawn place (named with its seed), the test builds a sponsor with two bills that pass committee on one floor day, the director stages one evening scene naming both asks by record id, and the test fails as evidence when the scene splits into two evenings.

**Files.** src/director/one-sponsor-one-evening.test.ts

**Notes.** Filed by Words at handoff (Nov 2, 02:55 UTC) on the governing lead's question.
