---
id: people-unplanned-pregnancy-decision
title: "Unplanned pregnancies and the decision, reading the abortion law where she lives"
area: people
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "found while building laws-record-only-reads"
---

**What.** Renewal pregnancies come only from agreed family plans, so the abortion restriction law is recorded on women of reproductive age and on providers but nothing reads it (SG-GOV-REACH-A-abortion). Model an unplanned pregnancy from the woman's own situation (contraception, partner, health, circumstances) and her decision from her reasons, the distance to a provider and the law in force where she lives; the outcome moves births, her health and her views. The owner may want to rule on how this is told, so read the register first. The player would notice that the law where a woman lives changes her options and what happens in her life.

**Rules.** No dice: no roll decides a pregnancy or a decision; her situation, reasons, distance and the law do; An effect is a read, not a record: the renewal engine reads the restriction law and the nearest provider at the moment she decides; The chain is the acceptance: follow one woman from the pregnancy to the decision, the law and distance read, the outcome and the changed births, health or views; One rule, all 56 places: the law and providers are place data for all 56 places; Estimate, never UNKNOWN: rates start from the real average marked ESTIMATED with spread; they check totals and never pick one woman's outcome; One model, two tiers: counted women follow the same rule as full people times their count; Look before you ask: read DECISION-REGISTER.md and OWNER-DECISIONS.md for how this is told before adding any scene; No hand-written player text: any scene or line is worded by the English engine; This is a game, not a spreadsheet: no new player step; it shows only as people's lives; Placeholders: SG-GOV-REACH-A-abortion closes only when the engine reads the law.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): for a named woman the renewal engine reads the restriction law and the provider distance at the decision (pregnancy, decision and law record ids), the outcome reaches births or health, and totals stay within the sourced spread. The stopgap row closes. Tests in `src/core2/renewal-snapshot.test.ts` (and a new `src/core2/renewal.test.ts`). The owner plays it: reads the news and sees how the law in his state shaped a neighbor's choices, told in the engine's words.

**Files.** src/core2/modules/renewal.ts, src/core2/data/renewal/parameters.json, src/core2/data/laws/reach-group-a.json, src/core2/data/stopgaps.json

**Notes.** SG-GOV-REACH-A-abortion. Split out of laws-record-only-reads on Oct 15; Session A had already checked main and found no record to read.
