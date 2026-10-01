# Existing bank profiles survive selection and reload

The bank replacement must preserve the FDIC row references already saved in a world. The existing checks preserve each row's paired uninsured-deposit share and a saved bank's original books through canonical reload. The approved replacement now has a selection rule, but its required raw asset and certificate evidence is absent. The opening draw remains unchanged; no fixed profile has replaced it.

## What passed

Two focused tests passed. The first checks every state row and every row in the existing national pool after invoking the existing selector. Their uninsured-deposit shares remain paired with the same original state and index. This protects old saves from a selector that sorts the backing arrays in place.

The second creates an Oregon bank organization through the existing employer writer. It supplies explicitly authored legacy books using the first recorded Oregon FDIC row. Canonical Save/Continue preserves those books, the paired uninsured share and transfer history exactly. The fixture's balances are authored inputs, not real bank balances or production opening amounts.

The generated source packet records FDIC-insured banks under $1 billion in assets as of June 30, 2026. Its paired ratios are stored in certificate order. That order is not a median ranking.

## Exact boundary and dependency

Team1 released only the drawBankShape call, helper and required imports in `src/simulation/living-world/town-finances.ts`. No production code was changed for this checkpoint.

The released source blob is `fc4c88b8147210dcba41250e2f0efa86cc4355d6`.

It matches the current source base, main `be468e21793a15b21206b0381a439e993bed7f95`.

The saved shape contains the state, original row index, cushion ratio and other-assets ratio. The existing uninsured-deposit reader uses the same state and index. The CTO-approved rule selects the actual observed median-ASSET bank. An even-sized group uses its lower median; ties use earliest report date, then certificate. Groups smaller than five remain unread. Independent medians for each ratio would create a mixed profile that no recorded bank supplied; this checkpoint does not do that.

The existing compiler, `scripts/research/compile-fdic-town-banks.py`, consumes `fin_20260630.json`, `sec_20260630.json`, and `unins_20260630.json`. These carry certificate, assets, deposits and the balance-sheet components used to calculate the paired ratios. It sorts by certificate and discards asset and certificate values when writing the generated ratio triples. Certificate order is not asset rank.

An exact-filename search of the resumed workspace and temporary evidence directory found none of those three raw extracts. The generated packet cannot recover the approved median asset ranking or identify ties. Audit and the coordinator received the exact required source contract: retained ASSET, CERT and report date paired to the same state's existing row index and ratios. No raw figures or ranking were invented.

A61 remains **NOT READY**. After the budget fixture repair became green, the existing A61 branch resumed and additively received main `81a950745174018598e87923da30469f86f6f0a8` without conflicts. Its merged privacy source and all other finance writers remain intact. The next build requires the raw packet, then implements the approved selection in the released call/helper/import seam and verifies the actual opening writer.

## Method and limits

The earlier storage-guarded native command ran only `src/simulation/living-world/town-bank-median.test.ts`: two passes in 13.35 seconds. That receipt belongs to predecessor source `9473452a957d80936efb0a6281c15cdab4d360d5`; it was not rerun or relabeled as proof of the resumed composition. Original evidence was retained in `/tmp/team6-a61-bank-before.log` and `.json`.

One scoped strict root loaded 737 files with zero owned diagnostics. Scoped ESLint, Prettier and whitespace checks passed. The type receipt is `/tmp/team6-a61-bank-types.log`.

The resumed step executed source, raw-input availability and additive-composition checks only. No runtime test, year run, browser check, full suite, new bank-opening mechanism, natural bank failure, borrower consequence or law-effect stamp execution was performed. This is preservation coverage for a future source replacement, not completed A61 product behavior.
