# CIVIC SERVICE → LAND: funded service route

Owner: CIVIC SERVICE, Claude Code session `political-game-claude-runtime-proof-98`.
Base: `20501132bddd893207aa8efa223f06ff88ca60e0` (compiled `d75abfcb`), byte-identical
to LAND's receiver on every path below except `transit-funding.ts`, whose
`servicePeriod` rename is included. Branch `claude/civic-service-funded-route` in
the "Political Game" repository.

## What a player can now do

One labeled supplied Alaska House or Senate seat can carry a service decision to
a delivered, paid result using ordinary controls and the ordinary clock:

1. Earn recorded personal money from existing shop work (the member has none).
2. File the transit appropriation and pass it through the existing recorded
   fictional appropriation sitting in the Docket.
3. File a tax in Politics → Taxes and public receipts and follow it in place
   through its own recorded fictional revenue sitting.
4. Wait for both ninety-day effective dates, declare occurrences, and let the
   tax collect into the public receipts account.
5. Request two service periods; each is paid from collected public cash and
   delivered once, then reported in plain words, with what is not modeled.
6. Save, reload and continue; nothing is paid or delivered twice.

Before any tax is collected, Transit warns that a request would be refused and
links to Taxes. A refused period pays nothing and delivers nothing.

## Owner decision recorded

The ordinary route could never hold public cash: the account is funded only by
an enacted tax, and F's contract refuses to enact a tax with the appropriation
sitting's votes. The owner chose (this session, 2026-09-14) a separate labeled
fictional revenue sitting, `alaska-revenue-recorded-v1`, bound to the exact
filed tax text, ending in a Governor's signature (no override threshold
claimed). The appropriation profile and its admission identity are unchanged.

## Delivery

- Feature patch, rebased by 3-way apply onto LAND PR #255 head `76f37e4f`:
  `/private/tmp/claude-501/-Users-lamontae-Documents-Political-Game-Claude-Runtime-Proof/e0efcefc-109e-4608-8847-f78bdbf9d437/scratchpad/civic-service-feature-on-76f37e4f.patch`
  (everything except the root).
- Root adapter patch:
  `/private/tmp/claude-501/-Users-lamontae-Documents-Political-Game-Claude-Runtime-Proof/e0efcefc-109e-4608-8847-f78bdbf9d437/scratchpad/civic-service-root-adapter.patch`
  — `src/player/PlayerGame.tsx` (Taxes surface,
  nav entry `nav-politics-tax`, Transit `onOpenTaxWork`) and
  `src/presentation/shell-navigation.ts` (`"tax"` surface).
- Release declaration: `docs/release/changes/civic-funded-service.md` (minor, Added).

Changed areas: recorded sitting profile and shared admission control
(`legislative-authored-sitting.ts`, `RecordedSittingAdmission.tsx`, the Docket
swap), Tax work (`TaxWorkWorkspace.tsx`, `tax-work.css`), Transit
(`TransitWorkspace.tsx`/`.css`, `transit-work.ts`, readable settlement text in
`transit-service.ts`), the named default-date key in `public-fiscal.ts` and
`transit-funding.ts`, the registry capability resolution
(`funded-service-capability.ts`) with its generated coverage
(`docs/systems/civic-service-coverage.md`, `scripts/civic-service/coverage.ts`),
restored `docs/systems` tax, transit and recorded-sitting contracts, tests.

## Checks actually run

Tested head `dc4bfef095e3e89313b00a19e9310a0653d302df`; the delivered head adds
only this note.

- `npm run typecheck`: passed.
- eslint and prettier on every changed file: passed.
- Vitest, 10 files, 72 tests, all passed: `civic-funded-service` (two paid
  periods across save/reopen; unfunded second period with no payment or cash
  change; duplicate request; ended and Kentucky offices; cancellation),
  `funded-service-capability` (all 50 states, local registry, office gate,
  generated coverage current), `tax-enactment-input`,
  `legislative-authored-sitting`, `transit-service`, `transit-funded`,
  `public-fiscal`, `transit-work`, `transit-cash-snapshot`, `legislation-docket`.
- `node --import tsx scripts/civic-service/coverage.ts --check`: current.
- `npm run release:check`: OK (run on `44c4ea24`; the declaration is unchanged).
- Composed Playwright journey `tests/e2e/civic-funded-service.spec.ts` on the
  tested head with served-identity verification: 1 passed (1.4 min), run
  `324b94da-35c9-400e-8689-8807f831df04`. Pointer and keyboard (Enter, Space)
  activation through the real shell, Docket and Tax work. Screenshots
  `civic-tax-enacted`, `civic-transit-unfunded`, `civic-transit-delivered` and
  `civic-transit-reopened` are under that run's results directory.
- Manual pointer review in the Browser pane at 1024×768 on a supplied Alaska
  Senate seat. It found and fixed: filing feedback out of view, refusals out of
  view, duplicate filing of identical pending terms, unstyled tax inputs, a
  detached checkbox and ballot radios, and "1 vehicle-service hours" in period
  rows.
- Not run: the full `npm run validate`, the full e2e suite, `corpus:prose`,
  native desktop packaging. None of these is claimed as acceptance; human play
  acceptance is pending.

## Nationwide state

Every state now runs the same resolution: the loop is playable only where all
seven fields are admitted, and a refusal names the missing ones. Today that is
Alaska only; 49 states and all 144 loaded local governments are listed with
their exact missing fields in the generated coverage. No power, vote or cash is
guessed while the provisional-rule question is open.

## Limits and next owners

- Seat entry is a supplied office scenario; ordinary candidacy into it is
  NATIONWIDE WORLD/ELECTION (`resolveActiveMemberSeat` and
  `resolveLegislativeFilingEntry` are the agreed guards).
- Other states need RULES data (procedure, decision producer, tax power,
  effective-date rule). When rules-capability/v1 (`3e26109b`) is on main, the
  resolver's legal fields should read `resolveCapability` rather than registries.
- A municipal funded service needs its own writer on RULES'
  `admitCouncilAction` APPROPRIATION; `passMunicipalOrdinance` refuses money bills.
- Tax → assessment → receipt breadth, and service → access/travel effects, remain
  the fiscal successor's; paid vehicle-hours claim no ridership or approval.
- Shell: the bottom-left life dock overlaps long panels at 1024×768 (sent to
  UI FINISH). The pane's synthetic Enter/Space did not activate buttons; keyboard
  activation is proven by Playwright instead.
- Prose corpus anchors for new player-facing strings are to be minted on the
  merged ledger after PR #255 lands.
