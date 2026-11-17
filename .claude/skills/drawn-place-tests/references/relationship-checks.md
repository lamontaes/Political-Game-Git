# Relationship checks, not band checks

Part of the `drawn-place-tests` skill. Until Nov 17, 2026 this was the `relationship-checks` skill; the CTO merged it here when the skills were capped (owner: "Let's go ahead"). What it covered: How to turn a check that fails a world for leaving a real band (a count, rate, share or level near a published figure) into a check that a relationship has the strength the research gives, at drawn places, under the owner's rule that real data sets only how strongly one thing moves another. Use when converting a band, range or near-a-figure assertion in a test or tooling check, and when a new check is about to compare a world to a published number. Not for sense checks (no negative counts, no more jobs than adults), which stay, and not for finding a pinned engine value (that is the engine lane's family).

The owner, Nov 16 and 17: real data sets only the strength of a relationship, how strongly one thing moves another. It never sets a count, rate, level, target, band, anchor or outcome. "Everything comes from the simulation." A check that fails a world for leaving a real band makes every world the same, so the Long game lane converts them (CTO, Nov 17, families 32 to 35 on #9747).

## The method

1. **Name the relationship the band stood for.** Read the engine the band checks, not only the test. In the moves engine each adult's pull to leave builds at the ACS rate for their age in their state, so the research sets how strongly age moves leaving, not how many leave.
2. **Check that relationship inside the same drawn world.** For "leaving in proportion to each person's rate r": the mean r among those who left is E[r²]/E[r] of everyone at risk, above their mean E[r]. The standard error of the movers' mean is sqrt((E[r³]/E[r] − (E[r²]/E[r])²) / n). Assert the observed mean is within four standard errors of that prediction and above E[r]. Print the observed value, the prediction, its error and the place and seed on stdout. A world that empties or holds on still passes; a world where age stopped mattering fails.
3. **Keep sense checks.** No negative counts, no more jobs than adults, no money made or lost: those are not real-world targets.
4. **Post the plan on the crew's thread before building,** one pull request per subject family (the moves family, the jobs family), with the bands it replaces by file and line.

## The break-it check

- **Break the relationship in the engine, not the test, and show the check fail.** For the age relationship: flatten the engine's age table to its mean, or reverse it, run the converted test at the same place and seed, then restore the file.
- **If the check still passes with the relationship broken, that is a finding, not a pass.** It means the pattern comes from other causes. At Barwick, Georgia (Nov 17) relatives elsewhere moved by age with the age table flattened or reversed, so holds and pushes, not the ACS rate, decided who moved. Report it to the engine's owner with the numbers, and say in the pull request that the check measures the world's relationship but cannot show the research's figure is read.

## What a converted check finds

- **A count band can hide a wrong relationship.** At Gisela, Arizona (Nov 17) 10 of 581 adults left in six months, inside the old band, but the leavers' mean age rate was 0.0298 against everyone's 0.0392 (0.0518 ± 0.0090 in proportion to age): mostly people 65 and older left, pushed by close family elsewhere (`push:closeElsewhere` 1.4 to 2.0 against `lifeStage` 0.007 to 0.07). The converted check is red on main. It ships with the engine owner's fix, shown red on the old code, never marked to pass.
- **The coordinator routes an engine fault the check finds to the engine's owner** (the moves engine is World's). Keep converting the family's other bands meanwhile.
