# Opening dwelling coverage

Pool item: housing-dwelling-records-cover-few-households. Builder's evidence; no independent main verification. Source 1c9e29e221.

Before, current-main Norcross (b2) has 873 named households and only 17 dwelling records; four households in the played town lack homes. The unchanged room-condition test fails with 871 lived-in, two rundown and zero as painted.

After, all named households have a home; the additional dwelling rows below are the existing counted households. No scene or existing test was changed. Housing generation also creates real leases, read by finance at their monthly due date. Existing leases keep their recorded amount and landlord. Other places use their own price and eviction-law data; a national-only address does not acquire the player's state's eviction law.

| Town / key                    | Replay           | World seed                                                       | Named households | Dwellings | Missing | New leases / paid by day 41 |
| ----------------------------- | ---------------- | ---------------------------------------------------------------- | ---------------: | --------: | ------: | --------------------------: |
| Norcross, Minnesota / 2746492 | b2               | 5fe571d94d73c89c29836c319b1fea9fe91a0f0643a3405b54b6340d475128f8 |              873 |       878 |       0 |                   269 / 266 |
| Ames, Iowa / 1901855          | 57f47a172725333f | 73d59c9e3dba05b45566689fa6150ea802b1446a1b7716f54864a98e852ae620 |              870 |      5924 |       0 |                   256 / 251 |
| Othello, New Jersey / 3455320 | 29afc53e842415c1 | 90bc91527636986e71bf7bff6be2b6badf79f15ed8e89fca32d7bc912e1c7cc2 |              805 |       846 |       0 |                   305 / 292 |
| Manville, Wyoming / 5650270   | 61280908ca6e7687 | aef386af1ce4422395806e22cd81b81500b110afb0d02f9b92f7ba08dc6a6ae8 |              769 |       792 |       0 |                   260 / 254 |

Norcross's rooms now read 492 lived-in, 91 rundown and 290 as painted. Its named payment: Harper Potter, person:central-bank:governor:3, pays 135740 cents to organization:landlord:national:central-bank on 2025-03-01. Receipt finance:2025-03-01:lease:household:person:central-bank:governor:3 records payer cash 5222887 → 5087147 and landlord cash 814440 → 950180. The test asserts both changes equal the payment.

Checks: unchanged housing-opening and room-condition tests (6 passed); housing coverage plus existing eviction/mortgage tests (8 passed); each table row reruns housing-coverage and unchanged room-condition (4 tests per place, all passed). Typecheck and changed-file ESLint pass. One development regression tried to recreate existing contracts; fixed by preserving their recorded terms, then all existing housing tests passed.

Commands use OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" and NODE_OPTIONS=--max-old-space-size=8192. Per place: GOLDEN_PATH_SEED=<replay> npm test -- src/core2/housing-coverage.test.ts src/bench/room-condition.test.ts --maxWorkers=1 --silent=false --reporter=verbose. Logs and named payment receipts: /tmp/lane-2-housing-fresh/{0..3}.{log,json}.

Merged main ae007a0de426bc25528378067c6fc2e2703b0358 without conflicts, producing source 76171c847fb996b743cf803dc6e63dfba5e3d4f1. Chromium New Game passed in Assaria, Kansas, replay c3c43bc513701e1d, Jesse Wallace (person_0e107788e3868ec6), age 40. New Game and both day advances returned 200; the second advance reached January 22 at 07:00 with simulatedDays=1, 58 decisions and 58 acts, and no page errors. Screenshot/result: test-results/lane-2-housing/{new-game.png,result.json}; runner /tmp/lane-2-housing-browser.mjs. Four-year timing is next. Whole First minutes path, the eight fixed towns, later-created households and independent main verification remain unconfirmed.
