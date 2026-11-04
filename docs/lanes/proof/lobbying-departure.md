# Lobbying after an actual departure

Status: reader implementation and ten fresh resident-world fixture runs pass. Natural-election proof, New Game and four-year comparison remain pending. No whole Lane 2 path is Built or Verified.

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
