---
id: laws-death-tax-rate-only-terms
title: "A rate-only estate or inheritance tax must not crash on missing schedule terms"
area: gov
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/law-wiring-death-tax-terms
pr: #5744
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T19:00:45.217Z
---

**What.** A state can adopt an estate or inheritance tax through a bill that sets only its rate. The returned death-tax fix prevents the first estate from reading a missing exemption or heir-class schedule. Complete its bounded proof without the new world test silently timing out at the default limit, retaining the declared rate-only stopgap until full bill terms replace it.

**Rules.** Wire to the world: the adopted law changes the estate or heir tax calculation and the paying treasury record. Placeholders: retain the registered rate-only schedule assumption with its code marker rather than treating missing terms as sourced facts. No dice: the law rate and estate amount determine the tax, never a roll.

**Done when.** A named test draws a state with no baseline death tax, adopts both taxes by rate only and proves the state and estate or heir record ids and the expected positive tax amounts. It completes within a measured limit or uses a lighter positive fixture beside its drawn-place case. The rate-only fallback has a retained registered stopgap and marker, and the changed-file checks pass.

**Files.** src/core2/laws-death-taxes.ts, src/core2/laws-death-taxes.test.ts, src/core2/data/stopgaps.json

**Notes.** Sent back 2026-10-23 from PR #5744 (branch claude/law-wiring-death-tax-terms): the new rate-only death-tax test hit the default 30-second timeout and no later commit supplies the measured limit or lighter proof; finish on that branch, merge main into it first.

Red on the Train, Nov 15 (T54, seen on Train c43bf7e0 bare and on #9117's gate): "a state that adopts a death tax by setting only a rate taxes the whole amount at that rate" fails at src/core2/laws-death-taxes.test.ts:191 for US-KY, `expected false to be true`: the government-heir stopgap marker was not hit for Kentucky's starting inheritance-tax row although that row's `governmentHeir` carries a reading. Run seed a7a8fcad003baedeefbe8273a7fdd56fdd9a6ebb4962e9f6ef189b20caaf3784 (GOLDEN_PATH_SEED), US-OH place 3982642. Cause not traced.
