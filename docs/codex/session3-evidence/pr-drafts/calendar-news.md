# Calendar and News use square edges and fine separators

Before: Measured in the before capture: Calendar day cells and News sections use rounded edges and separate dark card fills.

After: Measured in the after capture: Calendar uses square cells and a fine current-day outline. News sections use transparent backgrounds and fine separators.

Publication remains held until Session 1 passes the shell prerequisite.

## Replacement and proof

Replaces: `src/player/ux39-calendar.css:1` changes the existing calendar rules in place. `src/player/news/news.css:43` replaces the opaque reader background; the duplicate selected-button rules are removed. `src/player/news/press-desk.css:1` replaces the rounded press-desk cards. These are measured source changes.

Built on Session 2's published shell foundation. Session 9 owns the Personal split-record extraction.

Calendar before:

![Before](https://raw.githubusercontent.com/lamontaes/Political-Game-Git/codex/session3-calendar-news/docs/codex/session3-evidence/calendar-news/calendar-before.png)

Calendar after:

![After](https://raw.githubusercontent.com/lamontaes/Political-Game-Git/codex/session3-calendar-news/docs/codex/session3-evidence/calendar-news/calendar-after.png)

News before:

![Before](https://raw.githubusercontent.com/lamontaes/Political-Game-Git/codex/session3-calendar-news/docs/codex/session3-evidence/calendar-news/news-before.png)

News after:

![After](https://raw.githubusercontent.com/lamontaes/Political-Game-Git/codex/session3-calendar-news/docs/codex/session3-evidence/calendar-news/news-after.png)

Press before:

![Before](https://raw.githubusercontent.com/lamontaes/Political-Game-Git/codex/session3-calendar-news/docs/codex/session3-evidence/calendar-news/press-before.png)

Press after:

![After](https://raw.githubusercontent.com/lamontaes/Political-Game-Git/codex/session3-calendar-news/docs/codex/session3-evidence/calendar-news/press-after.png)

## Validation and next step

Measured local checks: full typecheck, changed-file ESLint and Prettier, zero-dice, committed release declaration range and merge-tree against current main pass. The composed browser cases pass (2/2); Calendar and Campaign unit tests pass (6/6). Measured preserved clean-main failure: the original three-year run exhausted Node’s 4 GiB heap before completing its first year (about 902 seconds; exit 128). No speed comparison is established. Further year timing belongs to Session 5 under the CTO instruction. Measured 30-day opening: the canonical observer advances from January 5 to February 4, 2026, using the same random-place seed and Scarville locality. The receipt names tested source `203d4be05dca287af5d75088d6c110a8503a11e6`. The screen candidate has no changes in `src/simulation`, `src/presentation` or `data`; unchanged simulation behavior is inferred from that source boundary. The ordinary new-life walk uses Scarville, Iowa, seed `session3-kit13-20261005`, at 1920×1080. The custom legislative staff start checks that Office stays hidden without a seat. Office and Transit captures use the existing supplied recorded-member term; it does not establish ordinary election reachability. The coordinator retains merge authority.
