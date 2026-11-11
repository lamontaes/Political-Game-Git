---
id: law-levels-death-tax-zero-restoration
title: "Estate and inheritance tax bills must restore their operative schedules after zero"
area: laws
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
branch: astra/death-tax-restoration
---

**What.** The death-tax branch of shapedRate scales schedule rates to zero and cannot recover them when a later bill raises the top rate. The death-tax reader also selects rows by date and lexical id instead of the shared law-in-force ordering. Preserve the real schedule basis through zero and use the one resolver so same-day enacted acts govern in order. Seen: the bill card's estate or inheritance tax rate when a later bill raises a rate an earlier bill took to zero.

**Rules.** Use existing law/bill/estate assessment engines; no invented replacement rates or exemptions. Keep jurisdiction scopes and government-heir exemptions unchanged. Test actual assessment after signed bills, and distinguish this from proving all territory estate-tax scope or played votes. Wire to the world: the restored schedule is read by the real estate-tax assessment, not by a copy of it. Look before you ask: the earlier tax-migration item is about residence outcomes and is not reopened here.

**Done when.** In a randomly drawn generated world, signed bills set an applicable estate or inheritance tax to zero and restore it, including multiple acts on the same date. The production assessment returns its exact original amount and source law; other jurisdictions and exemptions stay unchanged. Old writer/reader fail, ten fresh draws and a new game pass, with place and replay in the PR. The proof is a test in a played world that names the signed bills by record id.

**Files.** src/core2/modules/legislature.ts,src/core2/laws-death-taxes.ts,src/core2/death-tax-zero-restoration.test.ts

**Notes.** Astra Nov 8 inspection: legislature.ts shapedRate death-tax branch uses k=provision.value/current.value, then k=1 at current zero, leaving minRate/maxRate zero. laws-death-taxes.ts rowInForce sorts effectiveDate then id and can disagree with lawRowIsLater for same-day bills. Existing laws-outcome-links-tax-migration is about residence outcomes, not this reversal. No implementation.

Released by next (2026-11-10): no push to astra/death-tax-restoration since 2026-11-08 02:24 UTC, more than twice its 4-hour time box. Continue on branch astra/death-tax-restoration.
