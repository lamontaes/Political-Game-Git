---
id: world-license-held-on-worker
title: "A worker holds a license or not, derived from schooling and job history, for full and counted people alike"
area: world
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after: research-occupational-licensing-shares
source: added with npm run pool -- add
---

**What.** No person record carries an occupational license, so a repeal of a license has nothing to change in a match. Derive a held-license fact for each worker in a licensed occupation from their schooling record and job history, by the same rule for full and counted people, using the licensed shares by occupation and state. The jobs engine can then read the license when it matches a seeker, which world-licensing-reform-jobs needs.

**Rules.** One model, two tiers: the same derivation for a counted worker times their count. No dice: a license follows from schooling, tenure and the occupation's requirement, never a share rolled per person. Replace, never layer: no second license record beside the one built.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, place and seed named), workers in licensed occupations hold a license fact by record id, the share licensed by occupation sits inside the sourced band, and a counted worker filled in keeps the same license, shown by a test.

**Files.** src/core2/modules/jobs.ts,src/core2/opening-profile.ts,src/core2/data/jobs/

**Notes.** TODO
