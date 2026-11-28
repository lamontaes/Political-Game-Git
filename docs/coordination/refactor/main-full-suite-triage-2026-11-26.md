# Main's full suite: the 71 test files that failed on both nights (Nov 24 run 45423585384, Nov 25 run 45639593615)

SAME means the first error matched on both nights (a fixed break). diff means it changed with the drawn place or seed.

| Same? | Kind | Test file | First error (trimmed) |
| --- | --- | --- | --- |
| SAME | assertion | `scripts/dialogue-batch/batch-three.test.ts` | AssertionError: expected undefined to be 'I\'m asking you, not the whole floor.…' // Object.is equality |
| diff | assertion, timeout | `scripts/law-wiring/check-levels.test.ts` | AssertionError: expected 'minimum-wage 1113 -> 1224 at state (l…' not to match /governs/ |
| SAME | assertion | `src/bench/campaign-team.test.ts` | AssertionError: Hyde Park, Pennsylvania (4236592), seed t1:5: volunteer-offered:filing:contest:seat:gus2025:174150:council:0:2025-11-04:pers |
| SAME | assertion, timeout | `src/bench/dev-acceptance.test.ts` | Error: Test timed out in 1000ms. |
| diff | assertion, other-error | `src/bench/dev-run-year.test.ts` | AssertionError: Elloree, South Carolina (seed 6f3d94684ff05bc4): expected 'A day in results mode (time nobody wa…' to match /not done in a s |
| SAME | assertion | `src/bench/dev-who-named.test.ts` | AssertionError: Hardinsburg, Kentucky (2134552), seed 4276344481a2b078e70633cfee47d0caccb65f74:2: expected null to be 'met' // Object.is equ |
| diff | assertion | `src/bench/eligible-on.test.ts` | AssertionError: Gilbert, South Carolina (4529050), seed b6c1320ce93ec012: contests: expected 0 to be greater than 0 |
| SAME | assertion | `src/bench/endorsement-played.test.ts` | AssertionError: place 3042700, seed 61920e6dab2c03e17ef5ac6f144609e87ba9b08f99dcf251c8f0ef6b7d82e6a4: expected false to be true // Object.is |
| SAME | assertion | `src/bench/executive-bill-menu.test.ts` | AssertionError: Brogan, Oregon (4108600), world seed f2593c50ea0f2aa7ff0ffb9124753ef655aa221d904317d72923c2aa2f1f8567: no serving mayor: exp |
| SAME | assertion | `src/bench/filing-rule-office.test.ts` | AssertionError: expected '' to contain 'with the board of elections' |
| SAME | other-error | `src/bench/filing-walkthrough.test.ts` | Error: Not an offered choice. |
| diff | assertion | `src/bench/first-evening-talk-goes-on.test.ts` | AssertionError: Auasi, American Samoa (territory:AS:auasi), run seed 0979a73f0420f595, place seed 77b63f0349deda33b516bf4593bfea34209fa721b0 |
| SAME | assertion | `src/bench/player.test.ts` | AssertionError: expected 'complete' to be 'stop' // Object.is equality |
| SAME | assertion | `src/bench/race-result-stories.test.ts` | AssertionError: Searsboro, Iowa (1971355), seed de4ef0f8ff6efdfb:agree:15: printed:outlet:newspaper:0:jurisdiction_47de32828dc0db4c:election |
| SAME | assertion | `src/bench/scene-places.test.ts` | AssertionError: train-depot-platform: expected undefined to be defined |
| diff | assertion | `src/core2/births-full-web.test.ts` | AssertionError: Kaibab, Arizona, US-AZ (0436500), world seed 4986505c90f519fd0cd739cb4154924fe3f7ee4eb131181374839e1f75ab9881, run seed 2b8f |
| diff | other-error | `src/core2/budget-line-schools-staffing.test.ts` | Error: Pinehurst, Idaho (1663100), seed 95f694e7cbcc7b2a809484d8062b8f71647d65dff6b9b9355ddca10c5d610043: the mayor's schools line was not a |
| SAME | assertion | `src/core2/candidacy-open-seat.test.ts` | AssertionError: St. Johnsbury, Vermont (5062125), seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4: contest:seat:gus202 |
| diff | assertion | `src/core2/clean-air-law.test.ts` | AssertionError: Suffield, Ohio [3975182], seed fef391ee68207530: expected 'law:US-OH:state:us-policy-positions:e…' to be 'EPA Green Book non |
| SAME | assertion | `src/core2/congress-federal-position-bills.test.ts` | AssertionError: us-federal-positions:trade.raise-tariffs: expected 1 to be +0 // Object.is equality |
| diff | assertion | `src/core2/corruption-calibration.test.ts` | AssertionError: overall rate 0.21211781834471946: Austin, Nevada (3203700), world seed 66887a54084f15fe25da593a31cdf57df5b9020de316d714f23d3 |
| SAME | other-error | `src/core2/disasters-no-market.test.ts` | Error: A whole household moves under its own id. |
| diff | assertion | `src/core2/federal-courts.test.ts` | AssertionError: expected 0.7771583768877708 to be 1 // Object.is equality |
| diff | assertion, timeout | `src/core2/housing-counted-evicted.test.ts` | AssertionError: Storrs, Connecticut (0973980), seed b93b5eabeb1a7a8e:storrs: expected true to be false // Object.is equality |
| diff | assertion | `src/core2/justice-player.test.ts` | AssertionError: expected [ 'becoming-friends' ] to include 'hearing' |
| SAME | timeout | `src/core2/law-knowledge.test.ts` | Error: Test timed out in 120000ms. |
| SAME | assertion | `src/core2/law-reach/budget-line-credit-by-law.test.ts` | AssertionError: the town's own laws on the line: expected 0 to be greater than 0 |
| SAME | timeout | `src/core2/law-reach/school-aid.test.ts` | Error: Test timed out in 1800000ms. |
| SAME | timeout | `src/core2/law-reach/veterans-reach.test.ts` | Error: Test timed out in 70000ms. |
| SAME | assertion | `src/core2/legislature-rooms.test.ts` | AssertionError: expected +0 to be close to 0.02, received difference is 0.02, but expected 5e-10 |
| SAME | assertion | `src/core2/modules/health.traits.test.ts` | AssertionError: expected 0.07650273224043716 to be less than 0.05 |
| diff | assertion | `src/core2/national-answer-law.test.ts` | AssertionError: Trowbridge, California (0680560), seed e4e976c59f87550392be9a81a7b015f34a6a100709adabcb362295c78cb1428d: the federal work-re |
| diff | assertion | `src/core2/office-budget-season-chain.test.ts` | AssertionError: Everly, Iowa (1926175), world seed 2619e726ba86d6111c212e6ec0cacf27dd726aaa21efe419072e7fa3b97b898a, run seed fd427b82cb5a07 |
| diff | assertion, other-error | `src/core2/office-day-budget-season.test.ts` | AssertionError: Springfield, Massachusetts (2567000), seed 1935840db2ccb2eaaedea4dcc13edd513a20899fccfdaaeb9f5216f7b8388be6 speaker person_7 |
| diff | assertion | `src/core2/opening-key-people.test.ts` | AssertionError: San Vicente, Northern Mariana Islands (territory:MP:san-vicente): expected [ 'office:US:president' ] to deeply equal [] |
| SAME | assertion | `src/core2/opening-terms-in-office.test.ts` | AssertionError: expected [ { …(13) }, { …(12) }, …(3843) ] to deeply equal [] |
| SAME | assertion | `src/core2/outcome-web-health-waiting.test.ts` | AssertionError: gas-hookup-ban-to-child-asthma in unwired.json: expected 'SG-WEB-unread-health-child-asthma-pct' to be 'SG-EW-HEALTH-conditi |
| diff | assertion | `src/core2/outcome-web-public-finance.test.ts` | AssertionError: SG-EFFECT-WEB-prices-nondisaster-transfers: expected 'resolved' to be 'open' // Object.is equality |
| SAME | timeout | `src/core2/partner-from-counts.test.ts` | Error: Test timed out in 30000ms. |
| diff | assertion | `src/core2/past-justice.test.ts` | AssertionError: cards that tell the arrest, Indian Head Park, Illinois (1737257), seed d4f379aa6da5269b: expected +0 to be 34 // Object.is e |
| SAME | assertion | `src/core2/pre-start.test.ts` | AssertionError: expected [ 'later-b', 'run-a', 'twice', …(3) ] to deeply equal [ 'later-b', 'run-a', 'twice', …(2) ] |
| diff | assertion | `src/core2/president-orders.test.ts` | AssertionError: the left-leaning President issued the order: expected undefined to be defined |
| diff | assertion | `src/core2/press-amount-law.test.ts` | AssertionError: Aberdeen, Ohio (3900142), seed f2c8789b0c5ef205:ohio: wage stories printed: expected 0 to be greater than 0 |
| SAME | assertion | `src/core2/second-chamber-own-day.test.ts` | AssertionError: a bill the House carried: expected undefined to be truthy |
| SAME | assertion | `src/core2/small-town-treasury-payroll.test.ts` | AssertionError: Brookford, North Carolina (3708140), seed brookford-1: job:public:town:police-chief:person_0fe87c396053edb3 (Police Chief) a |
| SAME | assertion | `src/core2/speech-afterward-pledge.test.ts` | AssertionError: Wilton, Iowa (1986070), seed 42517cd6481f3187fab6ac8877e4e969fbab9e6d60417dee2382d376fe2d73a1, run seed e2a4c07d81f3b965: no |
| SAME | assertion | `src/core2/staff-dismissal-after-attendance.test.ts` | AssertionError: an aide let go after a worked day: expected 0 to be greater than 0 |
| SAME | assertion | `src/core2/staff-hire-employed.test.ts` | AssertionError: Agugulu, American Samoa (territory:AS:agugulu), seed 22f4e9bb98e626eff75612873d97593542392255d3450825d036511aa10f1dbe: aides |
| diff | assertion | `src/core2/staff-player-clock.test.ts` | AssertionError: Elkton, Kentucky (2124400), seed 64a254d3d7e0f04beb1f05ba379f14980790cfa5a7e44d08ef19d3f61efd7d62: the clock reached 2025-08 |
| SAME | other-error | `src/core2/trait-coverage.test.ts` | Error: src/core2/data/content.json#/actions/0 is not the option work-shift. |
| SAME | assertion, timeout | `src/core2/two-level-elections.test.ts` | AssertionError: U.S. Senator: US-NM 3546100, seed tl-a, share 0.663 against the state's 0.469: expected 0.1935256049289903 to be less than 0 |
| SAME | assertion | `src/core2/work-closeness.test.ts` | AssertionError: an offer from an employer with counted staff: expected undefined to be defined |
| SAME | assertion | `src/core2/world-races-no-district.test.ts` | AssertionError: expected 0 to be greater than 0 |
| SAME | assertion | `src/core2/world-settings.test.ts` | AssertionError: expected 0 to be greater than 0 |
| SAME | assertion | `src/director/bring-it-up-two-stories.test.ts` | AssertionError: Auburn, Wyoming, seed 9a4f2c7e1b03d865: person_1817d76c4f96ef0b on 2025-02-10, printed:outlet:television:0:jurisdiction_7a90 |
| diff | assertion | `src/director/conversation-home-lines.test.ts` | AssertionError: Brecon, Ohio (3908378), seed d37808d9dd2c17f70f7f896cb70a8e590c5574d5: expected 0 to be greater than 0 |
| SAME | assertion | `src/director/eviction-leads-the-talk.test.ts` | AssertionError: expected 0 to be greater than 0 |
| SAME | assertion | `src/director/eviction-talk-words.test.ts` | AssertionError: together: expected 'Things got bad yesterday.' not to contain 'yesterday' |
| SAME | assertion | `src/director/job-lost-talk-played.test.ts` | AssertionError: Charlotte Amalie West, U.S. Virgin Islands: a relative who works at a closable business: expected undefined to be truthy |
| diff | assertion | `src/director/law-effect-scene.test.ts` | AssertionError: Gauley Bridge, West Virginia (5430364), seed 8ab01f9b3006d5fd:0: It's early on March 21. You sit down at the kitchen table.  |
| diff | assertion | `src/director/notice-home-scene.test.ts` | AssertionError: Dandan, Northern Mariana Islands (territory:MP:dandan), seed 16506db3ab10783e0b5cc74fe5a2977b47d9d72eed7917d429830b9cde6aeb2 |
| SAME | assertion | `src/director/outlet-ask-talk.test.ts` | AssertionError: a neighbor with a stand: expected undefined to be truthy |
| SAME | assertion | `src/director/press-comment-after-vote.test.ts` | AssertionError: expected 'skipped' to be 'composed' // Object.is equality |
| diff | assertion | `src/director/press-comment-context.test.ts` | AssertionError: Newfields, New Hampshire (3351300), seed 24179d977570a2b2:0: {"kind":"skipped","reason":"no narration for press-comment can  |
| SAME | assertion | `src/director/press-scenes.test.ts` | AssertionError: expected [ Array(1) ] to deeply equal [ Array(1) ] |
| SAME | assertion | `src/director/scene-says-past-its-opener.test.ts` | AssertionError: Sheridan, Wyoming (5669845), seed 7: person_0f713cf2e3e20027:2025-04-25:life.death:person_04c8672722482399:2025-04-25 has no |
| SAME | assertion | `src/director/talk-silence-heard.test.ts` | AssertionError: POST /api/talk/open?otherId=person%3Apress%3Aoutlet%3Anewspaper%3A0%3Ajurisdiction_4c9aee299f456e08%3Aowner%3A0: {"error":"T |
| SAME | no-suitable-drawn-place | `src/director/tie-history-scenes.test.ts` | Error: No drawn place gave a campaign: |
| SAME | other-error | `src/director/time-of-day.test.ts` | RangeError: Invalid array length |
| SAME | assertion | `src/english/opening-speech-ties.test.ts` | AssertionError: expected [ …(44) ] to deeply equal [] |
| SAME | assertion | `tests/levers-and-powers-catalog.test.ts` | AssertionError: run node --import tsx scripts/research/placeholder-ledger.ts: expected [ 'src/core2/death-cause.ts:253' ] to deeply equal [] |

## Owners, by Past and Day One (Nov 26, 5:50 p.m. ET; each file mapped to the family `tests/guards/families.json` gives its own source path)

**Mine, fixed (#10672):** `opening-key-people`, `opening-terms-in-office`, `past-justice`, `partner-from-counts`. Not mine though named "opening-": `src/english/opening-speech-ties.test.ts` (The English engine; Story's words).

| Owning engine | Files |
| --- | --- |
| The story director (15) | bring-it-up-two-stories, conversation-home-lines, eviction-leads-the-talk, eviction-talk-words, job-lost-talk-played, law-effect-scene, notice-home-scene, outlet-ask-talk, press-comment-after-vote, press-comment-context, press-scenes, scene-says-past-its-opener, talk-silence-heard, tie-history-scenes, time-of-day |
| Screens and the UI kit (13) | bench/campaign-team, dev-acceptance, dev-run-year, dev-who-named, eligible-on, endorsement-played, executive-bill-menu, filing-rule-office, filing-walkthrough, first-evening-talk-goes-on, player, race-result-stories, scene-places |
| Laws, justice and their effects (6) | justice-player, law-reach/budget-line-credit-by-law, law-reach/school-aid, law-reach/veterans-reach, outcome-web-health-waiting, outcome-web-public-finance |
| Households and people (3) | births-full-web, housing-counted-evicted, trait-coverage |
| Executives and offices (2) | office-budget-season-chain, office-day-budget-season |
| The clock, the world and places (1) | world-settings |
| The past before the start (1) | pre-start (the History reader's own file) |
| Budgets, Legislative bodies, News and the press, Jobs (one each) | budget-line-schools-staffing, legislature-rooms, press-amount-law, work-closeness |
| No family (22): the guard assigns source files and skips test files, so these tests sit on files the table does not cover | candidacy-open-seat, clean-air-law, congress-federal-position-bills, corruption-calibration, disasters-no-market, federal-courts, law-knowledge, modules/health.traits, national-answer-law, president-orders, second-chamber-own-day, small-town-treasury-payroll, speech-afterward-pledge, staff-dismissal-after-attendance, staff-hire-employed, staff-player-clock, two-level-elections, world-races-no-district, scripts/dialogue-batch/batch-three, scripts/law-wiring/check-levels, tests/levers-and-powers-catalog |

None of the 66 traces to Past and Day One's files. **`work-closeness` and `job-lost-talk-played` read the jobs engine's records**; the staffing fix in #10678 changes how many layoffs and closures a played year holds, so a session fixing either should run it on main and on #10678's branch before reading a red as its own. Of 725 test files, 73 resolve to a family by their subject's name; the family guard checks source files only (`tests/guards/families.test.ts`, `sources()`), so a test has no owner until the guard is widened: a proposal is on #10377.
