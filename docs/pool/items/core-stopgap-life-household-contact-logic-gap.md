---
id: core-stopgap-life-household-contact-logic-gap
title: "Stopgaps in life (household-contact-logic-gap): 1 open"
area: core
kind: stopgap
priority: 3
status: claimed
claimed-by: claude/household-contact
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/life.ts, kind household-contact-logic-gap"
claimed-at: 2026-10-19T23:15:10.365Z
---

**What.** Replace or clear the 1 open household-contact-logic-gap stopgap row(s) in src/core2/modules/life.ts: SG-P8-household-shared-time-contact. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/life.ts

**Notes.** First row: Shared residence and need for company do not yet reliably produce household contact before distant acquaintance offers.

Oct 19 (claude, claude/household-contact): measured the symptom in the played world (`buildBenchWorld`, two-level, place key 2454275, seed 77db31d6018f8b27b0ce7481d6846cd5322ad73a1abda485aa3eacfcafe45c01, 365 days, bookkeeping off): 97 multi-person full households (509 household pairs) had 4,869 recorded visit contacts between housemates against 1,535 with everyone else, about 9.6 a pair a year, so the P13 finding of no household contact no longer reproduces. What stays open is the row's replacement clause, which is a check against household time-use and tie-contact evidence (ATUS), not a code change. Released; needs a research session.
