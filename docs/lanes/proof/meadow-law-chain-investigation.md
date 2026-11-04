# Meadow Lakes law-chain investigation — incomplete

Meadow Lakes, Alaska (`0247735`), replay and world seed `f835dd278d7312a1`. Runtime is unchanged main; documentation head `0a576520a5bef54cda73ca0d2a72c2ab74e9e943`. One year, 2025-01-20 through 2026-01-20. No bill was drafted, law enacted, vote forced, payment manufactured or person outcome selected by the observer. `core.observer=true` retains evidence; this run is not a timing measurement.

The normal world produced 25 new law rows from 19 bills: 18 state policy questions and seven county rows. This is not a whole-path pass. Eighteen state questions also shows why the separate session-pace item remains necessary.

## A real vote and a named taxpayer

Mark Nielsen (`official:term:seat:US-AK:lower:020:0:2025-01-20`) sponsored HB 2. Bill `bill:office:US-AK:legislature-lower:2025-01-25:official:term:seat:US-AK:lower:020:0:2025-01-20:10` passed with 44 yes and 16 no votes across its chambers, then a sign decision. Its income-tax provision became `law:US-AK:state:us-policy-positions:fiscal.adopt-income-tax:general:2025-05-19:HB 2`, effective 2025-05-19. The retained vote rows include each member's reasons; they were not supplied by the observer.

Ryan Carr (`person_dbf34f057cfadf9d`) paid the new state income tax on 2025-05-20. Receipt `journal:2025-05-20:39812`, source `withholding:work-payroll:2025-05-20:work-commitment:job:position:organization_5f1215e11389e67c:2025-05-01:1:person_dbf34f057cfadf9d:8`, contains a $22.84 state-tax posting whose ID names HB 2's law. Alaska treasury cash increased 388898746 → 388901030 cents. Ryan's total withholding was $63.95, including $41.11 of separate federal taxes; the entire paycheck deduction must not be attributed to HB 2. His actual cash changed 150298 → 143903 cents.

Across captured named-person receipts, the postings explicitly naming this adopted state tax total 39634207 cents ($396,342.07) in 3,506 receipts. This counts that state's tax posting, not every tax in the same receipt. The raw observer also captured unrelated payments to reached people; those are candidates for tracing and are not automatically law effects.

## The same treasury pays people

On 2025-05-22, Donna Summers (`person_97293061d8139fbd`) received $468.60 from the same Alaska treasury in `journal:2025-05-22:39986`. Source: `work-payroll:2025-05-22:work-commitment:work-relationship_e67c4561431dafdb:8`. Treasury cash 392574649 → 392527789 cents; Donna 451697 → 498557 cents. The receipt cites her actual work commitment, payroll calendar and earned period. This proves an actual outgoing payment to a named worker from the receiving treasury. It does **not** prove that HB 2 created the job or increased spending. Its public paying link retains the registered `SG-P8-public-payroll-due-flow` estimate, explicitly not an enacted appropriation.

## What is still missing

- No learned-effect entry for the newly enacted laws appeared in the price engine's learned table. Current withholding records payments and applied rows but does not call that attribution reader. Whether specific affected people heard the tax story must be captured on hearing before concluding that a learning event is missing.
- The first observer did not call the normal `BenchPlayer.select` watch setup. Its empty composed journals are therefore an observer limitation, **not** a Journal bug. The next trace must use the normal player watch and capture heard stories and ordinary journal output, with no unshipped wording enabled.
- The teacher-salary law's four named reach rows say `paid-above-teacher-minimum` with zero moved money. They are not evidence of a changed paycheck.
- Issues, a named person's card, the paper naming the sponsor, the normal Journal and the honest reachable-person count still need browser proof. No path is Built or Verified.

Local reproduction: `/tmp/lane-2-meadow-law-observer.ts`, run with `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" NODE_OPTIONS=--max-old-space-size=8192 node --import tsx /tmp/lane-2-meadow-law-observer.ts`. Raw records: `/tmp/lane-2-meadow-law-observer.json`; exact-posting analysis: `/tmp/lane-2-meadow-summary.py` and `/tmp/lane-2-meadow-summary.json`. JSON serializes Maps so account/owner before-and-after values survive. The next observation is queued behind the isolated four-year comparison.
