# Board

Only the CTO writes this file. Each session keeps its own status file in this folder (see "The team" in `AGENTS.md`).

## Who owns what

| Session     | Status file | Branch                                                 | Model        | Starts             |
| ----------- | ----------- | ------------------------------------------------------ | ------------ | ------------------ |
| OPUS-CORE   | `core.md`   | `opus-core`, from `pool/M0-core-pieces`                | Opus, high   | Mon Oct 12, 3 a.m. |
| OPUS-GOV    | `gov.md`    | `opus-gov`, from `pool/M1-laws` plus RULES-2's shelves | Opus, medium | Mon Oct 12, 3 a.m. |
| OPUS-PEOPLE | `people.md` | its current `pool/P15-people-5`                        | Opus, high   | Mon Oct 12, 3 a.m. |
| OPUS-PLAY   | `play.md`   | `opus-play`, from `pool/M0-bench`                      | Opus, medium | Mon Oct 12, 3 a.m. |
| OPUS-WORLD  | `world.md`  | `opus-world`, from `pool/M1-macro`                     | Opus, medium | Mon Oct 12, 3 a.m. |
| FIXER       | `fixer.md`  | `fixer/<bug>`, one per bug                             | Sonnet, high | Mon Oct 12, 3 a.m. |
| OPUS-TRAITS | `traits.md` | `opus-traits`, from `pool/P15-people-5` + `main`       | Opus, high   | Mon Oct 12         |

OPUS-TRAITS owns data/content/trait-act-pulls.json and trait coverage (from Oct 12).

All six start at 3:07 a.m. Monday from one-off routines on the coordinator account.

## Owner rulings, Oct 12, 7:30 p.m.: top priority for every session

The owner, after the first one-year runs of the played world: "the point is to get this actually working in the game." These come before anything else on this board.

1. **Everything built runs in the played world.** Nine finished modules were never installed in `buildBenchWorld`: world-legislating (other governments pass their own laws), outcome-web, interest-groups, world-races, ballot-measures, recalls, meetings, press and constituent-cases. FIXER-WIRE-ALL-MODULES is switching them all on (branch `fixer/wire-all-modules`) with a guard test that fails when a module under `src/core2/modules` is not installed or explicitly exempted. Your item is not done until it runs in `/play`.
2. **OPUS-CORE and OPUS-GOV: officials are people from the opening.** Every member of Congress, every governor and a layer of state legislators (at least each chamber's leadership and the town's own delegation, the rest by the sample rule in 4) are generated as people during the initial loading, with traits, views, careers and relationships, not a seat with a party label (retire SG-GOV-official-identity-only). The Political Process generates about 600 politicians at the start; same idea.
3. **OPUS-GOV: votes vary and come from many influences.** Each member's own views and traits, their district and constituents, party and leadership pressure, interest groups and donors, relationships and deals, ambition and the next election, and the press. An independent who caucuses with a party usually votes with it; a truly independent one decides from the reasons they are independent. Nothing hard-coded: no fixed tallies, party-line stand-ins or lean constants in place of people. (Today every federal vote is a party line from the 2026 roster, 219 to 214 and 55 to 45 in every game, and independents vote with the Republicans because their lean is 0.)
4. **OPUS-CORE: a representative population, not only the player's circle.** The full people are a representative sample of the town (ages, incomes, jobs, households, neighborhoods, views), each standing for a weighted share, plus the player's circle. The counted rest drifts too: births, deaths, moves in and out, aging and job changes applied to the counts by rate, so the town's population changes year to year (today it never changes by one person).
5. **OPUS-CORE: running memory stays small.** The game keeps every log record: Juliaetta, Idaho reached 7 GB and crashed in April 2029, about 600 MB per game month. Keep a condensed index of what the game needs to know (current state, each person's key facts, recent detail) and summarize or drop old detail; the speed guard measures memory over a three-year run. Saves stay the world's recipe plus the player's commands (M7-02).
6. **OPUS-GOV and OPUS-PEOPLE, seen in the one-year runs:** no births in a year in Beverly, Massachusetts; the federal budget fails at Senate cloture in every game; a statewide vote follows about 32 named townspeople.

## Audit priorities (owner, Oct 12, 9:15 a.m.): fix before building on

The CTO's code audit (`docs/reports/audit-2026-10-12/`) found that many items ticked overnight are first slices, work only in tests, or aren't wired into `/play`. **The owner's ruling: each session fixes its audit findings first (correctness bugs, then the thin spots), then continues.** A checklist item counts as done only when it works in `/play` and its test covers more than one narrow case.

- **OPUS-CORE (audit 4):**
  1. Replace the outside-buyer residual (`max(floor, 1 − local/projected)`, a top-up) with real outside demand.
  2. Explain or fix the cash growth (Absecon $59.8M → $202.8M).
  3. With WORLD, switch off the core stand-ins (outside rent, owner payouts, unplaced pay) when the WORLD engines run.
  4. Wire click-to-fill (`/api/resident`, `/api/scene` and `/api/talk/open` throw for counted people).
  5. Measure a whole year on `/play` with all modules, record it, and make the speed guard time that path.
  6. Fill-in from the seed; no past until filled in.
- **OPUS-GOV (audits 2 and 3):**
  1. Primaries with the wider electorate.
  2. A next contest each cycle (one contest per seat ever blocks step 11).
  3. Unreached voter bands must not vote on platforms they never heard.
  4. No winner on 0 votes.
  5. Off-cycle and midterm turnout.
  6. Independent filing terms; formula fees.
  7. Federal acts take effect.
  8. City income tax collects (the "percent" unit).
  9. Council authority (no SNAP or Medicare tax).
  10. Ties by real rules.
  11. Deals: no effect when declined, recorded, with a cost.
  12. The player casts their own vote and chooses to sign or veto.
  13. Breadth: 6 of 74 policies reach people. Wire the rest and test every policy.
  14. President: an Electoral College and a joint ticket.
- **OPUS-PEOPLE (audit 1):**
  1. Conversations: distinct choices, four guaranteed; lies change beliefs and can be found out by others.
  2. Talking records contact and closeness, and passes news.
  3. Register the speech module and "bring it up" in play.
  4. News: what the player heard, outlets, trust, other places.
  5. Journal lines for deaths, marriages, elections and filing; the death look-back in play.
  6. Schools by era.
  7. Template banks fire their stopgaps until composed from mined speech.
- **OPUS-PLAY (audits 1–4):**
  1. Remove the office list and File buttons; the filing visit plus overlay only.
  2. Platform and party at filing.
  3. Show schools, real relation words and action names (no raw keys).
  4. Calendar jump, and say which stop ended a skip.
  5. Fix the Lie control (tip only on a lie, soft red, no word "Lie").
  6. Use the closures path in the bench opening.
  7. Store screenshots by Friday.
- **OPUS-WORLD (audit 4):**
  1. Counted workers quit, look and are laid off.
  2. Double counting of rent and owner pay (with CORE).
  3. M1-02 re-proved in a drawn town with town feedback and the town bank's line.
  4. Dwellings, prices, buying, mortgages and property tax.
  5. Founders and loans from counted households.
  6. Settle the eviction sources (26 vs 51 of 56).

## Next, after your audit items (owner's questions, Oct 12, 9:20 a.m.)

The owner asked what history, meetings, groups, places, interviews and laws the game has. The CTO checked the code (answers: https://claude.ai/artifact/NV5EmoFMjrYeDkMZfg5CqG). These are the gaps. Each session takes its own once its audit items above are fixed.

- **OPUS-GOV:**
  1. Campaign interviews: the place's real outlets (newspaper, TV, radio) from its media data; you ask for an interview or a reporter asks you; questions come from the race's issues and your record; answers go on the record and into the news; readers and viewers react. Start from the old game's logic (`src/simulation/press-interviews.ts`); words from OPUS-PEOPLE.
  2. Public meetings you attend: council and county commission meetings with public comment, hearings you can testify at (the `testify-at-hearing` act is a stopgap never offered), town halls and debates.
  3. The bill catalog (`docs/design/legislative-content-menus-v1.md`, all 18 subject menus) reachable from the bench, plus your own vote and signing or vetoing when you hold those offices.
  4. Load the 59 researched yes/no policy answers as law rows.
  5. Pre-start history: past elections and officials' careers of real length, so terms don't all start on the opening day (M1-14 part 2, with OPUS-CORE's run).
- **OPUS-PEOPLE:** group kinds as data with each town's counts from real sources (clubs, PTAs, service clubs, veterans' posts, neighborhood associations, volunteer groups, leagues); joining or switching parties for a reason; church and club gatherings; the words for interviews.
- **OPUS-PLAY:** a "Go to" list of the town's places (from its organizations and the art library), showing who's there and what you can do; meeting scenes using the existing art (council chamber, school board room, rally stage); open `world-legislating` in `src/bench/world.ts` so councils, legislatures and Congress act on their own; the town visibly changing after a law passes.
- **OPUS-WORLD:** a 20-year drift report in random places with town feedback on: every exit from the 1990–2026 bands with when, how far and its cause; business founding and closures before the start (M1-14 part 2).
- **OPUS-CORE:** the pre-start history run (adopt #3961's `runPreStartHistory`, economy, people, then governments) so the other sessions' history passes plug in.
- **FIXER:** a script that lists every open stopgap by session and kind (behavior, figure, text, art) from `src/core2/data/stopgaps.json` and `src/director/data/stopgaps.json`, so the CTO can keep "Open stand-ins" below complete.

## Order of work right now

1. **OPUS-CORE: speed first** (bookkeeping off in play, no copying of worker memory each shift), then the two-level population, then the business closures.
2. **OPUS-PEOPLE:** steps 1 and 2 (a life at 18, meeting people) ready to play, people in the two-level world with OPUS-CORE, then the English engine on the new core (conversations, scenes, the journal).
3. **OPUS-PLAY:** the bench on the full stack, the tagged art library wired into every scene (owner, Oct 12: use the 1,000+ images we have, best match, no waiting for perfect), and the first evening build.
4. **OPUS-GOV:** laws in force, then offices and seats, then filing (step 3), campaigning (step 4), and elections (step 5) that read each candidate's record (step 11).
5. **OPUS-WORLD:** the national economy, then state and metro.
6. **FIXER:** main's red checks (the release build; the two instruction-file tests from the drifted skill folders; merging main into the speed map, #3975); then open work below whenever no bug is assigned.

After its checklist, every session keeps going through its area's specs in every later milestone (`docs/roadmap/later-specs-draft.md`), then the open work below.

## Old engine removal (owner's top priority for FIXER, Oct 12; CTO assignment 4:05 p.m.)

- **Phase 1:** FIXER's #4036 deletes about 1,880 old files the new game never reaches. It lands right after the game screen (#4038), which follows GOV (#4037). FIXER keeps #4036 merged with main until then.
- **Phase 2:** about 1,600 old files stay only because new code still imports them. Each owner switches these imports to the new core or its own folders. Then FIXER deletes the rest:
  - **OPUS-PLAY:** `src/bench/scene.ts` uses the old presentation appearance engine (layered people), backdrops and dress code. Switch scenes to the whole-figure library in `art/people-whole` (owner, Oct 12: these are the only people). Read backdrops through `art/backdrops/manifest.json`.
  - **OPUS-GOV:** `src/rules/legislatures` and `src/rules/economy` use types and rules from `src/simulation`. Move what they need into `src/rules` or `src/core2`.
  - **OPUS-CORE:** `tests/golden-path/place.ts` and `tests/fixtures/*` use `src/simulation/life-places`. Read places through the core's own place data.
  - **FIXER:** the map preview (`src/maps/MapPlaceContext.tsx`, `map-preview-entry.tsx`, `map-preview.html`) and the old art tooling (`scripts/art-asset-factory`, `scripts/dev-lab/artbench*`, `scripts/appearance`, the `artbench-bridge` in `vite.config.ts`) go with the old people engine.
- **Rule for everyone:** no new imports from `src/simulation`, `src/presentation`, `src/player` or other old folders. When your last old import is gone, write it in your status file.

## Researched stand-in numbers to apply (CTO, Oct 12, 4:10 p.m.)

FIXER checked all 111 rows of `data/research/stand-in-figures-2026-10-12.json`. 67 have a researched value to set, and each sits in a file its owner is changing, so each owner applies its own rows. FIXER's `docs/coordination/fixer.md` lists them under "Needs from other sessions": OPUS-CORE 37 (most in `src/core2/data/parameters.json`), OPUS-PEOPLE 19, OPUS-GOV 6, OPUS-WORLD 5. Apply the recommended value with its source, retire the stopgap row and marker, and tick it in your status file. This is part of M7-03 (zero placeholders).

## Carry over from old PRs (CTO audit, Oct 12, 4:15 p.m.)

An audit of the 204 old open PRs found that most are old-engine only. These pieces are unique and belong in the new core. Take them from the named PR's branch (`gh api repos/lamontaes/Political-Game-Git/compare/main...<branch>`). Re-port them; don't merge the old PR. Details are in `cto-notes/stale-pr-audit-2026-10-12.md` on the CTO's machine; ask the CTO for any row.

- **OPUS-GOV:**
  - Research with no consumer yet: presidential-rules.json, presidential-placeholder-ledger.json and state-reference.json (#3904); council-meeting-intervals.json (#2880); chamber-leadership.json (#3788); citizen-measure-change-back.json (#2497); poll-interview-prices.json (#2486; it can replace the $30 poll stopgap).
  - Law amounts to re-port into the `starting-law-2026/*` shards: #2200 (fiscal), #2217 (transportation mileage fees), #2221 (civil-family-community), and #2229 with #3575 (government-operations; dedupe the two).
  - Decide whether `src/rules/campaigns/**` (#3951) and `src/rules/governing/**` (#3952, executive acts) have anything your core2 modules lack.
- **OPUS-PEOPLE (with OPUS-CORE):** history-people.ts, opening-history.ts, the deep-past `fromInclusive` window and `src/core2/data/history/*` (#3961), for history back to 2000. Also the views research notes (#3965).
- **OPUS-WORDS:** the debt-notice (#3791), lie-and-tell (#3843) and government-form (#3909) banks. Compare life-story (#3834) with journal.json, and presidential-address (#3913) with address.json, before carrying either.
- **OPUS-PLAY:** `art/backdrops/staging.json` spots main lacks; carry them by hand: courtroom seats (#3442), classroom (#3492), diner (#3504), polling place (#3548), convention hall and rally stage (#3567, #3796), debate stage (#3531), office (#3547).
- **OPUS-WEB:** the births-level link marked unsupported in outcome-web data (#3842). Decide whether `src/rules/outcome-web/**` (#3933) adds anything.
- **OPUS-CORE and OPUS-WORLD, when the engines start:** jury, disaster, birth-citizenship, employer-pay and starting-cohort research (#3784); crime severity (#3694); federal housing estimates (#3767); occupation entry requirements (#3772).
- **Features the old engine had and the new core lacks** (re-spec, nothing to copy):
  - GOV: executive acts, committee assignments, leadership races, public meetings, press interviews, Article V amendments and petition circulation.
  - PEOPLE: home and school presence at life start.
  - PLAY: the Options challenge control.
  - CORE: disasters and hazards.

## Merge order

The core first, then government, people and world on top, then the evening build. The CTO merges; nobody merges their own work. The core onto main needs the owner's approval.

## Open work anyone can take

The whole game gets built, not just tonight's list (owner, Oct 12; "No stopping" in `AGENTS.md`). A session whose own list is done takes from here: write "Taking <item>" in your status file before starting, build it in files of its own on your branch, and the CTO records it here at the next check-in.

- **Golden-path runner, FIXER next (CTO, Oct 12, 6:30 a.m.):** the PR suite is near its 300 s budget (GOV 252 s, PEOPLE 288 s, more specs coming), and most of each spec's time is process startup and module loading. Change `tests/golden-path/runner.mjs` to run the registered vitest specs in one process. If one process still runs over, raise the PR budget to 600 s in the same PR and say so. Never drop or trim a check to fit. Pillars keep registering their specs.
- **M1-13 Other places, coarser:** other places' populations and views change from their own conditions, and their public events are recorded for the news.
- **M1-14 History before your start:** a new game opens on its start date with dated life events, the economy's recent path, laws' dated changes and prior budgets.
- **M7-04 Updates and bug reports:** in-game bug reports with logs, and crash reports.
- **M7-05 Legal check:** no real politicians anywhere; real places, schools and institutions, data, photo and art licenses checked and listed.
- **Specs marked "anyone free"** in `docs/roadmap/later-specs-draft.md` (staff, interest groups, constituent cases, other governments legislating, Congress and president), when their owner hasn't started them: check the owner's status file on its branch first.

## Open stand-ins

The CTO lists every registered stand-in here, by session, at each check-in (owner, Oct 12): what it fakes and which session's work replaces it.

**Count, Oct 12, 9:40 a.m. (CTO, from the code):** about 180 open in what the bench runs: 159 open rows on `opus-play` (91 simplified rules, 65 figures, 2 text, 1 art; 8 resolved) plus 19 in `src/director/data/stopgaps.json` (3 rules, 11 figures, 5 text). The list below is the earlier, partial one; the full list by session replaces it once FIXER's script lands.

As of Oct 12, 4:25 a.m.:

- **OPUS-GOV, waiting on OPUS-CORE:**
  - `SG-GOV-wage-floor-rate-write`: the laws module rewrites underpaid jobs' hourly rates on the minimum wage's date, until CORE has a pay-change API.
  - `SG-GOV-official-identity-only`: state and federal officials are identities only, until CORE's fill-in builds them.
- **OPUS-WORLD, waiting on OPUS-GOV:** `SG-WORLD-board-appointments`: central bank seats are filled at the opening, until GOV's appointments (nominate and confirm).
- **Own later items (no wait on others):**
  - GOV: `SG-GOV-special-election-appointee` until elections; `SG-GOV-term-end-estimate`.
  - WORLD: `SG-WORLD-credit-line-stand-in` until banks; `SG-WORLD-macro-*` estimates.
  - PEOPLE: journal templates until composed from mined speech; `SG-P15-school-assignment` until homes have locations.

## Open requests between sessions

- **Core requests (4:22 a.m.):** seven requests to OPUS-CORE collected on #3999 (WORLD's api v11/v12, GOV's pay-change API and opening pay from the start date's law, fill-in for named officials, PEOPLE's `peerCohortSize`, PLAY's own-choice resume, speed numbers).
- **Bench screens (4:23 a.m.):** six ready-to-wire screens for OPUS-PLAY on #4002 (steps 1 and 2, My life, who governs you, law here, the national economy).
- **PEOPLE ↔ GOV:** GOV wants officials' stances with reasons from PEOPLE's views engine (on #3956).
- **OPUS-PEOPLE → OPUS-PLAY (Oct 12, 3:36 a.m.):** bench screens for step 1 (the 18-year-old's family, schools and the record behind each fact) and step 2 (the circle, each meeting, why a tie grew closer). The data is `pastFacts`, `knownIds` and each relationship's `latestChange` on `pool/P15-people-5`. PLAY's bench item already brings that branch in.
- **OPUS-PEOPLE → CTO, answered (3:40 a.m.):** the PR suite is at about 288 s of its 300 s budget. Keep M0-06 and M0-07 in the PR suite; it's the check that protects steps 1 and 2. Load each place's data once per suite run instead of once per check. If the suite still passes 300 s, raise the PR budget to 450 s in the same PR and say so; don't move the checks to nightly.
- **OPUS-WEB needs measures (Oct 12):** the outcome web runs 116 of its 221 researched links on the new core (`src/core2/modules/outcome-web.ts`); the rest wait on measures listed with their links in `src/core2/data/outcome-web/coverage.json` (`measuresWanted`). Each pillar can also read the web's factor on a measure it sets itself with `outcomeWebFactor(api, placeId, measure)`.
  - OPUS-WEB needs measures from OPUS-GOV (48 measures, 65 links): school records (graduation, test scores, years completed), pretrial detention, election results and incumbent votes, budget lines (disaster preparedness, parks), program dollars (child benefit, EITC), federal bill terms (defense, deficit, farm payments, rail), and the state minimum wage as a measure (`labor.minimum-wage-change-pct`, `labor.minimum-wage-to-median`). Also: elections should read turnout's factor (`voting.turnout-pct`).
  - OPUS-WEB, seen while testing, for OPUS-WORLD: in Hawthorne, New Jersey (place seed `speed-oct12`, purpose `outcome-web-speed`, two-level, world modules), the housing review stops the run on March 6, 2021 with "Institutional work must be placed on an unprocessed future date" (`housing.ts:380`), with or without the web.
  - OPUS-WEB needs measures from OPUS-WORLD (26 measures, 36 links): evictions, home prices and rent as factors their engines read, household income and poverty by place, past-due debt, employment rate, low-wage jobs, real income growth. Also: prices and median earnings should read the web's factor (`household.prices`, `labor.median-earnings`).
  - OPUS-WEB needs measures from OPUS-PEOPLE (27 measures, 32 links): health coverage per person, mortality, local newspapers, births by tenure, and each person's exposure records for the person-level links (years covered, years in a better area, childhood SNAP years). Also: renewal should read births' factor (`births.rate`).
  - OPUS-WEB asks OPUS-PLAY: load `OUTCOME_WEB_MODULE` next to the world modules in the bench and the evening build, so the owner sees place outcomes and each person's outcome record.
  - OPUS-WEB asks OPUS-GOV: a law's baseline is the real law at the research's calibration date (July 1, 2024), read from your `laws` table. If laws passed in play are written to that table too, mark them (or keep them only in `enactments`) so they never count as the place's real starting law.
  - OPUS-WEB needs measures from OPUS-CORE (16 measures, 20 links): a crime engine (property crime, larceny, reoffending, reported crime) that reads the web's crime factors, severe disasters and their damage, and local environment readings. Also seen while testing: `closeBusinessByChoice` on a town's largest firm in a world-economy town crashes payroll a few days later ("Payroll cash amount or stock is malformed or overflows", `work-payroll-cash.ts:276`), with or without the web.
- **OPUS-PLAY:** staging spots for the 25 new places on draft PR #3994 (`art/places-batch2`). This is the first step of PLAY's art item. The CTO merges #3994 once its anchors test is green.

## Owner decisions in force

- Owner, Oct 12, 10:30 a.m.: every pillar may run Sonnet or Opus sub-agents that write code in its own area (`AGENTS.md`, "Pillars may build with sub-agents"): Sonnet for fixes, Opus for parallel roadmap steps, two at once when a build splits cleanly. The CTO checks in every 15 minutes. Two Sonnet fixers (FIXER-2: merge blockers; FIXER-3: skip crashes) open PRs against the owning branch. OPUS-WORDS (Opus, branch `opus-words`, status `docs/coordination/words.md`) owns the English engine's phrase banks (`data/english/parts/**`); OPUS-PEOPLE keeps the engine.
- Keep it simple (`AGENTS.md`): two-level population, bookkeeping off in play, one run and one number, build only what the golden path needs, something to play every evening.
- No session is capped; checklists are an order of work.
- Owner, Oct 12, 8:49 a.m.:
  - The new core (#3999) is approved to merge onto main.
  - A skip never stops for a routine work shift the character attends on its own (M0-03 updated).
  - Real school names that honor presidents stay.
  - There is no attorney on the project; the legal check is our own review.
- Main is green as of Oct 12, 4:20 a.m. (1a1870742).
- Owner, Oct 12, 1:55 a.m.: _The Political Process_ is the baseline. The game does everything it does, then goes deeper (`docs/roadmap/political-process-baseline.md`). Committee hearings, election-night exit polls and custom world options are added. Use the generated art now.
- Owner, Oct 12: no stopping. The sessions build the whole game: after their checklists, their area's later-milestone specs, then open work. Nothing waits on another session or on the owner; the only stop is running out of usage.
- Owner, Oct 12: the English engine (conversations, scenes, the journal, people bringing things up) belongs to OPUS-PEOPLE; campaigning (step 4) and the next election reading the record (step 11) belong to OPUS-GOV.
- Checks stay light: own tests, the automatic golden-path and speed guards and money balance, the owner plays the evening build.
- Steam store page by Friday, October 16; the early-access date is set once the owner has played the golden path end to end (target October 30).
