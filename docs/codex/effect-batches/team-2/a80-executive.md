# Vacant governor desks stop signing and vetoing bills

Before: A bill could receive a signature or veto from an authored scenario ending when its jurisdiction had no seated governor. The player-session wait also wrote that ending directly.

After: The vacant desk leaves the bill pending. The player-session wait opens the shared executive desk. A seated governor receives the same bound matter through the existing executive route.

## Why-chain

Measured source finding: main's `state-governing.ts:2812` read the blueprint's ending when no governor was seated. Missing office evidence entered that fallback rather than leaving the bill pending. It called the canonical executive writer without a person.

Measured: the saved action was labeled “Governor” in `/tmp/team2-a80-paired-before.log`. The chain ended at an authored stand-in, rather than a person's recorded decision.

Measured source finding: the candidate returns the unchanged world at `state-governing.ts:2805` instead.

Measured source finding: the player-session wait used the scenario's ending directly at main's `legislation-session.ts:477`.

Measured source finding: the candidate sends the actual measure to the existing shared executive desk (`legislation-session.ts:477`). The wait supplies neither an actor nor a choice.

## Research

This is audit gap A80, under the approved G6 requirement that executives decide through their actual desks. Town-charter authority remains a separate research dependency. Measured source finding: the generic profile declares no presentment with a game-profile source at `town-council-profile.ts:198`.

## Revisions

Measured diff finding: the shared-desk change removes the missing-governor arm and exports the existing dispatcher (`state-governing.ts:2783`). The player-session replacement is limited to its released wait case and necessary imports. The patch rewrites no saved history and adds no levels, probabilities, multipliers or curves. Legal windows and statutory silence rules remain outside this patch.

## What gets built

1. Remove the blueprint ending from `state-governing.ts`'s `governorDesk`.
2. Preserve the seated-governor matter route and repeat guard.
3. Check both authored endings, absent offices, repeat calls and canonical Save/Continue.
4. Route the player-session wait through the existing shared dispatcher, which already chooses the President or governor for the actual measure.

## Simulated, records, world pieces, checks

Measured: the vacant cases return the unchanged world, append no decision or due item, and survive reload (`vacant-governor-desk.test.ts:130`). The seated case uses the actual incumbent writer and existing matter (`vacant-governor-desk.test.ts:180`). Measured: 56 of 56 jurisdiction keys returned no governor in the unseated world (`vacant-governor-desk.test.ts:153`). This is not a proof of executive presentment or decisions in 56 natural worlds.

## Proof run

Measured: the same eight tests gave main six failures and two passes; the candidate passed eight of eight. The failures covered vacant-desk signatures and vetoes, player waits with signed, vetoed or null endings, and the seated player-session route. The original seated-governor and 56-key lookup checks passed in both arms. Evidence is retained in `/tmp/team2-a80-caller-before.log` and `/tmp/team2-a80-caller-after.log`.

## Worked example

Measured: on January 7, 2026, LB 88 awaited its executive. No governor was seated. Main wrote a signature for the supplied signed ending and a veto for the supplied vetoed ending. The candidate kept both arms awaiting the executive, with no added action. The two retained logs record those phases and dispositions; returning the identical world also preserves its money records.

Measured: the actual producer seated Cameron Wilkerson. Both source arms opened the same matter and produced an identical saved-world hash (`/tmp/team2-a80-paired-after.log`). The test also proved reload and repeat stability.

Team1's verified release covers the included player-session wait case. Town executive authority and the remaining A80 callers are unfinished. This PR does not claim A80 complete.

## Checks and method

The paired baseline is main `0e648000d614bed69eef1c33ae3c6deb097c91f6`. The procedural test uses Nebraska's existing scenario, seed `legislative-core-nebraska-2026`, supplied committee and floor votes, and actual presentment. It is not an ordinary filing run or randomly selected watched world. Assertions and timeouts are identical in both arms. No constitutional clock run, full suite, browser proof or year-speed benchmark is included.

The retained identity receipt names world `world_98fbbdfb86abe48b`, measure `legislative-measure_ec0f649006cb19da`, and governor `person_741ee32107d7d0be`.

The seated matter is `event_0f9464dd27c84272`. Its serialized-world FNV hash is `7c3f63ac71134f66` in both source arms.

The player-session file matched Team1's released blob `b5fec3d82fb27adb79e858e71ab8308e8f18a9a9`. Other player-session, filing and budget-selection hunks remain untouched.

Final scoped proof on composed source `439736c2a9c7214ad57f8aaa8827b60873cceaba`, parent main `b0477bb31c4a178720dd0b7483527d33d555ae24`: eight of eight passed in 25.34 seconds. Three strict roots reported zero diagnostics. Changed-file ESLint, Prettier, whitespace, report and committed release checks passed. The report reviewer returned PASS. Zero-dice found zero new items and five inherited removals; its exit status was 1.
