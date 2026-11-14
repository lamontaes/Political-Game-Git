---
id: people-protected-traits-on-record-part-1-race-on-record
title: "A household's race and origin is drawn from its town's own Census shares, not its state's"
area: people
kind: wiring
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: sonnet
effort: medium
root: design-one-model-two-tiers
source: split from people-protected-traits-on-record in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-people-protected-traits-on-record-part-1-race-on-record
---

**What.** The owner ruled on Oct 24 that race goes on each person's record, drawn from the place's Census shares (OWNER-DECISIONS.md, "Sex and race on the record"). Every person already carries one, `looks.origin` (src/core2/opening-origin.ts), and counted members keep it (src/core2/counted-groups.ts `originIx`). What is wrong is where the shares come from: the state's adults, so a town that is mostly Hispanic in a mostly white state is drawn mostly white. Draw it from the town's own ACS shares instead. Seen: the faces of the people a player meets in a town follow that town's own mix, not the state's.

**Cause.** Found in code: `originShares` in src/core2/opening-origin.ts (stopgap SG-LIVES-origin-state-shares, line 64) reads only data/source/census-voting-registration/corpus.json, the CPS 2024 state table, and `withOrigins` calls `originAt(stateKey, …)` with the state key from `placeStateKey`, so the place never enters the draw. The repository holds no place-level race table. The writer, the household sharing, the kin rule, `childOrigin` and the counted groups' `originIx` are all correct and stay; the earlier Fix (a new race field on PersonInput) would be a second writer, and moving the value out of `looks` changes nothing a player sees, so it is not done. The later readers (part 3, tenant picks; part 4, the ban) read `looks.origin`.

**Fix.** Follow the household-mix pattern exactly (scripts/source/regional-money/export-household-mix.ts, src/core2/household-mix.ts, data/source/acs-household-mix/). (1) Download https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/acsdt5y2024-b03002.dat (83 MB, reachable from a cloud session), keep the header and the nation (0100000US), state (0400000US) and place (1600000US) rows, and commit the cut to data/source/acs-race-origin/raw/acsdt5y2024-b03002.dat with a lock file shaped like data/source/acs-household-mix/regional-artifact-lock.json (full length and sha256, url, vintage, derivation). (2) Write scripts/source/export-race-origin.ts and an `export:race-origin` npm script that writes src/core2/race-origin.generated.ts: per geography the five counts, white = B03002_003 (white alone, not Hispanic), black = _004, asian = _006, hispanic = _012, other = _005 + _007 + _008 + _009; with `-- --check` failing when stale. (3) Change `originShares` to take the place key and return the place's shares, then the state's, then the nation's, with a basis like `HouseholdMixBasis` (look the place up the way src/core2/household-mix.ts does with `corePlaceByJurisdictionId`); `originAt` and `withOrigins` pass `input.placeMetadata?.placeKey`. This also gives "other" a real share, which the CPS table did not. (4) Kin outside the town keep the resident relative's origin, as now. (5) Update the stopgap SG-LIVES-origin-state-shares: what it fakes is now only that a couple shares one origin (the joint table); keep it open for that. Update the header comment of opening-origin.ts. Delete nothing else; the CPS read stays only if another reader uses it, otherwise it goes.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the shares come from each place's row, the state's or the nation's where a place has none (Guam, the USVI, American Samoa and the Northern Marianas have no ACS place rows, so they take the nation's unless a territory row exists), and the basis is recorded so a fallback never reads as the town's own. Estimate, never UNKNOWN. Seeded generation of who exists may draw origin from shares; nothing else reads it as a roll. One model, two tiers: counted members already carry the drawn origin.

**Done when.** A second session builds `buildBenchWorld` in a drawn place whose ACS place shares differ from its state's by at least 20 points in one group (the builder lists three such places in the PR body, with their keys), and in a drawn ordinary place, names both with their seeds, and sees the households' `looks.origin` counts come within sampling of the place's own shares, not the state's, listed by household record id; and in dev mode the faces in that town look like that mix. The existing src/core2/opening-origin.test.ts is extended to check a place's shares against its generated row and the fallback basis for a territory.

**Waits on.** Nothing.

**Files.** src/core2/opening-origin.ts, src/core2/opening-origin.test.ts, src/core2/household-mix.ts, scripts/source/regional-money/export-household-mix.ts, src/core2/data/stopgaps/lives.json, package.json, scripts/source/export-race-origin.ts (new), src/core2/race-origin.generated.ts (new), data/source/acs-race-origin/raw/acsdt5y2024-b03002.dat (new), data/source/acs-race-origin/regional-artifact-lock.json (new)

**Notes.** Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 03:13 UTC) on branch claude/pool-people-protected-traits-on-record-part-1-race-on-record.

Released (2026-11-11): Cause differs from code: each household already has a race-and-origin drawn from Census shares (opening-origin.ts, looks.origin) and counted members carry it (counted-groups.ts originIx); the Fix would add a second writer. Continue on branch claude/pool-people-protected-traits-on-record-part-1-race-on-record.

Nov 11 (cause finder for Fable B): the race writer exists and is right; only its shares are the state's. Traced `withOrigins` → `originAt(stateKey)` → `originShares`, which reads the CPS state table alone (opening-origin.ts line 64). The ACS place file B03002 for 2020-2024 is published in the same summary-file folder the household mix was cut from (HTTP 200, 83 MB), so the fix copies that pattern. Moving the value out of `looks` was dropped: no player sees it, and the readers in parts 3 and 4 can read `looks.origin`. Part 2 is already dropped.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 05:17 UTC) on branch claude/pool-people-protected-traits-on-record-part-1-race-on-record.

Released by next (2026-11-13): no push to claude/pool-people-protected-traits-on-record-part-1-race-on-record since 2026-11-11 03:14 UTC, more than twice its 4-hour time box. Continue on branch claude/pool-people-protected-traits-on-record-part-1-race-on-record.

Nov 14 (Account lead thread "Add race and origin by town"): built on branch claude/project-thread-j574e7. The Census hosts are blocked in build containers, so instead of ACS B03002 the place counts are the 2020 Census redistricting file (P2), republished state by state on GitHub (henrydavidge/redistricting-data-2020), cut to 31,861 places in the 50 states, DC and Puerto Rico, with North Carolina checked against a second published copy. Exporter `npm run export:place-race-origin`; reader gives place, then state, then nation, and names the basis. Counts are all residents, the state fallback is adults. Left open on the stopgap: island-area villages and mixed couples. A newer ACS B03002 cut could replace the raw file later.
