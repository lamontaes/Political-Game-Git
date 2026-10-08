# Where you spend the week: capital or home (bank id b11, phase P4 build; unlocks who you meet as a legislator and the "never see him anymore" reading)

Verified against origin/main ec9a9601a (Oct 5). Bank spec: docs/codex/specs/bank/b11-capital-or-home-week.md.

## What the player experiences

Once you are in the state legislature or Congress your weeks split between two places. Days at the capitol put you in the halls with colleagues, lobbyists, reporters and the governor's people. Days at home put you at the diner, at church, at your district office, with your family. You set a standing pattern (say Monday to Thursday at the capitol while in session, home the rest) and it keeps running until you change it. The game asks about it only when something pulls you the other way, such as a big vote you promised or a crisis at home. Skipping session days shows up as missed votes. Staying away from home shows up in what your neighbors say. Who you run into, what you hear and who asks you for things all follow from where you actually are. Council members already live where they serve, so the choice opens at the legislature.

## Owner decisions it rests on

- "Player chooses where to spend each week (capital or home); location changes who you meet."
- OWNER RULING (Oct 5): the week is a standing pattern, asked about only when something pulls you the other way. The player chooses where to spend each week, and where you are changes who you meet. (This settles the bank spec's open question as option A. Do not build the Sunday prompt.)
- D-11: "There is no weekly plan: a steady routine continues until changed, scenes interrupt, and the time is lost."
- "Things happen only when they matter... never a daily tick over everyone."
- No state-capital data exists. OWNER RULING: add the capital as a place record from the same place tables.
- Fixed rules: zero dice; nothing blank or placeholder (estimate and mark); one rule for all 50 states, D.C. and territories; emergent not authored; one writer per record kind; delete what you replace.

## Existing code to extend (verified on ec9a9601a)

- `src/simulation/campaign-routine.ts`: `:200 setCampaignRoutine`, `:284 campaignRoutineSlots`, `:325 campaignRoutineBlockAt`, `:80 currentCampaignRoutine`. The D-11 pattern: one record, one writer, a slot reader. Copy the shape, do not fork it.
- `src/simulation/office-workflow.ts:158 recordOfficeWorkflowPreference`; `types.ts:5173 OfficeWorkflowPreferenceRecord` (fields: votingMode, caseworkMode, supersedesPreferenceId). Add the week pattern here; keep the supersedes chain as the one-writer history.
- `src/simulation/living-world/work-schedules.ts:589 whereaboutsAt` (order: work absence, recorded activity, work shift, else `{kind:"home"}`), `:633 peopleAtWorkAt`. Legislative seats are not jobs there, so every legislator reads "home". The office branch goes between activity and work.
- `src/simulation/legislative-session-calendar.ts:13 SittingCalendar`, `:30 nextSessionCalendarDate`.
- `src/simulation/governing/legislative-clock.ts:462,488` (not-decided means recorded absent), `:489 present()`.
- `src/presentation/place-travel.ts:54 travelToPlace` (authored/sourced durations only; real callers `ordinary-meeting-actions.ts:362,443`, `life-scene-flow.ts:842`). `src/presentation/place-backdrops.ts:79 capitolPlaceFor(usps)` (picture per state; `player/WorldOrientationPanel.tsx:937` uses it).
- Place tables: `data/source/places/corpus.json` is a list of 32,350 Census Gazetteer places with `geoid`, `stateUsps`, `displayName`, `interiorPoint` latitude/longitude. The capital is one row picked from here by geoid. No capital list exists in src or data/source (searched).
- Not on main: `member-record.ts recordOf` (Session 24 part 2), Session 4's situation reader.

## Build steps (one PR each, in this order)

1. **Seat of government as a place record.** One data table: for each state, D.C. and each territory, the capital's Census place geoid (checked to exist in `corpus.json`), plus Washington for Congress. Loaded by the same place loader as every town. Source: each state's own government site or Census, one search per unmatched item, cite. Territories whose capital is not a Census place (check Saipan/Capitol Hill, Pago Pago, Hagåtña) get the nearest Gazetteer row and are marked estimated. Must NOT: hard-code a capital name in code.
2. **Standing week pattern.** Extend `OfficeWorkflowPreferenceRecord` with a pattern: each weekday = capitol, home, or district office; one set for session weeks, one for recess. Written only through `recordOfficeWorkflowPreference`. Computer-run legislators get a pattern at seating, chosen through `evaluateDecision` from household (young children, partner's job), travel time to the capital, ambition and the body's sitting calendar. Revisited only on a recorded life change (marriage, child, leadership post from b10), never weekly. Add the one "pulled the other way" prompt: when a pattern would skip a vote the player sponsored or promised (b08 commitments), say so once.
3. **Where officeholders are.** Add the office branch to `whereaboutsAt`: on a sitting day when the pattern says capitol, the person is at `capitolPlaceFor` in the capital city; otherwise home or district office. Each switch is one `travelToPlace` trip. With no authored route, duration is estimated from the two places' coordinates and marked estimated. Whereabouts stay a query; store nothing per day.
4. **Attendance follows location.** A member not at the capitol on a sitting day is recorded absent in that roll call, reason "was at home". Absences feed `recordOf`.
5. **Who you meet comes from where you are.** Session 4's reader takes participants from `whereaboutsAt` at the player's location: capitol = colleagues present, lobbyists with business pending, statehouse reporters, staff; home = residents, family, local officials, party chapter. No encounter list.
6. **Neglect is read, not scored.** What neighbors say comes from recorded encounters between the member and district residents over the term (scenes and casework already write them), given to Session 24's voter reflection as an observed fact. Family time reads the same records.
7. **Screen gets data only.** One week grid in Your office with a "this week only" change. Session 3 owns the screen.

## Must NOT build

A daily pass over every legislator; a travel minigame; a "home presence" meter; random encounters; a Sunday-night prompt; a second routine system beside the D-11 pattern and office workflow; place special cases (one path for every capital, near or far).

## Research tables

Needed: capital per state, D.C. and territory (public record, one search per unmatched item). Not needed: travel times (computed from `interiorPoint` coordinates, marked estimated). Any distance-to-time speed comes from `travelToPlace`'s existing sourced durations; if none exists, ONE search, cite, table, never invent. Nothing on member time-at-home exists in `data/research`, so no target share is set.

## Done when (played-game proof)

- Random state; the player is seated and sets a pattern. A session Tuesday shows the capitol scene with named colleagues present; a Saturday shows a home scene with residents. Skipping a Wednesday with a vote records the player absent with the reason, after one warning if they had promised it.
- A computer-run member with young children four hours away has a different recorded pattern from a single member near the capital, each with reasons.
- Same flow for a random territory/D.C. place. Same save, same answers.
- Tests: `office-week-pattern.test.ts`, `whereabouts-office.test.ts` (3 random states), `absent-when-home.test.ts`, plus one test that every state, D.C. and territory has a capital geoid found in `corpus.json`.

## Proof to post

PR comment per step: place and seed, the capital row, pattern record ids and reasons, whereabouts printed for a sitting Tuesday and a Saturday, the absence record, delete list per "Replaces:" (none expected beyond the "every legislator reads home" gap), `npm run typecheck` and changed tests passing.

## Standing rules

NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building.

- Question settled by the owner (Oct 5): standing pattern, asked only when pulled the other way. Switch kept anyway: the "pulled the other way" prompt conditions = one data row listing the triggers (promised vote, sponsored measure, recorded home crisis); adding a Sunday check-in later means adding a trigger row, not code.
