---
id: people-coverage-record-monthly-pass
title: "Each person and counted group holds a health coverage record, and a monthly premium flow reads it"
area: people
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/fs11vb-coverage-record
pr: #5460
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:05:53.579Z
---

**What.** Core2 holds no health coverage: no record says whether a person is covered by an employer plan, Medicaid or nothing. Add a coverage record per full person and per counted group (plan, from, to) written from the person's job and the law in force, and a monthly premium flow for each household that reads it, so an employer-covered worker pays a premium share and an uncovered one pays none. Start every record from the real average coverage rate by age and state, marked as an estimate with its source and spread, and let a job change or a law change end and open records.

**Rules.** An effect is a read, not a record: the household premium flow must read the coverage record when it pays, or the record is a placeholder. One model, two tiers: a counted group is covered and pays by the same rule as a full person times its weight. No dice: coverage follows age, income, employment, the law in force and the state, never a roll.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (name place and seed), every living full person holds a coverage record, a named employed adult's household pays a monthly premium by journal record id that an uncovered neighbor's household does not, the cash journal balances, and src/core2/health-coverage.test.ts proves it. Counted groups are the follow-up item people-coverage-counted (stopgap SG-PEOPLE-coverage-counted), narrowed out of this one on Oct 20.

**Files.** src/core2/modules/health.ts, src/core2/health-coverage.ts, src/core2/data/health/coverage.json

**Notes.** Part 1 of 3 split from missing-engine-health-coverage-and-medical-spending (Oct 20). Parts 2 and 3: world-medical-spending-categories and gov-medicaid-coverage-reader.
