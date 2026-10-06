# Campaign cards use fine borders and transparent backgrounds

Before: Measured in the before capture: Campaign cards use rounded corners and separate brown backgrounds.

After: Measured in the after capture: Campaign cards use square corners, fine brass borders and transparent backgrounds.

Publication remains held until Session 1 passes the shell prerequisite.

## Replacement and proof

Replaces: `src/player/campaign-workspace.css:1` changes the existing Campaign rules in place. Rounded-card and brown-background declarations are removed. These are measured CSS changes. The diff contains no campaign action-handler changes; unchanged actions are inferred from that source boundary.

Built on Session 2's published shell foundation. Session 9 owns the Personal split-record extraction.

Campaign before:

![Before](https://raw.githubusercontent.com/lamontaes/Political-Game-Git/codex/session3-campaign/docs/codex/session3-evidence/campaign/campaign-before.png)

Campaign after:

![After](https://raw.githubusercontent.com/lamontaes/Political-Game-Git/codex/session3-campaign/docs/codex/session3-evidence/campaign/campaign-after.png)

## Validation and next step

Measured local checks: full typecheck, changed-file ESLint and Prettier, zero-dice, committed release declaration range and merge-tree against current main pass. The composed browser cases pass (2/2); Calendar and Campaign unit tests pass (6/6). Measured preserved clean-main failure: the original three-year run exhausted Node’s 4 GiB heap before completing its first year (about 902 seconds; exit 128). No speed comparison is established. Further year timing belongs to Session 5 under the CTO instruction. Measured 30-day opening: the canonical observer advances from January 5 to February 4, 2026, using the same random-place seed and Scarville locality. The receipt names tested source `203d4be05dca287af5d75088d6c110a8503a11e6`. The screen candidate has no changes in `src/simulation`, `src/presentation` or `data`; unchanged simulation behavior is inferred from that source boundary. The ordinary new-life walk uses Scarville, Iowa, seed `session3-kit13-20261005`, at 1920×1080. The custom legislative staff start checks that Office stays hidden without a seat. Office and Transit captures use the existing supplied recorded-member term; it does not establish ordinary election reachability. The coordinator retains merge authority.
