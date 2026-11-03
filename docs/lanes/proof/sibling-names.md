# First minutes: sibling names

Status: generated-name correction in progress; all twenty drawn lives passed; creator integration, browser proof, timing and non-builder verification remain. Source correction: a55f4f4d3b on lane-2/sibling-names. No Path 1 Built or Verified claim.

## Reproduction

Mazomanie, Wisconsin (5550225), replay b37762f4-7895-40f5-8d83-0634db5b60cb, still reproduces on current main: player Evelyn Underwood, person_526f98c72f070459, born 2007-01-27; living sister Evelyn Underwood, person_f277a01c09158a60, born 2001-07-09. With the generator correction the player remains Evelyn and the same sister is Sabrina; the other siblings remain Riley and Lauren. Generated names change before family facts and the opening history are constructed. The wider population retains the generated name in its counted record for fill-in.

## Break-it check

sibling-names.test.ts passed in Mazomanie and Madison, New York. Restoring both original generators failed Mazomanie on the two Evelyn records; Madison passed. Restoring the correction passed both again. The first ablation attempt was interrupted by the environment startup and produced no test result; the recorded result is the completed retry. No test or expectation was loosened.

## Drawn lives

Each command uses OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14", NODE_OPTIONS=--max-old-space-size=8192 and GOLDEN_PATH_SEED=<replay>: npm test -- src/core2/sibling-names.test.ts --maxWorkers=1. Each invocation checks a fresh drawn town plus the pinned Mazomanie regression. The table counts only the fresh towns. Per-run logs and exit codes: /tmp/lane-2-sibling-fresh/.

| Town                          | Place key | Replay           | World seed                                                       | Result |
| ----------------------------- | --------- | ---------------- | ---------------------------------------------------------------- | ------ |
| Madison, New York             | 3644424   | 3f9c85898019ebff | 531af62d2399236aeb7beb78b41f759578bfe2ce47ddda2f62b0279951105074 | Pass   |
| Manchester, Maryland          | 2449950   | 9f27e7e0459bc055 | e7f1e6e6d010383da4d1f0572d624a109114bc0253004d67a11d27d471f5aa4f | Pass   |
| Tiptonville, Tennessee        | 4774540   | bce2acb42a5e685a | 3515f49e5cd380fd48fa0de81300c27227b3fff230265299fc0409895a9e8959 | Pass   |
| Milton, New Hampshire         | 3348580   | fce6b57622fc1ae0 | 6d2d2229f398b1583930c10d67009c0a1590d72fd09874f9957049d4885d0991 | Pass   |
| Cumberland Hill, Rhode Island | 4420260   | 2a88ebd672aecc54 | 5d0ec5db26cec7fc773655d162ffffd0953a5b1eed2e2a31fc77675e86a004d4 | Pass   |
| Manchester, Connecticut       | 0944690   | 1283dcd435e4b28e | fe8c67375aa6622cfcacab19374d4f7fc52fcd779693cdeaa9cf6f47c64d6f41 | Pass   |
| Harriston, Virginia           | 5135640   | cc821b209eff28ed | 4c2882b9280195b2648eaefd0827a3494770e11cfd4473fc1dde820815e702d3 | Pass   |
| Island Park, Idaho            | 1640600   | 34f29b4aa1540336 | f410748f79d05c62328be1d41920b194a448014b24071aa917ee27e04d80f41d | Pass   |
| Staves, Arkansas              | 0566800   | 6b0dc83837271dc8 | 9b387112f61c09ee71b2a30985e06bd7010e86ff873ab599490b76d5ec4af1d4 | Pass   |
| Elk Grove, Pennsylvania       | 4223112   | dd352cabd8beadf5 | ef11e2c9e89f5bf642bdeaf264dca18c3fff225c94b868566df4987b28cf165d | Pass   |
| Plandome, New York            | 3658475   | 24f8fc667e07937a | 871b8e553663fdd787eaa5d7eaeed4e3c080327579e62478c1e0be397871be42 | Pass   |
| Amagon, Arkansas              | 0501270   | dc154677a36520c5 | edf8583a7b2eee834f794b0a091df1da59c4f0af02e1a9adbf3f4fb1be1e6f2c | Pass   |
| East Stone Gap, Virginia      | 5124720   | 2cfc461a50662e31 | 6ad90ca194093e8c3237e86d3b04d2ffae124b25e4a720e0aeaed3e69f00ec58 | Pass   |
| Gibbon, Nebraska              | 3118615   | 08b5e43cc5ccf49b | 7cc7e1182f3f740a9342748034ccd87a18076b385740fbaac5cbfa0f73b14764 | Pass   |
| Centennial, Wyoming           | 5613440   | 32f0e19818fd0e83 | 0cba21b7c181887272259a1015e01af72f8d036816c05cf2af05fe59fabedb42 | Pass   |
| East Globe, Arizona           | 0421410   | f988c956af9f8a10 | 67cab2dcd193a11164c197e82fc67454778d73886a3d3796f2cd94af44840d8a | Pass   |
| Grand Junction, Colorado      | 0831660   | 5294d2613f4982ff | 00624d3ec991972cbbcccfef003273a8816bc09c3ff032b1a76c8008bde0825b | Pass   |
| Bellewood, Kentucky           | 2105464   | fc8df4634499560b | 92730fe319e71d32fba42157dc1339bd29816c7effcad2e81d48a4ae1bb97e6c | Pass   |
| Sardis, Mississippi           | 2865560   | 7c27f6294212b8c0 | 930a7094cab89c873ac76b31bc7f2b55b572efbdd3d5cb1365b66fe17aca957b | Pass   |
| Riviera Beach, Maryland       | 2466850   | fca7ce020263b56c | 2ae878569aa929a01ef20cac3a87aab69145b9e090a445c3e1227d28f7461f9d | Pass   |

## Creator seam

Choosing Riley through chooseIdentityV1 on the corrected Mazomanie world still leaves player person_526f98c72f070459 and sibling person_f277a31c09158f79 both Riley. This is measured, not inferred. Lane 5 owns that writer. The concrete proposed agreement is docs/lanes/agreements/2-5.md and the request is https://github.com/lamontaes/Political-Game-Git/pull/7144#issuecomment-6616917278 . No shared source has changed and no acceptance is claimed. The person's card resolves family:child names from otherPersonId, so the writer must update the sibling's person record.

Still unexplored: chosen-name behavior after integration, browser cards and history after that rename, future births during play, the four-year comparison, and all eight First minutes finish-line towns. Housing remains a separate item in the same card.
