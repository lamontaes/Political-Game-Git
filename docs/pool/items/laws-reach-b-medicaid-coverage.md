---
id: laws-reach-b-medicaid-coverage
title: "Medicaid expansion changes a person's health coverage and medical costs, read by household spending"
area: laws
kind: stopgap
priority: 3
size: M
status: blocked
claimed-by: claude/pool-medicaid
pr:
blocked-on: duplicate of gov-medicaid-coverage-reader (pool feeder Oct 20); CTO to drop
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:30:18.002Z
---

**What.** SG-GOV-REACH-B-medicaid-coverage. Medicaid expansion and its work requirement are eligibility records on adults and counted shares, but no one's coverage or medical cost changes. Add a coverage record on a person (plan, from, to) and a counted-group coverage share, written when the law makes an adult eligible and they enroll from their income and health, and read by the household spending engine when it prices medical care.

**Rules.** An effect is a read, not a record: another engine must read what the law writes, at the moment it decides or pays. One model, two tiers: counted households get the same rule times their count. Numbers are tagged SOURCED, ESTIMATED or TUNABLE in the parameter table.

**Done when.** In a one-year played world (`buildBenchWorld`, a drawn place from all 56, seed named in the PR body), another engine reads what the law wrote, named by record id, and the listed stopgap rows are resolved in `stopgaps.json` with a test in the file that owns the engine.

**Files.** src/core2/modules/health.ts, src/core2/law-reach/group-b-people.ts, src/core2/data/stopgaps.json

**Notes.** Checked Oct 19 before building: this effect appears in none of docs/roadmap/political-process-baseline.md, the golden path, DECISION-REGISTER.md or OWNER-DECISIONS.md, and AGENTS.md ("This is a game, not a spreadsheet") makes a new mechanic of this kind a question for the owner, not a feature. OWNER QUESTION: should Medicaid expansion change a person's health coverage and medical bills in play, or stay an eligibility record? Until he rules, leave this item unbuilt.

**Original notes.** Split from laws-stopgap-reach-group-b-missing-engine on Oct 19; the stopgap rows named above are its 13.
