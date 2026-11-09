---
id: elections-petition-check-miscount
title: "The clerk's petition check counts one or two fewer signatures than were signed"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: CTO, from the failure on PR 8080, Nov 9, 2026
claimed-at:
---

**What.** `src/core2/petition-filing.test.ts` ("the clerk puts a filing on the ballot by its signatures") fails at some drawn places because a checked petition's valid count plus its struck names comes out one or two below its signature rows. Seen Nov 9, 2026: Mount Carbon, West Virginia, run seed b013e990be582152 (123 against 124), and Alma, Illinois, run seed ef2460c2d6b1632b (130 against 132). Find which signatures the clerk's check skips and why, then fix the check, not the test. Every signature must end up counted or struck.

**Rules.** No dice; one rule, all places; the test stays as strict as it is.

**Done when.** Both places and seeds above pass, and a different session names the signature row ids the check used to skip and shows each now counted or struck.

**Files.** src/core2/modules/elections.ts, src/core2/petition-filing.test.ts

**Notes.** Not caused by PR 8080, which removes rows only after the check. Because the test draws a random place, it fails only sometimes, and only PRs that touch this file run it.
