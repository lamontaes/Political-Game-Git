---
id: world-owner-distributions-resolve
title: "Owner payouts: resolve SG-CORE-owner-distributions"
area: world
kind: stopgap
priority: 2
size: S
status: done
claimed-by: claude/owner-distributions
pr: #4624
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
claimed-at: 2026-10-16T05:14:05.236Z
---

**What.** `withWorldEconomy` already filters out the core's `owner-distribution` flows because the business engine decides owner draws, but the stopgap is still marked open. Show the business engine paying owners within their firm's cash buffer and mark the stopgap resolved. Owners of closely held firms then draw from the firm's cash within its buffer.

**Rules.** Wire to the world: the business engine's payout must be read by the owner's household as income. A stopgap is cleared by its replacement, never by relabeling it.

**Done when.** A test and a one-year run of the played world (buildBenchWorld, a drawn place) show an owner's payout from their firm's account to the owner's household by journal record id, none above the cash buffer, and the stopgap row is resolved.

**Files.** src/core2/modules/business.ts, src/core2/modules/world.ts, src/core2/data/stopgaps.json

**Notes.** core.md line 179 (2), checked Oct 15. Related: core-stopgap-opening-outside-market-business-owners.
