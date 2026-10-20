---
id: people-unplanned-pregnancy-decision
title: "Unplanned pregnancies and the decision, reading the abortion law where she lives"
area: people
kind: feature
priority: 2
status: in-pr
claimed-by: claude/political-game-pool-pdqjm6
pr: #5220
blocked-on:
milestone:
source: "found while building laws-record-only-reads"
claimed-at: 2026-10-19T21:54:56.245Z
---

**What.** Checked against main on Oct 16: OPEN. The renewal engine has no unplanned pregnancy or decision logic, and `SG-GOV-REACH-A-abortion` is still open. This is the owner's call on how it is shown; read the register first. Next: An unplanned pregnancy and the decision the woman makes, reading the law in force and provider distance. The player would see it as a choice among people, never a form.

**Rules.** No dice: no roll decides a pregnancy or a decision; her situation, reasons, distance and the law do; An effect is a read, not a record: the renewal engine reads the restriction law and the nearest provider at the moment she decides; The chain is the acceptance: follow one woman from the pregnancy to the decision, the law and distance read, the outcome and the changed births, health or views; One rule, all 56 places: the law and providers are place data for all 56 places; Estimate, never UNKNOWN: rates start from the real average marked ESTIMATED with spread; they check totals and never pick one woman's outcome; One model, two tiers: counted women follow the same rule as full people times their count; Look before you ask: read DECISION-REGISTER.md and OWNER-DECISIONS.md for how this is told before adding any scene; No hand-written player text: any scene or line is worded by the English engine; This is a game, not a spreadsheet: no new player step; it shows only as people's lives; Placeholders: SG-GOV-REACH-A-abortion closes only when the engine reads the law.

**Done when.** A new src/core2/renewal.test.ts shows, in a drawn place (buildBenchWorld, seed named in the PR body), a named woman's pregnancy, her decision and the law record ids that bound it. The owner plays it: An unplanned pregnancy and the decision the woman makes, reading the law in force and provider distance.

**Files.** src/core2/modules/renewal.ts, src/core2/data/renewal/parameters.json, src/core2/data/laws/reach-group-a.json, src/core2/data/stopgaps.json

**Notes.** SG-GOV-REACH-A-abortion. Split out of laws-record-only-reads on Oct 15; Session A had already checked main and found no record to read.
