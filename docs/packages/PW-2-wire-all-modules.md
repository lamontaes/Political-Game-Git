# PW-2: every built module runs in the played world

Seventeen module files are not installed by name in the world the owner plays: ballot measures, constituent cases, interest groups, meetings, the outcome web, the press, recalls, staff, other governments legislating, national races, finance, purchase tax, retirement claims, and four the core may already carry on its own (people, work, life, residents). Some are real engines the owner is waiting for. Some are helpers or scaffolds that should never be installed. Today nothing distinguishes them, and nothing fails when a new one is written and forgotten. This package installs every real one, exempts the rest with a reason, and adds the guard that fails when that stops being true.

## Who builds it, where

- **Read first:** `docs/packages/PW-common.md`, then PW-1.
- **Builder:** one Opus session at **high**: installing a module that was never run against the rest reveals real conflicts (duplicate ids, calendar collisions, state the module assumed and nobody seeded), and each has to be judged, not patched around.
- **Branch:** `pw/wire-all-modules`, from `main`. **Lands second**, after PW-1. Until PW-1 is on `main`, merge `pw/played-world-test` into your branch to run the check. Do not edit its files.
- **Owned paths:** `src/bench/world.ts` (the module list and the `open*` calls only), `src/director/play-modules.ts`, `src/core2/modules/world.ts` (the `WORLD_MODULES` list only), `src/core2/data/played-world-exemptions.json` (new), `tests/golden-path/module-guard.test.ts` (new), `docs/archive/2026-10-23/roadmap/PROGRESS.md`, a release note. You may edit a module's own `open*` function only to make it safe to call in the played world (an idempotency guard, reading a place fact from data instead of assuming it). Any other change to a module is a bug report to its pillar in the PR body.
- **Where:** the module files are under `src/core2/modules`; the install list is in `buildBenchWorld` in `src/bench/world.ts`.

## Build

1. **Classify first, in the PR body, before changing code.** For each file under `src/core2/modules/*.ts` that is not a test: does it export a `CoreModule` (an object with an `id`)? If yes, it is a module. Table: module id, what it does in one line, installed today (yes/no), and your decision: install, or exempt with a reason. Reasons that are allowed: "a library other modules import, not an engine" (`world.ts`, `record.ts` if so); "replaced by <module>, remove in <package>" (registered as a stopgap). A reason that is not allowed: "not ready." If it is not ready, install it and let the PW-1 check show what breaks; that is the information the owner wants.
2. **Install, one module per commit, in this order:** world-legislating, world-races, outcome-web, interest-groups, ballot-measures, recalls, meetings, press, constituent-cases, staff, then the rest you classified as install. For each:
   - Add it where its kind belongs: a module object into the `modules:` list in `buildBenchWorld` (or `peopleModules()` if OPUS-PEOPLE owns it, or `WORLD_MODULES` if OPUS-WORLD owns it), and its `open*(core)` call after `openLawEffects(core)` in the order its own tests use.
   - Run the PW-1 script on one fresh seed. Three outcomes:
     - It runs and the module's own records appear in the year (name the table and a record id in the commit message). Good.
     - It throws. Read the throw. If the cause is in your owned paths (wrong order, a missing `open*`, a place fact the bench did not pass), fix it. If it is inside the module, do the smallest change that makes the module safe to install: an idempotency guard, or reading a fact from data. Write the rest as a bug for the owning pillar in the PR body, with the seed and the stack. Do not leave it uninstalled.
     - It runs but the module records nothing all year. That is the finding. Keep it installed and write it in the PR body: module, what it waited for (a calendar date that never came, an event kind nobody emits, state nobody seeded), and whose job that is. Register a stopgap only if you add a shim; a module that is simply silent is a bug report, not a stopgap.
3. **The guard, `tests/golden-path/module-guard.test.ts`.** Builds the bench world on a seed from `drawPlace`, lists every `CoreModule` exported under `src/core2/modules` (by import, not by regex), and asserts each id is in `core.modules` or in `src/core2/data/played-world-exemptions.json` with a non-empty reason. Also asserts the exemption file names no module that is installed (a stale exemption fails). Add it to `docs/roadmap/features.json` as `PW-02`, milestone `M1`, package `PW-2`. From then on a module written and not installed fails CI.
4. **Check B in PW-1** turns from an expected failure to a pass. Remove its `fails` marker in your branch and say so.
5. **Speed.** Measure the year before and after on the same seed. Each newly installed module costs time; if the year is now over the budget or more than 20% slower, do not uninstall anything. Profile, name the module and the function, and write it to the owning pillar. The owner decided that everything built runs; speed is the pillar's job to recover.

## Acceptance checks

1. The classification table is in the PR body and every module is either installed or exempted with an allowed reason.
2. The guard test is in the golden-path suite and green on the branch.
3. PW-1 check B passes on two fresh seeds.
4. For every installed module, the PR body says either the table and one record id it wrote in the year, or that it was silent and why, with the seed.
5. Year time before and after, same seed, in the PR body.
6. No module's logic changed beyond an idempotency or data-read guard, each one listed.

## How the owner checks it

Open `/play` on a fresh seed, run a year, and open the world panel. Other states and Congress passed laws. There is a presidential race with named nominees. The town has outlets, groups and meetings. The outcome readings (crime, schooling, coverage) show numbers instead of nothing. Where a module is installed but silent, the PR body told him so before he looked.

## Out of scope

Fixing why a module is silent (its pillar). The seven breaks from the report (PW-3 to PW-8). The `/play` screens.
