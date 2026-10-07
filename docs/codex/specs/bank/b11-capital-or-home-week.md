# Where you spend the week: capital or home (bank id b11, phase P4)

## What the player experiences

Once you are in the state legislature or Congress, your weeks split between two places. Days at the capitol put you in the halls with colleagues, lobbyists, reporters and the governor's people. Days at home put you at the diner, at church, at your district office, with your family. You set a standing pattern (say Monday to Thursday at the capitol while in session, home the rest) and change it whenever you like; it keeps running until you do. Skipping session days to stay home shows up as missed votes. Staying away from home shows up in what your neighbors say about you. Who you run into, what you hear and who asks you for things all follow from where you actually are. Council members already live where they serve, so the choice opens at the legislature.

## Owner decisions this rests on

- "Player chooses where to spend each week (capital or home); location changes who you meet."
- D-11: "There is no weekly plan: a steady routine continues until changed, scenes interrupt, and the time is lost."
- "Scenes scale with responsibility; quiet days normal early." "Constituents: often; player decides how their office handles them."
- "Things happen only when they matter... never a daily tick over everyone."
- Family: "a few moments with your kids that shape them; rest background."

## Existing code it must use

- `src/simulation/campaign-routine.ts:47–80`, `:200 setCampaignRoutine`, `:284 campaignRoutineSlots`, `:325 campaignRoutineBlockAt`: the D-11 standing-routine pattern (one record, one writer, a slot reader; the clock books it).
- `src/simulation/office-workflow.ts:158 recordOfficeWorkflowPreference`; `types.ts:5173 OfficeWorkflowPreferenceRecord` (voting mode, casework mode): the officeholder's standing play policy.
- `src/simulation/living-world/work-schedules.ts:582 whereaboutsAt` (activity, else work shift, else home), `:617 peopleAtWorkAt`. Legislative seats are not jobs there, so every legislator reads as "home" unless at an activity.
- `src/simulation/legislative-session-calendar.ts:13 SittingCalendar`, `:30 nextSessionCalendarDate`: sitting days per body.
- `src/simulation/governing/legislative-clock.ts` ~`:462`, `:488`: members who did not decide are recorded absent; `present()` counts.
- `src/presentation/place-travel.ts:54 travelToPlace`; routes accept only authored or sourced durations (`:17–37`).
- `src/presentation/place-backdrops.ts:79 capitolPlaceFor(usps)`: the capitol picture per state, D.C. and territory.
- `data/source/places/corpus.json` carries place coordinates. No state-capital-city data exists in code.
- Session 4's situation reader picks participants from who is present ("presentAt + absence record" in its queue).

## What to change

1. **Seat-of-government data.** One table: the capital city (Census place) for each state, D.C. and territory, plus Washington for Congress. One quick lookup, cited.
2. **The standing week pattern.** Extend `OfficeWorkflowPreferenceRecord` with a week pattern (each weekday: capitol, home or district office; one version for session weeks, one for recess), written through `recordOfficeWorkflowPreference`. Computer-run legislators get a pattern at seating from their household (young children, a partner's job), travel time to the capital, ambition and their body's sitting calendar, chosen through `evaluateDecision`. It is revisited only when their circumstances change (marriage, a child, a leadership post), never weekly.
3. **Where officeholders are.** Add an office branch to `whereaboutsAt`: on a sitting day when the pattern says capitol, the person is at `capitolPlaceFor` in the capital city; otherwise at home or the district office. Each switch is one trip through `travelToPlace`; when no authored route exists, the duration is estimated from the two places' coordinates and marked estimated (nothing blank). Whereabouts stay a query; nothing is stored per day.
4. **Attendance follows location.** A member who is not at the capitol on a sitting day is recorded absent in that roll call, with "was at home" as the reason. Before the player's pattern skips a vote on something they sponsored or promised (b08 commitments), the game says so once. Absences are part of the member record that Session 24's `recordOf` reads.
5. **Who you meet comes from where you are.** Session 4's situation reader takes participants from `whereaboutsAt` at the player's location. At the capitol: colleagues present, lobbyists with business pending, statehouse reporters, staff. At home: district residents, family, local officials, the party chapter. No encounter list; the reader works from present people's wants.
6. **Neglect is read, not scored.** What neighbors say ("never see him anymore") comes from the recorded encounters between the member and district residents over the term (records scenes and casework already write), offered to Session 24's voter reflection as an observed fact. Family time reads the same encounter records.
7. **Screen gets data only.** One week grid in Your office with a "this week only" change; Session 3 owns the screen.

## Must NOT build

A daily pass over every legislator; a travel minigame; a "home presence" meter; random encounters; a second routine system beside the D-11 pattern and office workflow; place special cases (one path for every capital, near or far).

## Done when (proof in a played game)

Random state; the player is seated in the legislature and sets a pattern. A session Tuesday shows the capitol scene with named colleagues present; a Saturday shows a home scene with district residents. Skipping a Wednesday with a vote records the player absent with the reason. A computer-run member with young children four hours away has a different recorded pattern from a single member near the capital, each with reasons. Tests: `office-week-pattern.test.ts`, `whereabouts-office.test.ts` (3 random states), `absent-when-home.test.ts`.

## Depends on

Session 4 (presence and situation reader), Session 24 (`recordOf`), b08 (commitments), b10 (leadership posts change patterns), the lobbyist item (Session 21 after the vote moment), Session 3 (screen).

## Open questions for the owner

1. How often does the game ask where you'll be?
   - A (recommended): set a standing pattern once, change it any time; the game only asks when something pulls you the other way (a big vote, a crisis at home).
   - B: ask every Sunday night for the coming week.
   - C: a standing pattern plus a short Sunday look-ahead you can skip.
