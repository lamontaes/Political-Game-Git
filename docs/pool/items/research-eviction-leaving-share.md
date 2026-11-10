---
id: research-eviction-leaving-share
title: "Research: the share of evicted households that leave their county, to calibrate the push an eviction gives a move"
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

**What.** An eviction's push toward leaving town is a single tunable (`movesEvictedPull`, 0.35) not checked against how many evicted households really leave their county.

**Cause.** Found in code: src/core2/modules/counted-moves.ts lines 480 and 732 (stopgap SG-WORLD-counted-evicted-push-rate) apply the push; src/core2/data/moves/parameters.json holds `movesEvictedPull`.

**Fix.** Find the share of evicted households that move out of their county (Desmond and Shollenberger 2015 report the distance of moves after eviction; look for a share that leaves the county), quote it from a fetched page, and record it as the check the push is calibrated against with its citation and spread; report the share a played year gives so the builder of the next step can tune the push to it.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Research calibrates, never decides: the share checks totals and never picks one household's outcome. Every number lives in a parameter table with its tag, citation and spread.

**Done when.** A second session (not the builder) reads the recorded share with its publisher, year, unit, URL and spread, plays a one-year world (`buildBenchWorld`, place and seed named in the PR body) and sees the share of evicted households that leave town beside the sourced one.

**Waits on.** Nothing.

**Files.** src/core2/data/moves/parameters.json, src/core2/modules/counted-moves.ts, src/core2/data/stopgaps/world.json
