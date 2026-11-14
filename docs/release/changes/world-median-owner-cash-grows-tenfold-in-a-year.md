---
id: world-median-owner-cash-grows-tenfold-in-a-year
impact: patch
section: Fixed
title: Well-paid officials spend like their pay, so owners' cash stops piling up
---

An official who lives outside the town now spends what a household at their pay spends, not a one-person basket. Before, the median owner's cash grew about ten times in the first year; now it grows two to three times.

**Rules.** Estimate, never unknown: the spending curve is marked ESTIMATED with its spread. No dice: the spending follows the official's pay, never a roll. Replace, never layer: the pay curve replaces the fixed basket in the one function that costs an official's household.

**Done when.** A second session, not the builder, runs a one-year played world (buildBenchWorld) at a drawn place and seed and sees the median no-mortgage owner's cash at the end of the year under four times its start, with the official households' `living:official` postings named by record id.

**Waits on.** Nothing.

**Files.** src/core2/official-living.ts; src/core2/data/parameters.json

**Notes.** Found by the stopgap cluster 15 due-date probe.
