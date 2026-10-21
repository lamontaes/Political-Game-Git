---
id: people-unplanned-pregnancy-decision
title: "Unplanned pregnancies and the decision, reading the abortion law where she lives"
area: people
kind: feature
priority: 2
status: open
claimed-by:
pr: #5695
blocked-on:
milestone:
source: "found while building laws-record-only-reads"
claimed-at:
---

**What.** Checked against main on Oct 16: OPEN. The renewal engine has no unplanned pregnancy or decision logic, and `SG-GOV-REACH-A-abortion` is still open. This is the owner's call on how it is shown; read the register first. Next: An unplanned pregnancy and the decision the woman makes, reading the law in force and provider distance. The player would see it as a choice among people, never a form.

**Rules.** No dice: no roll decides a pregnancy or a decision; her situation, reasons, distance and the law do; An effect is a read, not a record: the renewal engine reads the restriction law and the nearest provider at the moment she decides; The chain is the acceptance: follow one woman from the pregnancy to the decision, the law and distance read, the outcome and the changed births, health or views; One rule, all 56 places: the law and providers are place data for all 56 places; Estimate, never UNKNOWN: rates start from the real average marked ESTIMATED with spread; they check totals and never pick one woman's outcome; One model, two tiers: counted women follow the same rule as full people times their count; Look before you ask: read DECISION-REGISTER.md and OWNER-DECISIONS.md for how this is told before adding any scene; No hand-written player text: any scene or line is worded by the English engine; This is a game, not a spreadsheet: no new player step; it shows only as people's lives; Placeholders: SG-GOV-REACH-A-abortion closes only when the engine reads the law.

**Done when.** A new src/core2/renewal.test.ts shows, in a drawn place (buildBenchWorld, seed named in the PR body), a named woman's pregnancy, her decision and the law record ids that bound it. The owner plays it: An unplanned pregnancy and the decision the woman makes, reading the law in force and provider distance.

**Files.** src/core2/modules/renewal.ts, src/core2/data/renewal/parameters.json, src/core2/data/laws/reach-group-a.json, src/core2/data/stopgaps.json

**Notes.** SG-GOV-REACH-A-abortion. Split out of laws-record-only-reads on Oct 15; Session A had already checked main and found no record to read.

Oct 20: Owner ruled on #5220 that unplanned pregnancies happen to people in the background from each person's own records and the law where they live, never to the player's own character or household, with nothing new shown to the player, so SG-PEOPLE-unplanned-pregnancy can be marked resolved.

Sent back 2026-10-20 from PR #5220 (branch claude/political-game-pool-pdqjm6): the owner's Oct 20 ruling (never the player's character or household; resolve SG-PEOPLE-unplanned-pregnancy) is not applied yet; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5695 (branch claude/political-game-pool-yucp92-bg): src/core2/renewal.test.ts:35-59 can inspect no unplanned plan and skips the direct law/decision checks inside if (couple); line 88 only asserts new plans inside if (waiting.length), and lines 95-101 accept paidMinor >= 0. The test can therefore pass without proving any named pregnancy, decision or positive payment. Manually filling exposure carry is an edge fixture, not the ordinary producer proof. Assert nonempty applicable plans/couples with bounded draws, preserve the player-household exclusion, and name the woman, full drawn seed and pregnancy/decision/law records required by docs/pool/items/people-unplanned-pregnancy-decision.md:20 in the body. Keep the owner/date-note repair. No local gate pass is claimed.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5695 (branch claude/political-game-pool-yucp92-bg): The ordinary-producer bounded search and nonempty plan/couple guards fix the earlier no-pregnancy path. One outcome assertion is still tautological: src/core2/renewal.test.ts:79-81 compares pregnancy.status with decision.continues ? pregnancy.status : "ended". In the carried case supplied by the latest Fixer, any stored outcome (including an incorrectly ended pregnancy) therefore passes. Assert the actual allowed carried outcomes independently of the value being tested, and retain the ended-outcome assertion. The trip-payment assertions at :82-93 still run only if an ended pregnancy happens to exist; the supplied year explicitly had zero ended pregnancies, so they prove no payment. Add a nonempty ended/positive-cost case (a named regression beside the drawn ordinary-producer case is fine), with a real positive transfer or cash receipt checked, rather than returning successfully before that branch was exercised. Finally copy the full drawn seed, woman, pregnancy/decision/law record IDs into the PR body as the item Done when names; they are currently only in a comment. No standard local gate or merge is claimed for this source review.; finish on that branch, merge main into it first.
