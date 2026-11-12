---
id: world-housing-landlord-owners
title: "Each town rental names a real owner who files for eviction from their own patience and money"
area: world
kind: stopgap
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: laws-effects
model: opus
effort: medium
root: design-one-model-two-tiers
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** Every town rental is paid to one ownerless business, `organization:landlord:<place>` (housing.ts `withHousing`), and `review` serves notice on the late leases by `landlordPulls`: a summed logistic of months owed and months late, carried month to month. Give each rental a real owner, a resident (or a household) recorded in the business module's `owners` table, and make the notice a choice by that owner from their own traits, cash and the tenant's history, as `credit.ts` does for a business owner (`chooseAct` between waiting and acting, with the reasons recorded). The landlord's payout then goes to its owners, and an owner who is short of cash weighs the arrears differently from one who is not.

**Cause.** Found in code: landlordPulls (src/core2/modules/housing.ts, defined near line 1841 and used at line 1774 in `review`) serves notice from a summed logistic, and rent goes to organization:landlord:<place> (the registered stopgap SG-WORLD-housing-landlord in src/core2/data/stopgaps/world.json).

**Fix.** Give each rental an owner recorded in the business owners table and make the notice a chooseAct decision by that owner, as credit.ts does; route the landlord payout to the owners; register owner assignment as a stopgap with a source if the opening records no landlords.

**Time box.** 8 hours for one session of the Opus model. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Feeds: world-stopgap-housing-faked-mechanic (a landlord with a name who serves the eviction notice, so an eviction scene can name who filed).

**Rules.** No dice: the notice follows the owner's traits, cash and the tenant's record, never a pull that fires at a level (sliding scales and causes). One model, two tiers: a counted tenant's lease is read by the same owner rule as a full tenant's, times its count. Wire to the world: the owner's rent income and any notice move cash by journal record. Placeholders: assigning owners from the residents is itself a stand-in if the opening records no landlords, so register it with a source for the owner share of rentals (ACS B25003 renter-occupied, with the share of rental units held by individual investors) and a spread.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`, a drawn place from all 56, seed named in the PR body) and sees a late lease's eviction notice cite its owner's person record and the reasons recorded for waiting or acting, the landlord payout reach that owner's account by journal record, and SG-WORLD-housing-landlord resolved or replaced by a registered owner-assignment stopgap; `src/core2/housing.test.ts` shows it. The owner plays it: fall behind on rent and read why this landlord, with this record, served notice. On screen: nothing yet; it would show on News, and nothing there reads it.

**Waits on.** Nothing. First check whether world-business-owner-seam already gives rentals an owner.

**Files.** src/core2/modules/housing.ts, src/core2/modules/business.ts, src/core2/data/housing/housing.json, src/core2/data/housing/parameters.json, src/core2/data/stopgaps/world.json, src/core2/housing.test.ts

**Notes.** Oct 19 (claude/landlord-owners, released after reading the code). Spec written, not built: the housing module is over 1,800 lines and the decision touches the business owners table, the payout, the notice, `countedLate` and the parameters `housingNoticeBaseline`, `housingNoticeArrearsWeight` and `housingNoticeLateWeight`, so it deserves a session of its own. Pattern to copy: `credit.ts` review, lines near 451 to 480 (owner id, reasons, `chooseAct`). First check whether `world-business-owner-seam` already gives rentals an owner. Released from idle draft #5196 by the CTO, Oct 26.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-7xkkii` (2026-10-19). Cleared from the front matter and kept here.
