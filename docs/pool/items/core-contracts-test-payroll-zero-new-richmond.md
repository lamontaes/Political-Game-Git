---
id: core-contracts-test-payroll-zero-new-richmond
title: "Public contracts test: a school contract in New Richmond, West Virginia pays no payroll"
area: core
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/contracts-new-richmond
pr: #6217
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T04:52:17.629Z
---

**What.** src/core2/contracts.test.ts fails in New Richmond, West Virginia (place 5458756, world seed 316714e6a857a0fbf59cec54893baa1a7a979e67ea5fbc4009f891993e48c36b): contract:US-WV:schools:2025-02-01 payroll expected 0 to be greater than 0. It fails identically on clean main.

**Rules.** estimate-not-unknown; wire-to-the-world

**Done when.** Pin the place and seed above in a copy of contracts.test.ts: the contract's winner has a business with payroll above 0 after a year, or the test screens out places where the winner has no staff before the run, by a stated input (drawn place, buildBenchWorld). Time box: 3 hours.

**Files.** src/core2/contracts.test.ts, src/core2/modules/contracts.ts

**Notes.** TODO
