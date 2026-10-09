# About half of every old engine is plumbing the new core does not need

Work in progress. This first push carries the measured split for every engine group. The per-engine module specs, stopgap lists, porting order and life-replay steps follow in the next pushes.

## The measured split, per engine

Measured: a read-only script parsed every non-test TypeScript file under `src/` on main at e6bc9f6c. It put each top-level function, constant and class into one of four classes. RULE is decision logic or math worth keeping. DATA is research rows and tables. PLUMBING is old-core reads, writes, schedulers, history copies, validators and queries. DEAD is code no game entry point reaches, or that nothing references. Interfaces and type aliases are counted separately. Lines are declaration lines; percentages are of RULE+DATA+PLUMBING+DEAD lines.

| Engine | Files | Lines | RULE | DATA | PLUMBING | DEAD | Types |
|---|---:|---:|---:|---:|---:|---:|---:|
| elections | 89 | 37,018 | 11,467 (40%) | 1,681 (6%) | 14,573 (51%) | 738 (3%) | 2,185 |
| legislatures | 107 | 48,427 | 11,565 (32%) | 4,893 (13%) | 18,168 (50%) | 2,075 (6%) | 3,483 |
| laws | 159 | 49,496 | 8,545 (21%) | 8,610 (22%) | 21,303 (53%) | 1,566 (4%) | 2,904 |
| courts | 64 | 21,558 | 5,311 (31%) | 1,617 (9%) | 9,284 (54%) | 823 (5%) | 1,364 |
| economy | 110 | 48,197 | 15,401 (41%) | 2,929 (8%) | 17,773 (47%) | 1,806 (5%) | 2,712 |
| press | 47 | 19,533 | 4,342 (28%) | 971 (6%) | 9,646 (63%) | 292 (2%) | 1,265 |
| campaigns | 53 | 23,635 | 4,290 (23%) | 699 (4%) | 12,459 (66%) | 1,304 (7%) | 1,237 |
| governing | 135 | 62,130 | 10,268 (21%) | 15,861 (32%) | 20,915 (42%) | 2,792 (6%) | 3,593 |
| story | 44 | 26,862 | 5,758 (28%) | 3,890 (19%) | 9,864 (48%) | 879 (4%) | 2,191 |
| english | 26 | 8,489 | 1,405 (21%) | 3,237 (48%) | 1,527 (23%) | 582 (9%) | 579 |
| screens | 636 | 201,532 | 73,530 (47%) | 5,706 (4%) | 56,865 (37%) | 18,955 (12%) | 15,441 |
| life substrate | 248 | 102,821 | 19,025 (25%) | 15,263 (20%) | 38,764 (51%) | 3,263 (4%) | 9,731 |
| source tools | 205 | 51,232 | 582 (2%) | 150 (0%) | 1,137 (3%) | 36,565 (95%) | 4,039 |

Planned: a hand audit of about 30 sampled declarations per engine will give the classifier's agreement rate. The next push adds it beside each row.

## Method

The script is `scripts/core2-port-inventory/inventory.mjs`. Its outputs are `docs/design/core2-porting-plan/summary.json`, `files.csv` (file to engine) and `units.csv.gz` (one row per declaration, with the reason for its class). It changes no engine code.
