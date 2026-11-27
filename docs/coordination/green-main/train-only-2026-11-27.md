# Train-only failures to re-run on main (Nov 27)

Train fab26daf (now eb0e63c8, which adds only a families.json and CODEOWNERS line), Heavy checks run 45982529210, parts 1 to 9 and 11, against main 8e1fa6be's run 45942424683. These test files failed on the train, and main ran them and they passed. The train edits none of these test files. Re-run each at the seed in its error, on main and on the train: a file that fails on main too joins main's list; one that fails only on the train blocks the landing.

## Assertions and errors (21)

- `src/bench/dev-why-repricing.test.ts` | 
- `src/bench/local-filing-officer.test.ts` | AssertionError: Washington, District of Columbia (1150000), run seed 5ba8412b355aaf2cdc6f4893d852b2767fa9e47d2
- `src/bench/state-legislator-screens.test.ts` | AssertionError: Sullivan, Wisconsin (5578175), seed d9dedfe5aa4bb392a443edfcb5d28655d1755858d790d4b7b4d6493096
- `src/core2/census-firms.test.ts` | AssertionError: Washington, District of Columbia: sales (seed c8ac111424d61674): expected 1.6032780017468267 t
- `src/core2/census-scale-closures-opelika.test.ts` | AssertionError: Storrs, Connecticut (0973980), census 15207, seed 447f13ef698184d00a06c540bdf8c49b8d02b707b64b
- `src/core2/contest-positions.test.ts` | AssertionError: Hyde Park, Vermont (5034975), seed 2d9a3e7316e24bb3db9dcb5b1004639d48bfc2ade3f5057e2f07ea1d713
- `src/core2/drug-negotiation-medicare-bills.test.ts` | AssertionError: Montpelier, Vermont (5046000, seed 0dcb32fb77ec6ed392fbea9082ed2f6eff1e64cdfeebd89cc6d9d97e534
- `src/core2/jobs-hired-away-replacement.test.ts` | AssertionError: Banks, Idaho (1604600), seed a0c4bbff2099f448650965a19076ea45fdbb3785a8aeab825560f269551b0acf:
- `src/core2/jobs-player-offers.test.ts` | AssertionError: job-offer:position:organization_1b5020f969329817:2025-01-21:standing:0:person_a9fc8f772ef75037
- `src/core2/leadership-membership-kept.test.ts` | AssertionError: 4932660, seed a7d2e58de9bc6f89: expected 173 to be less than or equal to 108
- `src/core2/offices-local-names.test.ts` | AssertionError: College Place, Washington: Walla Walla County Board of Commissioners: expected 'Walla Walla Co
- `src/core2/people-care.test.ts` | AssertionError: Nanakuli, Hawaii (1553900), seed 647e549694052edb: care for person_3fa4d48acd9895be by person_
- `src/core2/player-money-year.test.ts` | AssertionError: 0968240 (Sherman, Connecticut), seed ca58e3879e67b502b82f5ef851ae5b033107cd6b0207667d1d2c81537
- `src/core2/press.test.ts` | AssertionError: seed 022ac136f2d3ef41e1a7f4e591f89a819ed8643ec743224b0c4be5b39106b844, US-CA place 0612048: ex
- `src/core2/recounts.test.ts` | AssertionError: Norwood, Kentucky (2156928), seed 9f5ed7557c9a1427 draw 0: Council member counted inside the a
- `src/core2/starting-policy-law.test.ts` | AssertionError: seed 302d91b83c5534cfbb6f5c9180bd99bb087b09a306689d7826ddea85d2222e16, US-SD place 4608860: us
- `src/core2/terms-and-vacancies.test.ts` | Error: Duplicate institutional calendar key.
- `src/core2/unplaced-fill-in-job.test.ts` | AssertionError: Washington, District of Columbia [1150000], seed 463e747f191c8d4e: the household's unplaced wo
- `src/director/door-ask-scene.test.ts` | AssertionError: seed 6651a5023745c86a: Shonto, Arizona (0466260), seed ef0d5e8c006e1b5defabf183d81ceae5f782313
- `src/director/player-asks-for-a-vote.test.ts` | AssertionError: seed f9fd099294785a08: Dinosaur, Colorado (0820495), run seed f9fd099294785a08 draw 0, world s
- `src/director/press-scenes.test.ts` | AssertionError: expected [ Array(1) ] to deeply equal [ Array(1) ]

## A draw that found nothing (4)

- `src/bench/donor-calls.test.ts` | AssertionError: a candidate could call donors in a drawn place: expected 0 to be greater than 0
- `src/core2/campaign-turn.test.ts` | Error: no drawn place suited the case in 8 draws (run seed df9abb607d28a6c8ca408f23217cf246c90b951ea104bcc5154
- `src/core2/law-reach/group-a-money-township.test.ts` | Error: no drawn place had a township and no leave law (seed 07c57804471c163d): Ipswich, South Dakota (4631860)
- `src/director/tie-history-scenes.test.ts` | Error: No drawn place gave a campaign:

## Timeouts (16): re-run once on each head; a timeout only on the train needs a cause

- `src/bench/campaign-day-controls.test.ts` | the per-test limit is 1500000 ms; on main the whole file took 86774 ms
- `src/bench/scene-picture.test.ts` | the per-test limit is 30000 ms; on main the whole file took 23470 ms
- `src/core2/counted-payroll-halves.test.ts` | the per-test limit is 1800000 ms; on main the whole file took 2685388 ms
- `src/core2/counted-policy-delivery.test.ts` | the per-test limit is 300000 ms; on main the whole file took 86057 ms
- `src/core2/disasters.test.ts` | the per-test limit is 600000 ms; on main the whole file took 590587 ms
- `src/core2/find-age.test.ts` | the per-test limit is 30000 ms; on main the whole file took 18292 ms
- `src/core2/housing-paid-mortgage.test.ts` | the per-test limit is 300000 ms; on main the whole file took 141989 ms
- `src/core2/law-knowledge.test.ts` | the per-test limit is 120000 ms; on main the whole file took 76133 ms
- `src/core2/law-reach/school-aid.test.ts` | the per-test limit is 1800000 ms; on main the whole file took 1371885 ms
- `src/core2/modules/interest-groups.traits.test.ts` | the per-test limit is 600000 ms; on main the whole file took 376980 ms
- `src/core2/opening-customers-owner-elsewhere.test.ts` | the per-test limit is 30000 ms; on main the whole file took 27843 ms
- `src/core2/school-spending-one-figure.test.ts` | the per-test limit is 900000 ms; on main the whole file took 414316 ms
- `src/core2/sitting-closeness.test.ts` | the per-test limit is 75000 ms; on main the whole file took 57614 ms
- `src/core2/speech-afterward-pledge.test.ts` | the per-test limit is 180000 ms; on main the whole file took 349380 ms
- `src/director/electoral-scenes.test.ts` | the per-test limit is 900000 ms; on main the whole file took 175126 ms
- `src/director/request-needs-its-ground.test.ts` | the per-test limit is 240000 ms; on main the whole file took 337557 ms
