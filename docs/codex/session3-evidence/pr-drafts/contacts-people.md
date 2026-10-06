# Readable people names and glass Contact dialogs

Before: Measured in the before capture: People names have thick pale outlines; Contact uses a rounded frame with a bright inner edge. Avatar backgrounds are pale, and web initials sit against an edge.

After: Measured in the after capture: People names have dark outlines, and Contact uses the shared glass frame with a fine brass edge. Avatar backgrounds use glass, and web initials are centered.

Publication remains held until Session 1 passes the shell prerequisite.

## Replacement and proof

Replaces: `src/player/people-web.css:198` replaces the pale name outline with an iron outline. `src/player/contacts.css:131` replaces the rounded, bright-inset dialog styling with the shared frame. `src/player/player.css:4759` replaces the old pale portrait fill and border with shared glass and hairline tokens. `src/player/people-web.css:178` restores grid centering in the existing portrait rule. These are measured source changes.

Built on Session 2's published shell foundation. Session 9 owns the Personal split-record extraction.

People before:

![Before](https://raw.githubusercontent.com/lamontaes/Political-Game-Git/codex/session3-contacts-people/docs/codex/session3-evidence/contacts-people/people-before.png)

People after:

![After](https://raw.githubusercontent.com/lamontaes/Political-Game-Git/codex/session3-contacts-people/docs/codex/session3-evidence/contacts-people/people-after.png)

Contact before:

![Before](https://raw.githubusercontent.com/lamontaes/Political-Game-Git/codex/session3-contacts-people/docs/codex/session3-evidence/contacts-people/contact-before.png)

Contact after:

![After](https://raw.githubusercontent.com/lamontaes/Political-Game-Git/codex/session3-contacts-people/docs/codex/session3-evidence/contacts-people/contact-after.png)

Home before:

![Before](https://raw.githubusercontent.com/lamontaes/Political-Game-Git/codex/session3-contacts-people/docs/codex/session3-evidence/contacts-people/home-before.png)

Home after:

![After](https://raw.githubusercontent.com/lamontaes/Political-Game-Git/codex/session3-contacts-people/docs/codex/session3-evidence/contacts-people/home-after.png)

Personal before:

![Before](https://raw.githubusercontent.com/lamontaes/Political-Game-Git/codex/session3-contacts-people/docs/codex/session3-evidence/contacts-people/personal-before.png)

Personal after:

![After](https://raw.githubusercontent.com/lamontaes/Political-Game-Git/codex/session3-contacts-people/docs/codex/session3-evidence/contacts-people/personal-after.png)

## Validation and next step

Measured local checks: full typecheck, changed-file ESLint and Prettier, zero-dice, committed release declaration range and merge-tree against current main pass. The composed browser cases pass (2/2); Calendar and Campaign unit tests pass (6/6). Measured preserved clean-main failure: the original three-year run exhausted Node’s 4 GiB heap before completing its first year (about 902 seconds; exit 128). No speed comparison is established. Further year timing belongs to Session 5 under the CTO instruction. Measured 30-day opening: the canonical observer advances from January 5 to February 4, 2026, using the same random-place seed and Scarville locality. The receipt names tested source `203d4be05dca287af5d75088d6c110a8503a11e6`. The screen candidate has no changes in `src/simulation`, `src/presentation` or `data`; unchanged simulation behavior is inferred from that source boundary. The ordinary new-life walk uses Scarville, Iowa, seed `session3-kit13-20261005`, at 1920×1080. The custom legislative staff start checks that Office stays hidden without a seat. Office and Transit captures use the existing supplied recorded-member term; it does not establish ordinary election reachability. The coordinator retains merge authority.
