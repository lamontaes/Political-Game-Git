---
id: world-twins-crime-reports-flat-west-lawn
title: "Effect-web twins test sees no crime-report movement in a drawn town"
area: world
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/twins-crime-reports
pr: #6132
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T00:24:13.324Z
---

**What.** The outcome-web twins test fails on clean main with EFFECT_TWINS_SEED=27ed11060d06e388, which draws West Lawn, Pennsylvania: shifting each running cause moves no engine record for crime.reported-per-capita ('expected 0 to be greater than 0'). The laws lead found it in its gate on Oct 24 and confirmed it on main with the same seed. Either no cause that runs there reaches the crime-report measure in the test's four months, or the measure's engine misses a read of the shifted cause.

**Rules.** One rule, all 56 places: the fix must hold in any drawn place and never name a state or place in logic; an effect is a read, not a record: the crime-report measure moves only where an engine reads the shifted cause, named by record id.

**Done when.** src/core2/outcome-web-twins.test.ts passes with EFFECT_TWINS_SEED=27ed11060d06e388 and two fresh random seeds, each named in the PR body; the PR names the cause that reaches crime reports in West Lawn by record id, or shows no running cause there reaches it and the test reads that from the town's own records. **On screen.** Nothing yet: it would show on Politics → Issues and Government, and nothing there reads it.

**Files.** src/core2/outcome-web-twins.test.ts

**Notes.** TODO

Merger 0: Completed 2026-10-26 by PR #6132, merge f88eed1acde2ebaf00125e34c2c2a34286687cca, checked/pinned bb6658be406036bed015ad3adfef9931a904acef. Own scoped gate passes except the same 36 clean-main pool diagnostics. Full four-month/all-cause tests pass in West Lawn (27ed11060d06e388,1081s), fresh Bokchito (a03ac480a2a8014bb94cd2bfef4fa6dd,705s), and fresh Douglas (b99242914c887773ca8aa5d1d736a7c4,1093s): each18 shifted, none absent, government budget path exercised. Unemployment and police shifts move named crime-month records; current evidence table published. Requested done CLI was attempted but failed when workspace GH_TOKEN expired; the merge workflow independently marked the main item DONE, verified through connected GitHub. No CLI success claimed.

Merger 0: Authentication recovered at 17:02 UTC. The exact requested node/tsx pool-done command was retried successfully during the next gate launch (session 60027: "pool status done"), and main was already independently verified done. This resolves the earlier CLI transport failure; no author correction was needed.
