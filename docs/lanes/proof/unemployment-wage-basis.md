# Unemployment wage-basis proof

Built unit: laws-unemployment-share-basis-mt-co. No whole Lane 2 path is marked Built or Verified by this evidence. Independent replay on main remains required.

## Source and correction

The [U.S. Department of Labor July 2026 table](https://oui.doleta.gov/unemploy/content/sigpros/2020-2029/July2026.pdf), pages 1 and 3, gives Colorado 60% of 1/26 of two consecutive high quarters and Montana 1% of base-period wages (with an alternative formula retained in the quoted text). Colorado's fraction was half that formula; Montana paired its annual fraction with only two quarters. Correct the research rows and their compiled starting-law rows. Running the existing compiler's benefits() function reproduces both complete corrected shipped rows. No benefit-engine rule changes.

The unchanged reader uses 365/7 weeks per year, so its corrected replacement shares are 0.601648 for Colorado and 0.521429 for Montana. The existing monthly/quarterly wage model and statutory caps remain as before.

## Regression

New unemployment-share.test.ts reads the live laws engine in one drawn locality in each of the 56 jurisdictions, replay c62f44a716f82f64. All programs' shares must be 0.4–0.7; no-program rows must read zero. With original data it fails precisely Colorado and Montana; corrected data plus unchanged unemployment-basis.test.ts pass all three tests. No assertions or budgets relaxed. These are reader fixtures, not played-world proof.

## A naturally laid-off worker is paid

Played through January 20, 2026, with all buildBenchWorld modules and normal daily advanceCore, two-level population, bookkeeping off. Replay c62f44a716f82f64; drawPlace(`${replay}:${draw}`, "unemployment-basis"), first affected-state draw 13: Severance, Colorado (0869150), world seed 2f914ebe2fd87d0457ecc99849b0330f462a6e85634d13cc7732eacea462751a. Observer retention preserved receipts; this run is not a speed measurement.

The observation records jobs before each day. After the first uncapped claim filed that day, it opens the claimant through personOrFillIn, the normal person-card reader, then follows payments. It never enacts a law, creates a layoff, files a claim or inserts money. No rate or roll selects this person's outcome. The opening job assignment is generated; the recorded loss reason is demand-below-staff.

- Danielle Stone, person_c7f696ab63d01e72, warehouse worker for organization_19a87ad582e16f88.
- Lost job work-relationship_168610fa63246d3a, March 1, 2025; recorded wage 11882 cents/day, 83174 cents/week.
- Claim claim:person_c7f696ab63d01e72:2025-03-01: 50042 cents/week, 60.1654% of lost pay, below the statutory cap.
- Law read: law:US-CO:state:unemployment-insurance:general:2026-01-01:from-start. This is the game's explicitly estimated starting-law phase, not a law newly voted during this run.
- First payment unemployment-benefit:person_c7f696ab63d01e72:2025-03-17:unemployment-insurance; journal receipt journal:2025-03-17:29226.
- Treasury cash: cash:organization:treasury:US-CO:residual, 56096266913 → 56096216871 cents. Personal cash: cash:person_c7f696ab63d01e72:residual, 0 → 50042 cents. Equal debit and credit; no outside advance in this receipt.
- Twenty-six payments of 50042 cents each, 1301092 cents total. Each personal balance delta and each balanced posting were checked against the claim. The year ends with 99 naturally filed claims, six observed named claimants and 785 benefit payments across the world.

The original-data observation finished the same year with a 0.300812 Colorado reader, 55 claims and 394 payments. It did not open Danielle's person card, so these aggregate totals are not a controlled same-person causal comparison. The corrected payment's amount is established directly from her recorded lost wage and the law's formula.

Local raw evidence: /tmp/lane-2-ui-{before,after}.json and .log; /tmp/lane-2-ui-summary.json. Reproduction observer: /tmp/lane-2-ui-after-audit.ts. Source correction: 285b7e165f. Browser/New Game and same-machine timing follow below.
