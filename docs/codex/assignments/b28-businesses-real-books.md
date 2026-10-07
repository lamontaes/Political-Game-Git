# Businesses keep real books from real sales; employers pay from cash; businesses change hands (bank id b28, Session 52)

Phase "Living world" · Unlocks believable layoffs, closings, buyouts and takings, and a first paycheck that always arrives. Simulated only, no UI. Code checked at origin/main 2e7ac6cef (Oct 6).

## What the player experiences

Nothing new on a screen. A town's shops and plants earn what their customers actually spend, pay wages out of the cash they actually hold, hire when the books allow and lay people off when they do not. Over years a bakery is sold to its manager, a plant is bought by a fund that cuts staff, a block is taken by the city for a road and the land goes to a new owner. People notice through their own jobs, rent and news, never through a menu. A new game's employers always have enough recorded cash to pay the first paycheck; the player is never stranded by a book entry.

## Owner decisions it rests on

- Register Sept 28-29 item 6: "Research, then a design for his approval: businesses changing hands, private equity, eminent domain, land transfer." (CTO rules research approval for the design; the owner approves the final design.)
- Register: "Everything else can start from an average with spread"; nothing blank; real data calibrates the start only; emergent, not authored.
- Owner Sept 26: books balanced by construction. Owner (Oct 5): simulated only here, no UI.
- Zero dice; one rule for all places; one writer per record kind; delete what you replace.

## Existing code to extend (verified)

- Books: `src/simulation/living-world/town-business-books.ts:67 TOWN_BUSINESS_KIND_BOOKS` (IRS SOI margins and pay shares by kind), `:110 townBusinessHasRoomToHire`, `:136 townBusinessLaysOff`; record shape `living-world/town-finance-types.ts:10 TownBusinessBooks` (cash, debt, annualRevenue, kind, capacity, annualOtherCosts).
- Cash and sales: `living-world/town-finances.ts:755 recordTownSalesReceipts` (saved quarterly sales as cash receipts), `:897 ensureTownOpeningBusinessBooks`, `:984 openBusinessBooks` (cash buffer from `TOWN_FINANCE_POLICY.business.cashBufferDays`, data `data/research/money/opening-employer-cash-buffers.json`), `:1087 stepTownFinances` (quarterly), `:1974 closeBusinessesOutOfCash`, `:1685 closeBusinessWithNobodyLeft`, `:2078 assertTownFinanceIntegrity`.
- Customers: `src/simulation/aggregate-customers.ts`, `local-economy.ts` (`OWNER_DRAW_BASIS :243`, `BUSINESS_OWNER_WORK_KIND :244`), `local-business-counts.ts`.
- Businesses and owners: `living-world/town-businesses.ts:121 townBusinesses`, `:340 reviewTownBusinesses` (entry and closing, `TOWN_BUSINESS_TURNOVER :73`, `TOWN_OWNER_RETIREMENT_AGE :87`, closing reasons :94), `:190 recordedTownEmployer`.
- Pay from cash: test `living-world/town-pay-employer-cash.test.ts` (uses `paymentFromDatedCash`, `src/simulation/resource-payments.ts`); pay writer `living-world/town-pay.ts`.
- Press owners (pattern for change of hands): `src/simulation/press/ownership.ts:109 currentOutletOwnership`, `:162 outletsHeldBy`.
- Homes and land: `src/simulation/home-purchase.ts`; no parcel or deed record exists (grep of `types.ts`, `life.ts`: none). Newer code covering part: none; the books and receipts above are the base.

## Build steps (one PR each)

1. **Sales are real receipts, every quarter.** Each business's receipts = customers it actually served (aggregate customers from households' recorded spending in its market, split by `capacity` share) x its price level, written through `recordTownSalesReceipts`. Delete any stored `annualRevenue` figure that is used as income without a customer count behind it (keep it only as the opening estimate). Must not: revenue from a formula that ignores who spent.
2. **Wages from cash, with an opening that cannot block.** At world open, `ensureTownOpeningBusinessBooks` sets each employer's cash to at least its first payroll plus the buffer row (days by kind, estimated from similar kinds where a kind has none, marked in data). A payroll that cannot be met still pays in order of seniority and records the shortfall as a layoff or a loan draw (`TownBusinessBooks.debt`), never a silent skip. Public bodies pay from their own accounts (existing path). Test: every employer in 10 random new games pays the first payday.
3. **Ownership record.** One record kind `business-ownership` (owner kind person, household, business or fund; share; from, to), written by one function. `OWNER_DRAW_BASIS` pays the owner from it. Existing owners are read into it once at open; no second owner store.
4. **Sale to a person or another business.** When an owner reaches retirement age, dies, or the business is in distress, the business is offered for sale; a buyer is picked by the buyer's own records (cash, experience, relationship), with the price from earnings (kind multiple row, researched). The old owner receives the price; the books continue. If no buyer, it closes through the existing path.
5. **Private equity and consolidation.** A fund (a recorded organization) buys businesses of a kind where margins and price match its own rule row; after purchase it changes costs and staffing through the same books (pay share, other costs rows) and may resell. Effects reach workers only through layoffs and pay already modeled.
6. **Eminent domain and land transfer.** Add one parcel/site record per business and public project (place, use, owner). A public project law (road, school, stadium) taking a site writes a taking with compensation from the law's terms row (fair-market value row), moves the site, and the business relocates or closes. Land sold between owners writes the same transfer. Each step is a law or an owner decision, never a draw.
7. **All places.** One test loops 50 states, D.C. and territories.

## Must not build

Any UI, notice or screen; a second books or cash model; a random sale or buyout chance; a per-town special case; names of real companies or funds (generated names only, per b23); a chain-store owner; a business that creates a vacancy because it changed hands.

## Research tables

In repo: IRS SOI books, opening cash buffers, County Business Patterns, Economic Census. Missing, one search each, 10 minutes: small-business sale price multiples by industry (BizBuySell/IBBA public reports); private-equity share of acquisitions by industry and post-buyout employment change (Census, academic summaries); eminent domain takings volume and compensation basis (Institute for Justice / state statutes, representative states then drift). Local = representative sample, then drift. Estimate basis: "ESTIMATED FROM AVERAGE: <kind> multiple from <source>", data only.

## Done when (played-game proof)

Ten random new games: every employer pays the first payday from recorded cash. In one random place run ten years in a test harness: at least one retirement sale, one buyout that changes staffing, one public taking with compensation, each traced to records (owner, buyer, price, law). Workers affected show a layoff or new employer in their own job history; nothing else changes on screen. Tests: `business-sales-receipts.test.ts`, `business-first-payday.test.ts` (10 seeds + all places), `business-ownership-transfer.test.ts`, `business-private-equity.test.ts`, `eminent-domain-taking.test.ts`, plus integrity (`assertTownFinanceIntegrity` still passes, books balance).

## Proof to post

`docs/codex/evidence/b28-businesses-real-books/`: printed books of one business before and after each event (receipts, payroll, cash), the ownership rows, the taking and compensation rows, the first-payday table for the ten seeds, `npm run typecheck` and changed tests.

## Standing rules

"NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building."
"Others may touch this file; work anyway; whoever merges second rebases; message the owning session directly with specific questions and keep building."
Open owner question: the final design approval for steps 4-6 (Register item 6 asks for research, then a design the owner approves). Switch: build steps 1-3 now; steps 4-6 each sit behind one data row `businessTransferKinds` listing which transfer kinds are enabled (default all on in tests, off in play until the owner approves); the rule rows (multiples, fund criteria, compensation basis) are data. Log the design in the docket and keep building.
