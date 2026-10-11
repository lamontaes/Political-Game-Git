# P14 elections — RULES-2 contract

Owner-approved REVIEW 25: after offices, lift election KEEP rules across local,
state and federal levels together. Courts and press remain parked.

This branch stacks on `pool/P14-offices` and reuses its isolated date arithmetic.
Own `src/rules/elections/` and the required release declaration. Never edit a
legacy engine. Inventory `RULE` means KEEP; corpus lookup, World/history writes,
wording and units classified PLUMBING remain with the port.

Plan: calendar formulas; plurality/majority/top-two/ranked counting; nomination
primary/runoff decisions; supplied term-limit service; vacancy deadlines and
recall petition decisions. Compare lifted decisions with unchanged legacy
functions across all 56 jurisdiction identities, including a seeded random draw.
Retain suspected bugs unchanged and register each temporary assumption for CTO
review. No playable new-core path is claimed until ports consume these shelves.

Separate finisher and CTO merge. Continue to legislature/council, then the
authorized laws and economy branches without waiting for review.

Model: GPT-6 (Codex); exact runtime variant/configured effort not exposed;
repository default medium. Start: 2026-10-11 00:29 UTC.

## Lift and boundary

330 KEEP lines fully lifted: statutory date formulas, state executive calendars,
national cycle/dates, November municipal date, ballot counting and pure nomination
tally/threshold helpers, plus consecutive-term counting. 546 KEEP lines partially
lifted: town date selection, Senate appointment timing, executive limit check,
primary/runoff outcomes and shared recall/proposition signature certification.
World lookup, history writes and record serialization remain with the caller.

Primary rows retain tally order; the legacy event writer's participant-ID sorting
is applied in the golden projection. Refusal wording is projected to keys for
petition certification; source record IDs and decisions remain exact. Hypothetical
plan fixtures exercise counters where the old plan reader declines a primary
stage; these fixtures do not assert that the place holds that stage. Territories
likewise exercise null Senate-law inputs without asserting they have Senate seats.

Registered CTO items: deadline-as-appointment pacing; partial terms counted whole
and missing ends treated as continuous; 90-day continuity gap; 365.25-day lookback
years; primary standing weights, missing-share fallback and positive share floor;
runoff positive weight floor; 16-year executive term search bound. They are lifted
unchanged, with exact core2 registry fields and parameter provenance/spreads.

This slice does not finish the whole elections inventory. Legislative/local term
limit adapters, recall closure/referral, special-election proximity laws and other
World orchestration are still unported. Courts and press remain parked.

## Validation / hand-off

395 tests in two files pass. Random jurisdiction SD, seed
`rules2-elections-20261011`. Scoped ESLint, Prettier and zero-dice pass. Owned
TypeScript diagnostics are zero; the imported legacy graph still has the same
101 baseline diagnostics. Main smoke evidence is recorded in the offices draft;
main has no new-core bench. End of implementation: 2026-10-11 00:37 UTC, about
eight minutes. Model/effort recorded above; usage/cost not exposed. The GitHub
Project claim was attempted but the API's GraphQL endpoint returned Forbidden;
ownership is recorded in this PR's contract instead.
