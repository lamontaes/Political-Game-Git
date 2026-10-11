# P14 offices, seats, filing and qualifications

RULES-2 owns this shelf under owner-approved REVIEW 25 and the October 10, 2026 branch hand-off. Local, state and federal rules are lifted together, before the elections shelf.

## Contract

- Read the P11 row inventory and use only its RULE (KEEP) declarations. Audit prose does not override a DEAD, DATA, PLUMBING or REDESIGN row.
- Lift pure decisions over caller-selected office, seat, person, qualification and filing facts. Research lookup, World/history assembly, writers and live wiring stay with the port.
- Preserve legacy decisions, ordering, boundary dates and missing-fact behavior. Suspected defects remain unchanged, with a code marker and a core2-shaped stopgap registry entry, and are listed for the CTO.
- Keep identifiers in American English. Player wording remains with the English engine.
- Own only `src/rules/offices/`. Never edit old engines, `src/core2`, the director or another engine's shelf.

## Build order

1. Qualification date applicability and age/residence/citizenship assessments.
2. Qualification profiles over supplied sourced rows, with estimates registered.
3. Office and seat eligibility, including local district and residence rules.
4. Filing windows, fees and signature requirements from supplied place facts.
5. Local, state and federal qualification composition using those same rules.
6. Coverage and CTO hand-off, naming every partial lift and its remaining fact assembly.

## Verification

Before code changes, run the existing bench smoke test and baseline gate in the registered cloud workspace. Each meaningful lift receives golden tests calling the unchanged legacy helper on identical inputs over all 56 jurisdiction identities. Include date boundaries, ties, missing facts and invalid or unavailable requirements. Draw and name a random place and seed for the filing/qualification path. Tests import legacy code only as an oracle; shelf implementation does not read World.

Run changed-file typecheck, ESLint and Prettier, focused golden tests, `release:check --mode pr`, `zero-dice` and the stopgap registry tripwire. Record baseline failures separately. Fully lifted and partially lifted KEEP lines are reported separately; a partial lift is not reported as a complete source function.

## Lifted and remaining

- Fully lifted: signature arithmetic (14 KEEP lines) and filing opening (3).
- Partial: candidate applicability and assessment (140), office temporal applicability, duration and assessment (311), modal/range profile math (53), and selected seat-term window (23). Inputs select records; player wording stays in the English engine. Total source KEEP lines covered by partial lifts: 527.
- Seat creation, district catalogs, filing offices/fees and petition history remain with the port; their wrappers are not imported into the shelf. No PLUMBING or DEAD wrapper is claimed as a rule lift.
- Numeric date conversions and input validation support the lifted rules; they are not counted as engine KEEP coverage.

## CTO findings

The elector assessment applies a single legacy 30-day residence period to every supplied elector requirement. It is preserved and registered as a suspected bug. The common July 1 filing opening and 1e-9 signature rounding tolerance are also retained with registered replacements. No decision behavior was corrected.

Golden comparisons omit generated player wording; eligibility, ordering, field states, dates, source facts and refusal categories are compared. This is an output boundary change, not a new qualification rule.

## Baseline and status

The existing game smoke test is reproducible (seed `rules2-baseline-20261011`, six people and eleven events). The focused legacy baseline has 36 passes and one pre-existing failure: the qualification metadata test expects 69 records, and its corpus has 72. Main does not contain the core2 bench, so no playable golden-path advancement is claimed. The initial default-sandbox Vitest startup failed at Vite's git identity subprocess; the escalated run works.

RULES-2: GPT-6 (Codex), configured variant/effort not exposed; repository default medium. No helpers. Usage not exposed; no finisher send-backs. Time receipts and final validation are in draft PR #3946.

## Remaining-inventory continuation

The complete scoped function list is in `KEEP-DISPOSITION.md` and its structured
`keep-disposition.json`. It includes the offices/seats/filing/qualification rows
from the elections inventory and the office/seat modules from governing; the
rest of the governing engine (crises, executive programs and administration) is
outside this area's scope. The elections ledger covers the complementary rows.
Every entry distinguishes a full lift, a partial kernel whose whole function
cannot be copied, or a concrete whole-function blocker. A blocker is not a
reclassification of KEEP or a claim that a future core2 adapter is impossible.

This continuation adds filing-term validation, municipal minimum-age estimation,
ward-seat recognition, ward lookup/ranges and ward cut drawing. The unchanged
ward drawer uses household roster positions as geography/population and a common
10% deviation bound; its proxy is registered for the CTO. The tests compare all
ward decisions and age estimates against legacy for all 56 identities and check
the filing reader's accepted corpus rows for every office family.
