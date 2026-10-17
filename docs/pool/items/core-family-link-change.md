---
id: core-family-link-change
title: "A core call adds and ends a partner link between two people, and the births engine reads the couples that result"
area: core
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/family-link-change
pr: #4961
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T18:20:06.699Z
---

**What.** Nothing writes a family link in play: `familyLinks` is filled at the opening and for newborns only (src/core2/state.ts), and the births engine builds its `couples` table once at open (src/core2/modules/renewal.ts, about line 270). Add `api.setPartnersV1({ personIds, together, source })`: it adds a `partner` link between two living adults (or ends it), keeps each person's `familyIds` and a dated past fact, and emits an event the engines can read. Make the births engine read the partner links when it reviews a couple, so a couple formed in play can have a child and one that separated cannot.

**Rules.** No dice. One model, two tiers: a counted pair is a record on its group, not a link. Replace, never layer: the births engine reads links, not a second list of couples. Core change: this area owns it.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, a drawn place from all 56, seed named) a test forms a partner link between two single adults and ends another, shows both people's familyIds and past facts by id, and shows the births engine counting the new couple and dropping the ended one. A test in src/core2 names the place and seed.

**Files.** src/core2/state.ts, src/core2/types.ts, src/core2/modules/renewal.ts

**Notes.** Prerequisite of people-partnership-forms and people-partnership-ends, found Oct 17 when building people-leave-parents-home.
