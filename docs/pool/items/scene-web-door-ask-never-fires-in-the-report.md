---
id: scene-web-door-ask-never-fires-in-the-report
title: "The scene web reports door-ask as fired 0 in every drawn year because its played year never canvasses"
area: words
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: low
root: rc2-done-from-records
source: added with npm run pool -- add
claimed-at:
branch: claude/pool-scene-web-door-ask-never-fires-in-the-report
---

**What.** The scene web (npm run scene-web) counts a situation type as fired when it plays in a watched year. door-ask is the scene of the player knocking on a door on their own canvass, but the report's played year never has the player canvass, so the row always reads 0 fired even though the scene exists and has a test. A domain row cannot meet its done line (fired in a played year) while the report cannot see it. Guards: the scene of the player knocking on a door on their own canvass, which the scene web report must count so that a broken door scene shows as zero and not as untested.

**Cause.** Measured: npm run scene-web on Wheat Ridge, Colorado (0884440), seed 0e3f306ea1b7271286ee37f35d841492115e1abb, and on McDermitt, Nevada (3244000), seed b7dda5f34d5eab0c10e2a0c626916ddbaa3171fc, both list the two door-ask rows with 0 fired, while src/director/door-ask-scene.test.ts shows the scene plays as the player's ask answered from the knock. Why the report cannot see it (no canvass in its year) is inferred from the type being player-asked, not traced.

**Fix.** In scripts/scene-web/build.ts, find where the played year is run, and have the year include one canvass day for the watched player (through the campaign engine's own door act) so a campaign.door moment exists; then door-ask counts as fired. Prove it by running the report on two drawn places (place and seed named) and reading door-ask above 0 in both, and that no other row's count changes by more than the canvass days.

**Time box.** 3 hours

**Rules.** One engine: the canvass goes through the existing campaign door act, never a typed record. No dice. Report the place and seed in the PR body.

**Done when.** A second session runs npm run scene-web on a place and seed the builder did not choose and reads the door-ask rows above 0 fired, with the place and seed named in the report header. This is a report, so no screen of the game applies.

**Waits on.** Nothing

**Files.** scripts/scene-web/build.ts, docs/reports/scene-web.json

**Notes.** Released by next (2026-11-11): no push to claude/pool-scene-web-door-ask-never-fires-in-the-report since 2026-11-11 04:05 UTC, more than twice its 3-hour time box. Continue on branch claude/pool-scene-web-door-ask-never-fires-in-the-report.
