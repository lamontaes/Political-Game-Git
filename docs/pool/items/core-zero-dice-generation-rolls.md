---
id: core-zero-dice-generation-rolls
title: "The opening's seeded generation draws in src/core2 carry a class and reason in the dice guard, as its list-picks do"
area: core
kind: cleanup
priority: 3
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-core-zero-dice-generation-rolls
pr: #8577
after:
blocked-on:
lead: cto
model: sonnet
effort: low
root: design-guards
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T04:43:05.074Z
---

**What.** Pointing the zero-dice guard at src/core2 in full found seeded draws compared with a threshold in the opening's generation of who exists (citizenship.ts, nativity.ts, deep-past.ts, given-name-cohorts.ts, person-identity.ts, opening-kin.ts, opening-partnership.ts, town-households.ts). Seeded generation of who exists is allowed by the no-dice rule, but the guard records a roll with only an owner, not the class and reason a list-pick carries. Give the guard's roll entries the same class (GENERATION) and a one-line reason, or rewrite a draw that decides what someone does.

**Cause.** Found in code: `scripts/zero-dice-allowlist.json` has 14 entries of kind `roll` with no `class` or `reason` (3 other roll entries and all 31 list-picks carry both). `unclassified` in `scripts/zero-dice-guard.mjs` (line 518) skips every entry whose kind is not `list-pick`, so rolls are never checked for a class.

**Fix.** Make `unclassified` require a class and a one-line reason on every roll entry as it does for list-picks, fill them in for the 14, and rewrite any draw that turns out to decide what someone does. Add the roll check to `scripts/zero-dice-guard.test.ts`.

**Time box.** 3 hours for one Sonnet session.

**Rules.** No dice: a draw may decide who exists, never what someone does. The allowlist only shrinks. Look before you ask: the classes and the reasons for list-picks are in docs/design/list-pick-inventory.md and are reused, not invented again.

**Done when.** A second session runs `npm run zero-dice` and it passes. It reads `scripts/zero-dice-allowlist.json` and finds every roll entry under src/core2 with a class and a reason (or gone). It deletes one roll entry's class in a scratch copy and sees `scripts/zero-dice-guard.test.ts` fail on that entry, as it does for a list-pick. It also names any draw that was rewritten because it decided what a person does, by file, and in a drawn place's played world (name and seed) the game still starts and runs a year.

**Waits on.** Nothing.

**Files.** scripts/zero-dice-guard.mjs, scripts/zero-dice-allowlist.json, scripts/zero-dice-guard.test.ts

**Notes.** TODO
