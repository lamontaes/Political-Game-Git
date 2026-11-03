# First minutes: parent-birthday correction

Status: builder evidence for one item, not a confirmed path. No non-builder verification yet.

## Reproduced on main

Base game source: e341dd83a5ff21b4fd0736b71b75f09ecc3cc474; timing sourceMain: eb4677d81de68e46428107534ad77646f0a0252f (pool claim only).

Hebron, Wisconsin (5533675), world seed ed0fcb9d5fe8c4fc405921ee692d31ba212d34a236b449fb2c63040a79e143bb: Levi Sims, person_8c0d0b0d5e62f97f, born 2002-06-24; Haley Sims, person_8bf215274a5f3b71, born 1987-11-08, was fourteen when Levi was born. The unchanged m0-life-at-18.test.ts failed at its existing fifteen-year assertion. The generated-family audit found eighteen under-fifteen parent links; the correction leaves zero.

## Regression checks

The existing kin and M0 suites plus opening-parent-birthdays.test.ts passed: 17 tests. Restoring the original opening-kin.ts made both new regression cases fail, in Hebron and Stoddard, Wisconsin (world seed ff28471ddd8550e2f827f9d66c567dfeea63171140ee0e35a12d38e286a3b788). No assertion, test range, town or timeout was loosened.

Ten further independent fresh draws: 10 of 10 passed. Each invocation also checks the pinned Hebron case. All npm commands carry OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" and NODE_OPTIONS=--max-old-space-size=8192. Replay with GOLDEN_PATH_SEED=<replay> npm test -- src/core2/opening-parent-birthdays.test.ts --maxWorkers=1.

| Town                             | Place key | Replay           | Generated world seed                                             | Result |
| -------------------------------- | --------- | ---------------- | ---------------------------------------------------------------- | ------ |
| Springfield, Wisconsin           | 5575975   | 2be66c3de7bd29b6 | 2692dea5d0f1b4e0c97e5e0cf4db41af95ab6e3fc692ec71a894c961a695c8c8 | Pass   |
| New Castle, Delaware             | 1050800   | 2114b035a0ffe714 | ec6df85944910b76e1fec860ce11a15ef7098b7b61d7691d507f666580259e31 | Pass   |
| Akron, Michigan                  | 2600700   | 6e079c3ba1c3f835 | ee6e6ac085f5df585632fb2a4b2c1e950f2dd2fcbc376cc006a76df2ff31ecb0 | Pass   |
| Moyock, North Carolina           | 3745460   | 3b6de6f25a9874e9 | 419ed38e53546ad9ebe877d7c2f67873a8d6ee27f0dd7ee7c4054069092c3368 | Pass   |
| Watson, Minnesota                | 2768656   | 9d6db00fffb2828c | 1fa91ec9d8c79d25875972f651f9403cca600a9c81ba6f7d680b1385e89d6486 | Pass   |
| Kingston, Rhode Island           | 4438980   | 31bd032322992e01 | 9b26f83b7bc0d931c08b4072d0b30ea0b5e95c13a543a1c99a4d026f400eb85a | Pass   |
| Washington, District of Columbia | 1150000   | 7300258bf92639c2 | ac24f388008f9b139dff62945a6fb2945f9f0330d68d19a1159f899a2e64c30c | Pass   |
| Renner Corner, South Dakota      | 4654145   | e1cc7137ae666b1f | a0bf035d34b207b36c81007867b262eab1cc3175dd48677223ea62dace20f98d | Pass   |
| Grenada, Mississippi             | 2829460   | 157a19eb0cea1dff | 0f626134f00c60243343084d8dbc4ec751f721c1bd2c1ad269da6eb57c37925d | Pass   |
| Lisbon, Ohio                     | 3944030   | 3f7ae425d72958ed | 785beb46432abb7c2a5b774cb857077dfd6d43d7ce560b36c5f21210756cb7f7 | Pass   |

## Unchanged M0-06 checks

All four runs passed (three tests per run). Replay with the listed world seed as GOLDEN_PATH_SEED and place key as GOLDEN_PATH_PLACE_KEY, using npm test -- src/core2/m0-life-at-18.test.ts --maxWorkers=1 and the environment settings above.

| Town                   | Place key | World seed                                                       | Result |
| ---------------------- | --------- | ---------------------------------------------------------------- | ------ |
| Rand, West Virginia    | 5466892   | 553b7186a7662f5664d5b8a0ae6556949d26f01a18472ba07767837df2ff624f | Pass   |
| Hebron, Wisconsin      | 5533675   | ed0fcb9d5fe8c4fc405921ee692d31ba212d34a236b449fb2c63040a79e143bb | Pass   |
| Springfield, Wisconsin | 5575975   | 2692dea5d0f1b4e0c97e5e0cf4db41af95ab6e3fc692ec71a894c961a695c8c8 | Pass   |
| New Castle, Delaware   | 1050800   | ec6df85944910b76e1fec860ce11a15ef7098b7b61d7691d507f666580259e31 | Pass   |

## Four-year timing

Same machine (4c46091479ea), no other simulation, Haleyville (0132704), replay ab5f58e9be125c95, four consecutive 365-day years. Command: npm run speed:year -- --seed ab5f58e9be125c95 --place 0132704 --years 4 --max-seconds 120 --exclusive --out <receipt.json>.

| Year | Base seconds | Corrected seconds | Change  |
| ---- | ------------ | ----------------- | ------- |
| 1    | 53.1         | Pending           | Pending |
| 2    | 138          | Pending           | Pending |
| 3    | 141.6        | Pending           | Pending |
| 4    | 394.1        | Pending           | Pending |

Base completed without crashing but exited 1 because years 2–4 exceeded 120 seconds. The owner's 20% comparison is still pending. Raw local receipt: /tmp/lane-2-parent-speed-base.json.

## Still required for the path

Sibling names, full dwelling coverage, browser checks in all eight fixed towns, and a non-builder replay on main. No path is marked Built or Verified from this item alone.
