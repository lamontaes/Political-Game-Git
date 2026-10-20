---
id: world-corporate-office-staff-never-paid
title: "A county business-services office's staff are never paid: the regional office holds no cash and has no parent firm paying it"
area: world
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/corporate-office-staff-paid
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T03:04:27.797Z
---

**What.** A county business-services office's staff are never paid because the regional office holds no cash and no parent firm pays it. Give such an office a paying source from the firm structure the records already hold. Staff then draw wages from a real account.

**Rules.** Wire to the world: the fix moves real dollars from a named payer to the staff, balanced on the journal. Estimate, never UNKNOWN: the office's starting cash is an estimate from its revenue or parent, with its source and spread.

**Done when.** In a one-year run of `buildBenchWorld` in a drawn place, every staff member of such an office is paid on payday from the named payer's account, shown by journal record id, and `src/core2/opening-payroll-calendar.test.ts` or a new test states it.

**Files.** src/core2/opening-finance.ts, src/core2/modules/business.ts

**Notes.** Body filled Oct 19 (claude) from the title and the repo's engine layout; the claimant should sharpen it.
