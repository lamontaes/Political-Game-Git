---
id: core-zero-dice-generation-rolls
title: "The opening's seeded generation draws in src/core2 carry a class and reason in the dice guard, as its list-picks do"
area: core
kind: cleanup
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Pointing the zero-dice guard at src/core2 in full found 15 seeded draws compared with a threshold in the opening's generation of who exists (citizenship.ts, nativity.ts, deep-past.ts, given-name-cohorts.ts, person-identity.ts, opening-kin.ts, opening-partnership.ts, town-households.ts). Seeded generation of who exists is allowed by the no-dice rule, but the guard records a roll with only an owner, not the class and reason a list-pick carries. Give the guard's roll entries the same class (GENERATION) and one-line reason, or rewrite a draw that decides what someone does.

**Rules.** No dice: a draw may decide who exists, never what someone does. The allowlist only shrinks.

**Done when.** Every roll entry in scripts/zero-dice-allowlist.json under src/core2 names a class and reason (or is gone), npm run zero-dice passes, and scripts/zero-dice-guard.test.ts checks the class on rolls as it does on list-picks.

**Files.** scripts/zero-dice-guard.mjs, scripts/zero-dice-allowlist.json, scripts/zero-dice-guard.test.ts

**Notes.** TODO
