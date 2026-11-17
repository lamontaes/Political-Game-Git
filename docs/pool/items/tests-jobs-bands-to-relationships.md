---
id: tests-jobs-bands-to-relationships
title: "The jobs-and-economy checks fail a world or a data file for leaving a published band instead of checking how strongly one thing moves another"
area: core
kind: bug
priority: 2
size: S
status: claimed
standard: 2
claimed-by: claude/happy-bell-8rj52e-pins-32-checks
pr:
after:
blocked-on:
root: none
lead: play-first
model: opus
effort: medium
source: Pins lane, Nov 17 (the CTO's calibration audit, family 32, on issue 9747; handed from Long game's 03:48Z list)
---

**What.** `commuting-shares.test.ts` failed the LODES table when the national share of working residents who work in their own place left 0.2 to 0.5 ("ACS puts it near a third"). A band on a level, not a relationship.

**Cause.** Found in code: src/core2/commuting-shares.test.ts (line 60) compares a national share with a fixed band.

**Fix.** The band goes. The check reads the relationship the files carry: across every sourced place, the share of working residents who work at home rises with the jobs the place holds per working resident (Spearman rank correlation, ties at their mean rank, above zero; 0.64 over 29,941 places). A table whose shares were one copied figure has no order and fails. The rest of Long game's jobs-and-economy list stays open here; each converts in its own commit.

**Time box.** 1 hour for this check.

**Rules.** Calibration only: real data sets the strength of a relationship, never a count (owner, Nov 17, "Everything comes from the simulation"); sense checks stay.

**Done when.** A second session runs `src/core2/commuting-shares.test.ts` and reads the correlation line; replacing each place's share with the national average makes it fail.

**Waits on.** Nothing.

**Files.** src/core2/commuting-shares.test.ts
