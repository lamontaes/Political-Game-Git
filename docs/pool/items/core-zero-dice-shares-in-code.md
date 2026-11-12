---
id: core-zero-dice-shares-in-code
title: "Seven shares written as numbers in src/core2 and src/bench code move into parameter tables"
area: core
kind: cleanup
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-core-zero-dice-shares-in-code
pr: #8417
after:
blocked-on:
lead: cto
model: sonnet
effort: medium
root: design-guards
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T00:59:59.869Z
branch: claude/pool-core-zero-dice-shares-in-code
---

**What.** Pointing the zero-dice guard at src/core2, src/bench and src/director found shares written as numbers in code. Six remain in the allowlist: SAME_SEX_COUPLE_SHARE (town-households.ts), TOWN_PART_TIME_SHARE (town-workplaces.ts), COUNCIL_SIZE_SHARES and COUNCIL_TERM_SHARES (gov-rules/typical-council-size.ts), and the 0.5 even split in electorate-places.ts and modules/campaigns.ts. The seventh, HIDDEN_SHARE in bench/scene.ts, is no longer in src. Every number lives in a parameter table with its tag, so each moves to its module's parameters with a source and spread, or is shown to be a structural one-half that the guard should not read as a share.

**Cause.** Found in code: `scripts/zero-dice-allowlist.json` holds six entries of kind `fixed-share`, naming `COUNCIL_SIZE_SHARES`, `COUNCIL_TERM_SHARES`, `SAME_SEX_COUPLE_SHARE` and `TOWN_PART_TIME_SHARE` and the 0.5 split, in `src/core2/electorate-places.ts`, `src/core2/modules/campaigns.ts`, `src/core2/gov-rules/typical-council-size.ts`, `src/core2/town-households.ts` and `src/core2/town-workplaces.ts`.

**Fix.** Move each of the five real shares into its module's parameter table with a SOURCED or ESTIMATED tag and a spread, and read it from there. For the 0.5 split, show it is structural and exempt it by name in the guard, or move it too. Delete the six allowlist entries.

**Time box.** 5 hours for one Sonnet session.

**Rules.** Every number lives in a parameter table, tagged SOURCED, ESTIMATED or TUNABLE (owner's standing rule). Research before building: a sourced value comes from a fetched page with a quote. The allowlist only shrinks. One rule, all 56 places: a share is read from the module's table, never from a named place.

**Done when.** A second session runs `npm run zero-dice` and it passes with the six `fixed-share` entries gone from `scripts/zero-dice-allowlist.json`. In a played world in a drawn place (name and seed) it reads each value from its parameter row with the tag, and the tests of the changed files pass. **On screen.** None by design: this is a check and a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Waits on.** Nothing.

**Files.** src/core2/town-households.ts, src/core2/town-workplaces.ts, src/core2/gov-rules/typical-council-size.ts, src/core2/electorate-places.ts, src/core2/modules/campaigns.ts, scripts/zero-dice-allowlist.json

**Notes.** TODO

Oct 25 audit: unblocked; core-old-engine-01-zero-dice-guard-repoint is done (PR #5832 merged).

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 00:59 UTC) on branch claude/pool-core-zero-dice-shares-in-code.
