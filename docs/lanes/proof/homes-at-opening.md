# Homes before the first screen

Builder evidence only. No whole Lane 2 path is Built or Verified here. The eight-town first-minutes finish line and another session’s check on main remain outstanding.

The old opening returned no dwelling before its first day hook. Housing now calls its existing, idempotent initializer from its government pre-start pass. The normal card, room and later payments read those same records. The old day-hook fallback remains for worlds without pre-start history. No bench or core-state file changes, time advance, fallback dwelling or duplicate initializer.

## Opening regression and ablation

`housing-ready-at-opening.test.ts` passes both ordinary buildBenchWorld openings before any advance: Burnet, Texas / 6e32d4b3c4eb3d6e and Hammond, Illinois / 24dcbddd678cae0a. There are 876 and 860 full households respectively; none lacks a dwelling. The card equals the housing row and the room reader uses the same home. Calling openHousing twice leaves homes, contracts, people’s cash and January 20, 2025 unchanged. Test duration 17.03s; command 25.96s.

Burnet: Audrey Love, person_8f1a6acd8b574dba, dwelling:household_af5a2df4afdcd165, owned house, house-suburban-living, lived-in condition. Hammond: Jessica Reeves, person_1eb0128c1e27c266, dwelling:household_d27896c5514494e1, owned house, house-suburban-living, lived-in condition.

Removing only preStart.run’s call to openHousing makes the Burnet check fail at `opening homes exist before first advance`: all 876 full households lack records. The other test is deliberately skipped for that ablation. Source bytes were restored in finally. The wrapper’s environment replay names Hammond, but the test-name filter runs Burnet; the output prints Burnet’s actual seed. Command exit 1, expected failure, 26.67s.

## Browser before any advance

Normal New Game creator, then card, Skip scene and the returned home room. No advance route. Both remain January 20, 2025, all requests succeed, and no page errors occur. [Reader records](homes-at-opening-browser.json) include each exact New Game URL so chosen identity and place can be replayed.

- Burnet, Texas / 6e32d4b3c4eb3d6e, explicitly selected in the creator: Cedric Rivas, person_58d69233fe3b4bb0. His dwelling:household_361c7bf46b331051 is an owned mobile-home. The normal room is trailer-home-living and the displayed backdrop is trailer-home-living__night.jpg. [Screenshot](homes-at-opening-burnet.png).
- Fresh draw Mobile City, Texas / f271d755166490b7: Haris Reynolds, person_0cd3af440c1e4317. His dwelling:household_cd363268c1bf71c0 is an owned house with a bank loan holder. The normal room is house-suburban-living and the displayed backdrop is house-suburban-living__night.jpg. [Screenshot](homes-at-opening-mobile-city.png).

The creator’s random-place button with the Burnet raw replay selected Carolinas Heights, Northern Mariana Islands. That separate opening also passed: Cedric Rivas person_a783bb2900c1adf2, owned apartment dwelling:household_7f1fec466a7adbe6, apartment-basement-studio room. It is not mislabeled as the Burnet regression.

## Existing payments

Unchanged housing-coverage.test.ts passes in Norcross, Minnesota, replay b2, world 5fe571d94d73c89c29836c319b1fea9fe91a0f0643a3405b54b6340d475128f8. After one day: 873 households, 878 dwellings, zero missing. After another 40 days, 263 of 269 added leases have a positive payment. Harper Potter, person:central-bank:governor:3, pays 135740 cents to organization:landlord:national:central-bank. Receipt finance:2025-03-01:lease:household:person:central-bank:governor:3 records payer 5222887→5087147 and payee 814440→950180 cents. Test 7.96s; command 17.88s. No payment amount, guard or assertion changed.

## Remaining qualification

Four-week New Game passes in Glezen, Indiana / 32caaca9e520d6ff, player person_610b7ad5102ea53d, every request HTTP 200. Changed-file ESLint and formatting pass. Serial four-year base/head timing follows; no timing pass is claimed yet.

First timing pair, Camas MT / d985ed7523676597, main 8801f11542 versus runtime 44e8527dd1 on host 4c46091479ea: base 12.0/16.5/14.3/23.3s; head 12.5/17.6/17.4/23.7s. Year three fails the relative limit by 1.68 percentage points (+21.68%); all years are below 120s. Recorded as failure 1, not a pass. A second serial pair on the identical replay will resolve the small disputed timing; no seed change or assertion change. Source is restored. The baseline substitutes only housing.ts from pinned main; raw JSON head names the feature checkout and sourceMain is null, so it is a controlled-source baseline, not a raw main checkout.
