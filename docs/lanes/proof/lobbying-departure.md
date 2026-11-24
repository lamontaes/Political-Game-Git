# Lobbying after an actual departure

Status: reader implementation and ten fresh resident-world fixture runs pass. New Game and a natural-election year also pass; four-year comparison remains pending. No whole Lane 2 path is Built or Verified.

The reader follows continuous service through term boundaries and same-office seat changes. A later return after a gap does not erase the departure. The existing laws engine now retains the research’s numeric provisions on its starting-law rows; the lobbying reader uses their periods, including six months, and cites the governing law ID. Missing periods retain the existing estimated fallback, explicitly registered as SG-LAWS-lobbying-period-unspecified. No election or core writer changed.

## Fixture regressions

These are term fixtures in generated worlds, not natural-election proof. No law is hand-enacted: each world opens with its researched standing law. Tests require the officeholder’s placeId to equal the played town. The first queue selected national seats because townSeats includes them; those runs were discarded and retained under /tmp/lane-2-lobby-nonresident-fixtures/.

The strengthened test passed in Sunset, Utah (4974480), replay ece921f700fd6e2e, world 7a29a0b888252fcedfff66d38a9c1dea9c9682ce22d1e3b33afee32ae9c52847, resident person_5d76f7409de3bb48. Restoring only the old reader fails continuous service (returns a bar); restoring only the old law loader fails the required provision. Corrected bytes restored after each. Logs: /tmp/lane-2-lobby-resident-{reader,law}-ablation.log.

Each command uses OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14", NODE_OPTIONS=--max-old-space-size=8192 and GOLDEN_PATH_SEED=<replay>: npm test -- src/core2/lobbying-departure.test.ts --maxWorkers=1. Fresh logs: /tmp/lane-2-lobby-resident-fresh/.

| Town (key)                              | Replay           | World seed                                                       | Resident                | Result |
| --------------------------------------- | ---------------- | ---------------------------------------------------------------- | ----------------------- | ------ |
| Davisboro, Georgia (1321800)            | 1a4d11985a47e500 | 5ae495e3afe3d8e3152f76d85abbce124a251494773f90790c2841c6da5d8006 | person_18b2b0127bda50b9 | Pass   |
| Cumberland Hill, Rhode Island (4420260) | b84d71aebb78f1e5 | 5e0ec2539f8ca2c0177880c5c939160f92e4314ef04f92f63b6f516437fe511f | person_0ecd24a9ebb18b6d | Pass   |
| Oakland, South Carolina (4551887)       | c327dc91f1d4fed1 | 258f81dc7c49ea9024a7cdd4b02d1613d5354f1bac19b1152281d44189d9625e | person_272b0482c9e745e7 | Pass   |
| Marquette, Iowa (1949620)               | 44de76cd3ae236d1 | a47a5e0ec367ad579adb0522e162ba308e3d23c2c8ff4a3ab81309f802c36110 | person_b227fa9162d38c6a | Pass   |
| Carolina, Rhode Island (4412340)        | 3dd5e1779be525ab | 98e2ae73e8ffdea616883fc12098d66e1453db808c26f60545a4a62b8714a0ff | person_bf0b7f182633dc19 | Pass   |
| Laureldale, Pennsylvania (4241768)      | 1cbbf0ba1583f7fd | 57bafdc9aedb494e58e7d3b4e4a4ed52a42732ac62346e30080cf8ebb6d23c4a | person_1f6cae5875f6039e | Pass   |
| Skyline, Alabama (0170896)              | a1fe783b46334fa7 | 3990a90966ec8d47f66261d0b55a816acf02ec7ff08c70f29f803ac9def46056 | person_1311e5c945cda9db | Pass   |
| Pahala, Hawaii (1559750)                | 45d6877d7a7db8bb | 5316018dadbc9cb2a2888d263b3eea0eaff263d5212e4e581dfd5a22dc49d312 | person_18322bb4eb32165b | Pass   |
| Waterville, Maine (2380740)             | 9b1d18097ab83e9e | 84b728bfc0cf804264e6a92eeea93a1b89a68f16d504d9c1205980cde2c1bae2 | person_02c22d51354bec3f | Pass   |
| Elliott, North Dakota (3823340)         | f241eb99da777483 | bde8ea8ff2b068cffb201dd95161b6d0759368836cdc07308a560ae4124252da | person_fd36917c7533f741 | Pass   |

All ten runs passed. Each log names skipped draws, the standing law ID, its period and the fixture departure/expiry dates. The assertions also cover another seat in the same office, a different office, an interrupted return, opening re-election history and ending a stale reach row.

## New Game and first natural year

Source 00cb393a73 passed New Game in Burnet, Texas, replay 6e32d4b3c4eb3d6e: four weeks, scene and Journal returned 200. Log /tmp/lane-2-lobby-newgame.log. The opening inspection separately found dwelling:null, recorded for the First minutes follow-up rather than counted as a housing pass.

Revere, Massachusetts (2556585), replay 7b7b49a74432ac15, world 6995c155a167457e88b03773d9709047d61494856025c0b3139df9700ea53f1c, completed one year through 2026-01-20 without an inserted law, election result or departure. Skyler Wu (person_491d10f7b1d4dd00), Brian Osborn (person_a80265ccc1f1a8cd), Brian Carson (person_3173fb0a2a53832b) and Jacqueline Barrett (person_4a7eed40343e31da) were re-elected, took their next terms on 2026-01-01 and returned no former-official bar. For Skyler, term:seat:gus2025:211226:council:0:2025-01-20 ended with “term ended”; term:seat:gus2025:211226:council:0:2026-01-01:elected continues the same person's service. The standing law is law:US-MA:state:us-policy-positions:government-operations.ban-lobbying-after-office:general:starting, with a one-year period.

That run produced zero departures, so the departure assertion failed. It proves continuous re-election only; the second half remains unproven in natural play. Raw records/log: /tmp/lane-2-lobby-natural-attempt-1/. A second fresh draw is running with the assertion retained and a living former-official witness required. Calls made by the observer are reader checks, not proof that an interest group appointed or rejected a lobbyist.

## Completed natural year

Source 00cb393a73; Winchester, Massachusetts (2580545), replay e25e0b67dfb8fa1a, draw 5, world 7c6373cd7e050c2a0af9a84da9067a2e5d7dc9aeb7da106258dabe8703221213. Played 2025-01-20 through 2026-01-20. Passed over Cornwall CT, Middleburg NC and Lebanon NH (no numeric standing ban), and Warrenton OR and Rivergrove OR (no resident election in the opening year). No hand-enacted law, inserted election result or manufactured departure.

The standing law is law:US-MA:state:us-policy-positions:government-operations.ban-lobbying-after-office:general:starting, with a one-year period. The reader checks were:

| Person                                  | Actual term records                                                                               | Result                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| David Morton (person_0522593e34a3db6f)  | term:seat:gus2025:106146:board:0:2025-01-20 → term:seat:gus2025:106146:board:0:2026-01-01:elected | Continuous service on 2026-01-01; no bar.                     |
| Ayanna Waller (person_6b3538354f924004) | term:seat:gus2025:106146:board:1:2025-01-20 → term:seat:gus2025:106146:board:1:2026-01-01:elected | Continuous service on 2026-01-01; no bar.                     |
| Dana Mercer (person_9b7846303e6be665)   | term:seat:gus2025:106146:board:2:2025-01-20, ended by conviction                                  | Left 2025-12-30; barred until 2026-12-30. Living at the read. |
| Marcus Parks (person_12567109c887a442)  | term:seat:gus2025:106146:board:2:2025-12-30, ended by term ended                                  | Left 2026-01-01; barred until 2027-01-01. Living at the read. |

The departure dates plus the law's one-year period were independently checked against both returned expiry dates. This proves the reader on naturally produced terms, not that an interest group selected or rejected one of these people. Current office/jurisdiction applicability is unchanged by this fix. Raw records: /tmp/lane-2-lobby-natural.json; log: /tmp/lane-2-lobby-natural.log; observer: /tmp/lane-2-lobby-natural.ts. Four-year timing passes as recorded below; independent main confirmation remains. This is not a whole Lane 2 path confirmation.


## Controlled four-year timing

Aunu’u, American Samoa (`territory:AS:aunuu`), replay `9a300821f8ddd9d4`, world seed `81c2d0833331dc7ebb42b212b43e693a037391c720cae61dee41dc57095a1170`. Host `4c46091479ea`. Source base `90f9a456a7d3f0a216db391c84be8fe4555e6324`; corrected head `e1e2c2757b49f08792db55688219bd48dbe97374`. One run per version, sequential, with no concurrent simulation or tests. The baseline temporarily restored the four changed source/data files and removed only this new test; all five files were restored byte-for-byte before the corrected run. The base report's HEAD field identifies the checkout; its sourceMain and runner log identify the controlled source.

| Year | Base seconds | Corrected seconds | Change |
| --- | --- | --- | --- |
| 1 | 22.4 | 23.3 | +4.0% |
| 2 | 52.1 | 55.1 | +5.8% |
| 3 | 39.4 | 41.9 | +6.3% |
| 4 | 88.1 | 84.4 | -4.2% |

Both commands exit 0. Every year is below 120 seconds and within the 20% comparison; maximum increase 6.3%. Record totals match in each year (137416 / 308371 / 374804 / 543781), which is not a claim that the partial fingerprint covers every engine's private state.

```sh
OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" NODE_OPTIONS=--max-old-space-size=8192 npm run speed:year -- --seed 9a300821f8ddd9d4 --years 4 --max-seconds 120 --exclusive --out /tmp/lane-2-lobby-speed-base.json
OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" NODE_OPTIONS=--max-old-space-size=8192 npm run speed:year -- --seed 9a300821f8ddd9d4 --years 4 --max-seconds 120 --exclusive --out /tmp/lane-2-lobby-speed-head.json --baseline /tmp/lane-2-lobby-speed-base.json
```

Runner and raw results: `/tmp/lane-2-lobby-speed.py`, `/tmp/lane-2-lobby-speed-results.json`, `/tmp/lane-2-lobby-speed-{base,head}.{json,log}`. Only source/data was controlled; release version metadata is 0.76.0 in both runs.
