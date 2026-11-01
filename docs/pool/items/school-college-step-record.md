---
id: school-college-step-record
title: "High school graduates enroll in and complete college in the school engine, so higher education spending reaches a named graduate"
area: people
kind: feature
priority: 1
size: M
status: in-pr
claimed-by: claude/laws-college-step
pr: #6808
lead: laws
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-29T16:32:40.180Z
---

**What.** Owner ruling Oct 29 13:30 UTC (OWNER-DECISIONS.md): build the missing record as a background simulation from research, never a step the player takes, inside the engine that owns it (no system beside it). The law matrix grades the higher education budget line stopgapped because higher-education-spending-to-college-completion moves only the web's school.college-completion-pct number (SG-SCHOOL-college-completion). Build the step the stopgap names: the school engine gives each graduating senior an enrollment and completion record by the same standing rule it uses for graduation (their own scores and household), calibrated to NCES enrollment of recent completers and six-year completion (fetched and quoted), and a degree on each adult who completes, read back as the measure. Where it decides completion it multiplies the graduate's rate by the web's factor for school.college-completion-pct. Read web-college-completion-stock-not-accumulated first: the link is a yearly flow into the stock of graduates.

**Rules.** Simulate it, don't ask (owner, Oct 24 and Oct 29): background only, no player step. No dice: who enrolls and completes follows their own records. One model, two tiers: counted graduates follow the same rule times their count. Replace, never layer: the measure is read from the degrees, and the web's ledger stops keeping its own copy.

**Done when.** In a drawn place from all 56 (place and seed named) with the state's higher education line raised in one world and not its twin, a named graduate's completion rate is higher by the link's size where the school engine decides it, by record id, and docs/reports/law-wiring-matrix.json grades the higher education line wired. A test in src/core2 proves it on two seeds.

**Files.** src/core2/school-outcomes.ts; src/core2/modules/schools.ts; data/research/outcome-web/links.json

**Notes.** Oct 29 (laws, branch claude/laws-college-step): decideCollege in src/core2/school-outcomes.ts decides enrollment and completion when graduation is decided, by the same standing and no-roll allocation, the NCES shares moved by the world's own factors and the completion rate times webReach for school.college-completion-pct; the record is the school module's college table; schoolingOn (jobs) reads a bachelor's or some college from the day normal time ends. Left, registered: SG-SCHOOL-college-decided-at-graduation (completion decided at graduation, not in the spring normal time ends) and SG-SCHOOL-college-stock-ledger (the adult share is still the web's ledger; see web-college-completion-stock-not-accumulated).
