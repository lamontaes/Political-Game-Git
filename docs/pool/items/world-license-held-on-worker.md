---
id: world-license-held-on-worker
title: "A worker holds a license or not, derived from schooling and job history, for full and counted people alike"
area: world
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after: research-occupational-licensing-table
lead: jobs
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** No person record carries an occupational license, so a repeal of a license has nothing to change in a match. Derive a held-license fact for each worker in a licensed occupation from their schooling record and job history, by the same rule for full and counted people, using the licensed shares by occupation and state. The jobs engine can then read the license when it matches a seeker, which world-licensing-reform-jobs needs.

**Cause.** Design: docs/pool/items/world-licensing-reform-jobs.md (Notes, Oct 21) fixes the order: a sourced licensing table, then a license held on each worker, then the match reading the law. `runWeek` in src/core2/modules/jobs.ts matches seekers with no license field, so a repeal changes nothing.

**Fix.** Derive a held-license fact per worker in a licensed occupation from schooling and job history, the same rule for full and counted people, using the licensed shares table from research-occupational-licensing-table; keep it on the worker so a filled-in counted worker keeps the same license.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Feeds: world-licensing-reform-jobs (the repeal has nobody to reach until a worker holds a license or not).

**Rules.** One model, two tiers: the same derivation for a counted worker times their count. No dice: a license follows from schooling, tenure and the occupation's requirement, never a share rolled per person. Replace, never layer: no second license record beside the one built.

**Done when.** A second session, on main in a drawn place from all 56 (place and seed named), runs a year in dev mode and finds workers in licensed occupations holding a license fact by record id, the licensed share by occupation printed beside the sourced share as a report, and a counted worker who is filled in keeping the same license. A test shows the fill-in keeps it.

**Waits on.** research-occupational-licensing-table.

**Files.** src/core2/modules/jobs.ts, src/core2/opening-profile.ts, src/core2/data/jobs/

**Notes.** TODO
