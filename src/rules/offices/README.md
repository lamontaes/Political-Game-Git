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

## Current status

Contract only. No rules lifted and no tests run yet. The managed execution environment is starting; GitHub reading and contract preparation are available, but the bench and local gate are not.
