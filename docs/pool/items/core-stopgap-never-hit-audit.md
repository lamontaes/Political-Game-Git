---
id: core-stopgap-never-hit-audit
title: "Open stopgap rows whose marker never fired in three drawn towns over two played years are checked for staleness"
area: core
kind: cleanup
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: medium
root: design-guards
lead: cto
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
branch: claude/pool-core-stopgap-never-hit-audit
---

**What.** Of 264 open stopgap rows on Oct 20, a run of three drawn towns for two played years each (buildBenchWorld, core.stopgapHits) recorded 132 as hit. Eighty rows whose marker is in a .ts file never fired, among them SG-GOV-budget-adopted-by-rule, SG-GOV-campaign-pollster-seller, SG-GOV-staff-unpaid, SG-WORLD-housing-landlord, SG-WORLD-jobs-opening-seekers and SG-GOV-justice-prosecutor-stand-in. The blind spot (module-level `stopgap()` markers were never recorded) was fixed by #5452, so the list can now be taken. For each row that never fires, check whether the fake is still reachable; resolve the row where it is not and the replacement is built. The register is now the family files under src/core2/data/stopgaps/.

**Cause.** Measured: Oct 20, three drawn towns (places and seeds not recorded; replay with `npm run speed:year -- --seed <s> --years 2`, which plays the same buildBenchWorld) for two played years (core.stopgapHits) hit 132 of 264 open rows; 80 rows with a .ts marker never fired (SG-GOV-budget-adopted-by-rule, SG-GOV-campaign-pollster-seller, SG-GOV-staff-unpaid, SG-WORLD-housing-landlord, SG-WORLD-jobs-opening-seekers, SG-GOV-justice-prosecutor-stand-in). Module-level markers are now recorded through `recordStopgapsIn` in src/core2/stopgaps.ts.

**Fix.** Re-run the three-town two-year hit list now that module-level markers are recorded, and for each row that never fires and whose fake is unreachable, delete the fake and its marker and resolve the row naming the replacement; keep any row whose replacement is not built.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Placeholders: a row is never closed by deleting it alone; it closes only because the replacement is built and shown. Replace, never layer: delete the dead fallback in the same change. One rule, all 56 places: the check runs in drawn places, not named ones. Wire to the world: an unreachable fake is shown unreachable by a played year, not by reading.

**Done when.** A second session, not the builder, plays two years in each of three drawn places (places and seeds named) and reads core.stopgapHits: each audited row is shown hit or unreachable by test, and every unreachable row's fake and marker are deleted and the row resolved in its family file under src/core2/data/stopgaps/, proven by the tripwire tests in src/core2/tooling/tripwires.test.ts.

**Waits on.** Nothing.

**Files.** src/core2/stopgaps.ts, src/core2/tooling/tripwires.test.ts, src/core2/data/stopgaps

**Notes.** Measured Oct 20 (claude). The list comes from reading core.stopgapHits after 730 days in three drawn places; to rerun it, advance a bench world two years and read the set. Making `stopgap()` record into the core as `api.stopgap` does would remove the blind spot first. Released from idle draft #5196 by the CTO, Oct 26.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-7xkkii` (2026-10-20). Cleared from the front matter and kept here.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:19 UTC) on branch claude/pool-core-stopgap-never-hit-audit.

Released (2026-11-11): Not built: it needs three drawn towns run two played years (about 80 rows with a .ts marker to check), then each never-firing fake deleted with its marker and row resolved; each deletion is a code change that needs its own proof, and a never-hit result in three towns is not proof a fake is unreachable. Better split one family file per item (src/core2/data/stopgaps/), each with its own replay. Continue on branch claude/pool-core-stopgap-never-hit-audit.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:20 UTC) on branch claude/pool-core-stopgap-never-hit-audit.

Released (2026-11-11): Re-claimed by my own next loop, not worked; see the release above (split by stopgap family file, each with its own replay). Continue on branch claude/pool-core-stopgap-never-hit-audit.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:20 UTC) on branch claude/pool-core-stopgap-never-hit-audit.

Released by next (2026-11-13): no push to claude/pool-core-stopgap-never-hit-audit since 2026-11-11 06:19 UTC, more than twice its 4-hour time box. Continue on branch claude/pool-core-stopgap-never-hit-audit.
