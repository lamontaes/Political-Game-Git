# New curriculum standards pay for materials and training

Before: a state could enact curriculum standards without changing school spending.

After: a new standards bill records its per-pupil materials amount and phase-in at introduction. The monthly budget charges for active, represented pupils at schools in that state until the phase-in ends. Sponsors price the proposal from their saved principles and the recorded adoption appropriation.

## Validation

Implementation read: `src/simulation/public-budgets/curriculum-standards.ts:19` computes the monthly charge. `src/simulation/legislation.ts:1549` records terms at introduction. `src/simulation/governing/policy-bill-terms.ts:17` prices them from saved sponsor principles and the research estimate.

Measured by `src/simulation/public-budgets/curriculum-standards.test.ts:163` (3 passing tests): the regression compares 12 monthly budgets with and without enactment. Its fixture of 120 pupils spends $12,000 more under a $200-per-pupil amount phased over 24 months. The amount and phase-in checks cover all 56 places. This is component evidence; full observer-world acceptance is pending.

The modeled cost estimate is recorded in `data/research/laws/curriculum-adoption.json:5`, using California's Common Core implementation appropriation. Legacy measures without filed numerical terms do not acquire new terms when read.
