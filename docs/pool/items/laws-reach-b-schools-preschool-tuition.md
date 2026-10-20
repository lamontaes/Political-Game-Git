---
id: laws-reach-b-schools-preschool-tuition
title: "Universal preschool enrolls children and cuts child-care cost; the higher-education line sets tuition households pay"
area: laws
kind: stopgap
priority: 3
size: M
status: blocked
claimed-by: claude/political-game-pool-yucp92-bb
pr:
blocked-on: the people schools engine: enroll(child, school, pre-k) with household child-care cost, and college tuition read by household spending; neither exists
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:32:10.048Z
---

**What.** SG-GOV-REACH-B-preschool-enrollment and -tuition. Universal preschool is an eligibility record on 3- and 4-year-olds with no enrollment, and the higher-education line records support with no tuition charged. Add child enrollment in a school (program pre-k) that lowers the family's child-care cost, and a tuition per institution that 18-to-24-year-old students' households pay and the support line reduces.

**Rules.** An effect is a read, not a record: another engine must read what the law writes, at the moment it decides or pays. One model, two tiers: counted households get the same rule times their count. Numbers are tagged SOURCED, ESTIMATED or TUNABLE in the parameter table.

**Done when.** In a one-year played world (`buildBenchWorld`, a drawn place from all 56, seed named in the PR body), another engine reads what the law wrote, named by record id, and the listed stopgap rows are resolved in `stopgaps.json` with a test in the file that owns the engine.

**Files.** src/core2/opening-private-tuition.ts, src/core2/law-reach/group-b-people.ts, src/core2/data/stopgaps.json

**Notes.** Checked Oct 19 before building: this effect appears in none of docs/roadmap/political-process-baseline.md, the golden path, DECISION-REGISTER.md or OWNER-DECISIONS.md, and AGENTS.md ("This is a game, not a spreadsheet") makes a new mechanic of this kind a question for the owner, not a feature. OWNER QUESTION: should universal preschool enroll children and cut child-care cost, and should the higher-education line set tuition, or do both stay budget-line records? (School board play is kept in the world only until he says otherwise.) Until he rules, leave this item unbuilt.

**Original notes.** Split from laws-stopgap-reach-group-b-missing-engine on Oct 19; the stopgap rows named above are its 13.
