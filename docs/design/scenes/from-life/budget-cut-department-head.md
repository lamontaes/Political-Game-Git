# Episode: the department head argues a cut

Scenes from life (`scenes-from-life`), owner's Oct 27 executive brief. Calibration only: no real person's name or words ship, and none are in this file's packet. Item: `words-scene-budget-cut-department-head`. Engine items it waits on: `world-budget-cut-names-the-executive`, `world-state-cabinet-posts-draw-agency-lines`.

## Source

- Central Current (Syracuse, New York), May 9, 2025, "How Syracuse officials anticipate budget cuts could affect city operations", read in full: the common council unanimously passed 82 amendments to the mayor's proposed budget, about $16 million, most departments losing roughly 7 percent. At a briefing afterward the police, fire, public works and code enforcement heads each said what their cut would stop; the mayor blamed the council and had 10 days to veto the amendments, which the council could override with six votes.
- Two more lives the same producer covers (read as summaries, pages not opened in full): LAist, April 29, 2025, hearings on Los Angeles department budgets, where the mayor's plan to lay off about 1,647 city workers brought union and neighborhood council leaders to the committee, and the same story names no department head, which is a gap for the producer's "head" chair; and a Bangor, Maine, council compromise of May 2010 in which a fire chief said a 10 percent cut would cost seven firefighters and a station and offered alternatives that kept the station open (search summary, Bangor Daily News).

## Packet

1. The mayor sent the council a budget; the council changed it in committee by cutting most lines.
2. The cuts were passed together, in one night, by the whole council.
3. Each department head then spoke for their own line: the police chief about overtime and training, the fire chief about staffing, public works about plowing and salt, code enforcement about plan review and inspectors.
4. Each said what the number stops, in the department's own terms, not in dollars alone.
5. The council said the cuts would not remove positions; the heads said they would.
6. The mayor, not the heads, owned the next choice: veto or live with it.
7. What changed afterward: a veto window opened, and the heads' public statements were on the record.

## Does the engine fire it?

Asked in a played world (`buildBenchWorld`, two-level, a mayor as the player), one year each, drawn places and seeds:

| Place                               | Seed              | Records naming the mayor                                                                                     | Budget records that year                 | Scenes the director fired                                     |
| ----------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------- |
| Riverton, Wyoming (5666220)         | `2deb6d3f7811...` | person.weighed 92, person.acted 365, town-hall 5, speech.retold 17, office.approached 1, office.introduced 1 | budget-line-changed 38, budget-adopted 4 | office-hours 1, press-interview 1                             |
| Prospect, Kentucky (2163264)        | `6a45d21b78d3...` | person.weighed 137, bill-presented 5, press-story 17, person.acted 365                                       | budget-line-changed 37, budget-adopted 3 | desk-bill 2, office-hours 1, celebration 1, press-interview 1 |
| East Bend, North Carolina (3719320) | `dcdfc83e1a78...` | person.acted 626, press-story 20, office.approached 15, election-result 1                                    | budget-line-changed 40, budget-adopted 4 | law-takes-effect 2, office-hours 15, filing 1, race-won 1     |

- The record exists: `budget-line-changed` (`src/core2/modules/budgets.ts`), once per line the council's adopted budget moves, with the line, level, signed change and the budget row it came from. It names no one in `personIds`. **Exists, names no one, nothing fires.** Engine item `world-budget-cut-names-the-executive`, lead `laws-effects`.
- The department head exists: the town's appointment records seat a person in each post (`appointmentsIn`), and the post-line table maps police chief to police, fire chief to fire, public works to highways, library and parks to parks, planning to housing. **Exists for towns, nothing fires.** For a state cabinet post and a county head the table has only the administration fallback; engine item `world-state-cabinet-posts-draw-agency-lines`.
- The consequence exists: a cut that exceeds a line's room lays off people (`public-staffing-changed`, `law-reach/group-a-staffing.ts`), who get the layoff scene. The head's argument before it did not exist.
- The mayor's choice after it (veto or live with it) does not exist for a budget: the council's adopted budget is not presented to the executive in this engine. The scene's endings that carry the cut back to the council open the executive's office screen; a budget presentment is a larger engine question and is not filed, because a mayor already has the signing and veto scenes for bills.

## What shipped

- Situation type `budget-cut` (purpose `cut-argument`): the head of the cut line's department (new civic fill `department-head`) comes to the executive the day the cut is recorded. Cause: `budget-line-changed` that names the executive (`selfNamed`, `executiveId` is the subject). A raise, a government with no heads on that line, a county or state line, or the administration fallback casts no head and fires nothing.
- Arc `cut-argument`: the head states the cut; the executive's four stances are back the department (agree), let it stand (refuse), give half back (bargain), ask what it stops (ask). The head answers by traits (plea, press, threaten, accept); endings: an amendment to the council, half of it back (both open the executive's office), the cut stands, numbers first.
- 76 bank pieces in `data/english/parts/scene-talk.json` with versions by bearing (braced, calm, guarded, nervous, proud, solemn, curious) and by what the record holds: the amount cut said to two figures, the share of the line, the head's post and their years in it (two or more).
- Director event impact for `budget-line-changed`, and the director's facts (`cut`, `percent`, `post`, `years`), each citing the cause, appointment and budget record ids.

## Write-back

The player's reply is recorded as `scene.reply` (cause record id, move, line) and the time together reaches the executive's tie with the head, as every purpose scene does. The endings that name an amendment hand the player to the office screen. Nothing reads the reply yet as a commitment to amend; the same gap is already filed for the staff scene (`words-staff-news-reply-reaches-press`).

## Same producer, two other lives

- The Bangor council compromise: a head says a cut costs a station; the executive gives some back. The `bargain` stance and the `half-back` ending.
- The Los Angeles hearing: a leader of the people a cut lays off speaks for them. Once the chair is any person the cut reaches, not only an appointed head, the producer covers it; that needs a role fill from `public-staffing-changed` and is the next episode, not this one.

## Gaps left open

- The scene does not fire in play until the budgets engine names the executive on a cut (engine item above). A test (`src/director/budget-cut-scene.test.ts`) asserts that today no engine record names the mayor and no scene fires from it, then emits the record in the shape the item will write and checks the scene: the head is the post-holder of the line, the talk cites the record and the appointment, a raise and the administration line fire nothing, two trait profiles say it differently, and the four root replies are four moves.
- The governor and county executive versions wait on the state and county lines item above.
