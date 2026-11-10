---
id: research-schooling-pay-share-within-occupation
title: "Research: the share of the schooling pay gap that holds within one role and employer, sourced"
area: world
kind: research
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: researcher
model: sonnet
effort: medium
root: none
source: stand-in triage T4 (Nov 10, 2026), docs/stopgaps/triage-2026-11-10/world.md
claimed-at:
---

**What.** A hire's pay moves with their schooling by 0.4 times the raw gap between education levels in the BLS weekly earnings table. The 0.4 is an assumption (a tunable); the real within-occupation premium is smaller or larger and differs by occupation.

**Cause.** Found in code: src/core2/modules/jobs.ts lines 3620 and 3621 (stopgap SG-WORLD-jobs-schooling-pay-share) multiply the gap by `jobsSchoolingPayShare` read from src/core2/data/jobs/parameters.json.

**Fix.** Find a published within-occupation, within-employer schooling premium (a wage regression with occupation and employer controls, or the Census or BLS tables that report earnings by education within an occupation), quote it from a fetched page, and record `jobsSchoolingPayShare` as a SOURCED or ESTIMATED value with its citation and spread, per occupation group if the source gives one. Keep the stopgap row open if no source is reachable and say why.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Research calibrates, never decides an outcome by itself. Every number lives in a parameter table with its tag, citation and spread.

**Done when.** A second session (not the builder) reads the parameter and finds a publisher, year, unit, URL and spread quoted from a fetched page, then plays a one-year world (`buildBenchWorld`, place and seed named in the PR body) and sees a hire's pay differ between two schooling levels by the sourced share, by position record id.

**Waits on.** Nothing.

**Files.** src/core2/data/jobs/parameters.json, src/core2/modules/jobs.ts, src/core2/data/stopgaps/world.json
