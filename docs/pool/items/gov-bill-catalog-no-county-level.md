---
id: gov-bill-catalog-no-county-level
title: "The bill catalog lists nothing at county level, and the seat screen gives a county board the city catalog"
area: gov
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/pool-gov-bill-catalog-no-county-level
pr: #8683
blocked-on:
source: added with npm run pool -- add
after:
lead: governing
standard: 2
model: sonnet
effort: high
root: none
checked: fable 2026-11-10
claimed-at: 2026-11-11T06:00:24.863Z
---

**What.** The county board's bill catalog is answered from the city jurisdiction. The item first found that `src/core2/data/legislature/bill-catalog.json` listed nothing at the county level, so `billCatalog(api, "county")` was empty in every place: in a drawn Black Sands, Hawaii world (key 1502832, world seed 1dbcd755...a2b4) the county board's catalog held no entry while the state's held 58 allowed questions (measured Oct 26). On main today the JSON lists `county` among its `levels` and the seat screen's `menusFor` (`src/bench/legislature.ts`, line 598) passes a county body through as `county`. What remains is whether a county board now drafts from county-level entries with county-level authority, or still from the city's. Seen: the bill-drafting menu on a county board seat, which lists county questions at county authority instead of city ones.

**Cause.** Found in code: `src/core2/bill-catalog.ts` line 73 maps `level === "county" ? "city" : level` for the default jurisdiction, so a county catalog is looked up under the city jurisdiction; county authority for a policy question is read from the county column (`policyAuthority(api, p.question, "county")`, lines 104 to 108) but the jurisdiction is not the county's. The JSON now names county in each entry's `levels`.

**Fix.** Replay `billCatalog(api, "county")` in Black Sands, Hawaii (key 1502832) and two more drawn places with a county board. Resolve the county body's own jurisdiction from the county column of `src/core2/policy-authority.ts` instead of the city fallback, and delete the fallback in the same change; make the county catalog list the questions, amounts and budget lines a county may pass.

**Time box.** 6 hours for one sonnet session.

**Rules.** One rule, all 56 places: a county body's catalog and its authority come from the county column of the powers catalog, never from a city's. Placeholders: the city fallback is replaced, not layered. Wire to the world: a county bill drafted from the catalog is enacted and read by an engine in a played world.

**Done when.** A second session plays a world (`buildBenchWorld`) in a drawn place with a county board (Black Sands, Hawaii, key 1502832, and one more place, seeds named), opens the county board's bill screen, and sees county-level entries with county authority. A county bill drafted from it passes and is read by another engine, named by record id, and `src/director/government-scenes.test.ts` (removed) sets aside no county board for lack of a catalog.

**Waits on.** Nothing.

**Files.** src/core2/data/legislature/bill-catalog.json, src/core2/bill-catalog.ts, src/bench/legislature.ts, src/core2/policy-authority.ts

**Notes.** Measured Oct 26 in Black Sands, Hawaii (key 1502832, world seed 1dbcd755...a2b4): county 0 catalog entries; city 1 allowed, 52 level-lacks-power, 5 state-preempts; state 58 allowed.
