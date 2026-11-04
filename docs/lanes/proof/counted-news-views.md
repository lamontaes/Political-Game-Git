# Counted news and named readers — builder work in progress

Pool item: people-counted-readers-stances-from-stories. Runtime and regression: `550e0993d4`; shared full-reader extraction: `c3e06dd20c`. No whole Lane 2 path is Built or Verified. Election-result consumption, weighted-population redistribution, New Game, four-year comparison and independent main replay remain unfinished.

Little Falls, Maine (2340350), replay **e6a7db3640a0b91f**, world seed `a76e72df1638fc50a7f3aeb77ab11855f09cea74884a807bc8f5d936d614f566`. The normal `buildBenchWorld` runs January 20, 2025 through January 20, 2026. The observer supplies no law, vote, news story or stance. It fills in a member after the real story reaches the member's group, through the ordinary core API.

On January 28, the television story `news:printed:outlet:television:3:jurisdiction_d717b85ea87ae00c:bill-vote:bill:office:gus2025:166151:board:2025-01-21:person_b3662580befaed49:0:office:gus2025:166151:board` reaches group `counted-news:group:jurisdiction_d717b85ea87ae00c:town:adults:income-2:rent:30-44:working`. Government unit `gus2025:166151` is Cumberland County (Census government id 20100300300000), not a school district. The story reports the board's vote on `us-policy-positions:housing-land-use.inclusionary-requirement`. The group represents 28 adults; this delivery wave represents 3.551129429427457 readers. The shared full-reader stance transition moves the group's mean using that reached mass; no member is chosen by a rate or roll.

**Andrew Reese**, `person_4ace08bd36f19e31`, is then filled in. His view is **0.3052942153906098**, matching the counted profile, and his stance retains the story source. The normal news writer gives him the public KnownFact: key `news:printed:outlet:television:3:jurisdiction_d717b85ea87ae00c:bill-vote:bill:office:gus2025:166151:board:2025-01-21:person_b3662580befaed49:0:office:gus2025:166151:board`, source id `printed:outlet:television:3:jurisdiction_d717b85ea87ae00c:bill-vote:bill:office:gus2025:166151:board:2025-01-21:person_b3662580befaed49:0:office:gus2025:166151:board`, learnedAt **2025-01-28**, value **press.printed**. He can read and discuss the story through the existing news machinery.

The ordinary year passes. After the year, a separate test-only group-key change checks conservation of total signed stance during regrouping. That fixture is not a played eviction or mortgage. Full-reader parity, saturation and repeat wear-out remain checked by the existing views/trait tests and the counted/full transition comparison.

The original baseline `bf7a4284d65acccfc62cbaa13b825a4f7515c54f` recorded 2,016 topic-bearing printed stories with a stated change and 147,937 counted deliveries in this year. Its 19 counted residents with heard stances were all demoted full people; no never-full counted member had such a stance. Those figures include non-policy topics and are not counts of enacted laws. The baseline observer first used the wrong press module id; corrected code reused the same replay.

Checks: ordinary-year regression passes, 41.887s test / 57.67s command; 13 unchanged views/trait checks pass. The first new knowledge assertion incorrectly expected a boolean from `api.knows`; the corrected assertion requires the exact fact key, source, learning date and public access. No existing assertion was relaxed. Typecheck passes; test-import scan reports 1,006 uncovered test files and zero unresolved imports, not full typechecking of those tests.

Ablation: disabling only the `hearCountedNews` delivery call makes the same regression fail at “no naturally delivered policy story moved a counted reader.” Test 42.67s, command 57.99s. The wrapper restores the source bytes in `finally`; restored news.ts SHA-256 is `5328b7d6372d3315ad7aecbe48460725ca5eed58b6e76d012aa7933e5ea3509a`. These durations are test observations, not a performance comparison.

Replay:

```sh
GOLDEN_PATH_SEED=e6a7db3640a0b91f LANE2_COUNTED_NEWS_PROOF=/tmp/counted-news-proof.json OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" NODE_OPTIONS=--max-old-space-size=8192 npm exec -- vitest run src/core2/views-counted-readers.test.ts --maxWorkers=1 --reporter=verbose
```

The first unseeded development run suppressed its town/replay output and is not attached proof. Named records and source above come from the explicit replay. Raw builder logs are `/tmp/lane-2-counted-news-knowledge-fixed-test.log`, `knowledge-proof.json`, `ablation.log` and `ablation-result.json` under the same `lane-2-counted-news-` prefix.
