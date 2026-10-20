---
id: core-stopgap-estates-estate
title: "Stopgaps in estates (estate): 1 open"
area: core
kind: stopgap
priority: 3
status: claimed
claimed-by: claude/estates-stopgap
pr: #5275
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/estates.ts, kind estate"
claimed-at: 2026-10-20T05:44:27.041Z
---

**What.** Replace or clear the 1 open estate stopgap row(s) in src/core2/estates.ts: SG-CORE-estate-cash-only. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/estates.ts

**Notes.** First row: A full person's estate is only their cash and the standing payments they owed: homes, loans, businesses and accounts other than their main one are not settled. A relative who is still only a counted record does not inherit.
Sent back from PR #5275: estates-counted-kin.test.ts fails on random seeds when decedent has living spouse because spouse precedes children in intestateOrder.
