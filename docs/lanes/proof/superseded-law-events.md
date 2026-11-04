# Superseded laws do not announce an effective date

Pool item: laws-took-effect-superseded-red-territory. This is a regression-unit proof, not a voted-law path or independent confirmation on main.

## Cause and correction

In `src/core2/modules/laws.ts:782–786`, the effective-date writer finds the governing row for the scheduled row's jurisdiction and level. `src/core2/laws-in-force.ts:226–238` replaces the national federal level with a territory-specific federal row when that row exists. The old guard returned only when a *present* governing row had a different ID, allowing an absent national level to emit a false event. The correction requires the governing row's ID to equal the scheduled row's ID. No second law reader, place-specific branch or test change was added.

## Regression

Aua, American Samoa, key `territory:AS:aua`, replay `2fa4d8f150b51d99`, world seed `29e996a3e03c344496c3705b3592bf712eece7248267d651059e106ba2c3353f`: on the old writer, unchanged `law-took-effect-superseded.test.ts` reports the overridden `law:US:federal:minimum-wage:general:test-scheduled` as taking effect and fails. Restoring the correction passes both tests, including the naturally repealed Ohio case. These tests contain their own statutory fixtures; they are not evidence of a naturally voted law reaching a named person.

| Fresh draw | Replay | World seed | Result |
| --- | --- | --- | --- |
| Centennial, Wyoming (5613440) | 3eaa23457c1ab6cf | a8838c572dc194e2f929592486b53817b341db3fe4b91245926fc2abfe6c5ad4 | Complete file: 2 passed |
| Alamo Lake, Arizona (0401170) | bf432f8da721d34f | 8aee09ec2ccb5fc19e30baa78e1e07eba77daac566581e971dffb70dd5efd427 | Complete file: 2 passed |
| Huntington Woods, Michigan (2640000) | 780eeccdeae638a6 | 976be518ccee2a3068452fa8bcd480b4a040914cee77ae45c522c60d5c6c10e7 | Complete file: 2 passed; initial selected-case retry disclosed below |

The first Huntington Woods process disappeared after printing RUN, without an exit result. No host restart or cgroup OOM was recorded; cause unknown. The same-draw retry passed. The interruption is retained, not counted as success.

Commands (every npm invocation has `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" NODE_OPTIONS=--max-old-space-size=8192`):

```sh
GOLDEN_PATH_SEED=<replay> npm test -- src/core2/law-took-effect-superseded.test.ts --maxWorkers=1
GOLDEN_PATH_SEED=7e2710adbfd1d4e6 npm test -- src/core2/press-amount-law.test.ts --maxWorkers=1 -t 'prints a state wage raised in a drawn place'
```

The positive newspaper control passes: legitimate raised-wage reporting still works. Its successful drawn town is not printed by that test; only its replay is claimed. The selected-case ablation and preliminary fresh runs add `-t 'a statute enacted over a scheduled row'`; filtering is not a changed skip or expectation. Local logs and exit records: `/tmp/lane-2-superseded-checks/`.

## New Game and remaining work

Source `ab30b9508baf33c2e6c805e226ae4a964ae9d2d8`, Bettsville, Ohio, replay `c2797efbe1a45c7c`: New Game, four weekly advances, resume, scene and Journal returned HTTP 200; failure null. Player `person_a6ff171c5c2b56e2`. Runner: `node --import tsx /tmp/lane-2-superseded-newgame.mts`, using the repository's `newGameCheck`. Raw response: `/tmp/lane-2-superseded-newgame-result.json`. This checks opening and brief play, not one year or a whole lane path.

Four-year controlled performance comparison and another session's main replay remain pending. No path is Built or Verified by this unit.
