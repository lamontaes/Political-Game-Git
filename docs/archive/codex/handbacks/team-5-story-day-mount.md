# The day reads the people present and checks meeting choices again

The day now mounts the scene resolver's present roster. Expected attendance stays outside that list. The existing meeting panel keeps its roles and exact speech, but only shows choices still offered by the current canonical scene. Its action runner checks the offered speech again before the existing writer runs. This piece adds no clock, actor decision, or simulated presence from a picture.

## 1. Why-chain

Why mount the resolver? An unmounted reader changes no player's day. Why use its present roster? An invitation or schedule does not prove arrival. Why filter displayed choices? The scene may have changed before the render. Why revalidate at dispatch too? Another world update can happen after the render. Why return to canonical readers? Their records establish the currently available choice and its exact words. Terminal: record-backed display and validation, not a new person decision.

## 2. Research

The dependency is Team8's approved resolver at `98b333c9e19448f76267ec2fefc4026b60c33b6b`. Existing meeting entry, speech, and time-runner readers remain the authority. No real-world causal size is claimed. The resolver distinguishes recorded presence, modeled household context, and expected attendance. Its workplace reader currently establishes expectations only.

## 3. Revisions

The day selects canonical activity, current opening-event, workplace, or household IDs. A recorded work arrival selects an active employment relationship and its organization and jurisdiction. Missing canonical IDs leave the request absent. The workplace resolver still reports expectations only; no present roster is invented. A place label never establishes attendance. The new roster excludes expected people and returns no panel without a resolved present roster. Existing meeting rendering handles its own filtered roster, avoiding a second meeting list.

The existing speech labels and words are retained. Full option records include evidence, snapshot, intent, hearing, listeners, and words. A changed request or snapshot rejects an old offer. The entry writer keeps its existing reader because the resolver offers no entry option; its runner also rejects a changed snapshot.

## 4. Numbered parts

1. Built: day request/projection and a mounted present-roster panel.
2. Built: current canonical meeting roster/action/speech filtering, plus entry and speech runner checks.
3. Retained: existing JSX, roles, exact words, leave/stay handlers, and simulation/time writers.
4. Separate piece: first-morning schedule location. Other conversation/opening-choice dispatch adapters are outside this meeting-consumer change; existing canonical panels remain their owners.

## 5. Simulated, records, world pieces, checks

SIMULATED: existing meeting entry and speech writers only. No new autonomous decision.

RECORDS: no new history type or persisted offer. Reading the panel leaves the world unchanged.

WORLD PIECES: Team8 resolver, current opening scene, completed activity, household membership, meeting reader, and action runner exist. Missing places or no recorded roster leave the panel absent. Expected coworkers are not promoted into present people.

CHECKS: React roster output, nonmutation, invitation without choices, canonical meeting entry/speech, disappearance of speech after it is recorded, and rejection of old speech. No new rate or multiplier needs a range.

## 6. Proof run

Executed: nine day-mount cases passed across Dyer, Nevada; Lunenburg, Massachusetts; and Picuris Pueblo, New Mexico, in 44.21 seconds. The third is selected only from places with no municipality/township and a recorded county government in the place catalog. Each checks React roster output, invitation expectations, and entered-meeting speech/revalidation. This selection does not certify tribal or county legal authority.

After the dependency landed, the repaired caller passed twelve cases in 47.35 seconds on current main. Three added cases select recorded workplace IDs while keeping the expected-only roster out of the panel. Explicit nullable-ID guards repaired four new type diagnostics; the final strict check reported zero diagnostics and changed-path lint passed. The existing visibility guard remains unchanged relative to main.

The fetched repaired head also passed twelve cases in 53.81 seconds with zero type diagnostics, lint, formatting, whitespace and report checks passing. A final integration check combined this day caller with the separate first-morning piece over current main: 51 cases across four files passed in 60.93 seconds and both strict source/test graphs reported zero diagnostics. The day test now checks a home present roster or a work expected-only empty panel according to the recorded place. This compatibility change belongs to the day test; the morning source head stays unchanged.

Selection seed: `team5-day-mount:places`. World seeds use the prefix team5-day-mount and the place key: 3220700, 2537385, or 3556810.

The entered-meeting fixtures explicitly add a recorded chair to the original known notice. They do not claim generated meetings naturally supplied that chair. Original notice IDs, dates, and source order remain unchanged. The actual existing entry/speech writers then run.

Earlier combined adapter/resolver/day run passed 25 cases, but its first place selection repeated Lexington. It did not satisfy three distinct places. The corrected nine-case run above does. Six adapter and ten resolver tests from that combined run remain valid receipts for unchanged files. Strict types returned zero diagnostics over changed source/tests and the full PlayerGame import graph. Scoped ESLint passed.

Browser interaction, visual acceptance, full suite, first-morning placement through a player click, and a saved-player action-runner click were NOT RUN. React output and canonical writer checks do not establish those results.

## 7. Worked example

For each logged place, a future invitation grants no meeting choice. The fixture records an actual journey and chair before entry. The entered scene offers exact speech. The existing writer records the selected words; the new projection then offers no further speech and rejects the prior offer. Reading the mounted roster preserves serialized world bytes.

No dollar or month-by-month outcome follows from this display adapter. The next bounded piece records the first morning's location from an existing shift, without inventing colleagues, days off, weather, or layoffs.

## Method and exact scope

This replaces the unmounted adapter draft1201; its branch and tested source remain preserved. The new piece is based on approved resolver98b333c9e19448f76267ec2fefc4026b60c33b6b and changes no resolver files. The dependency has landed and the pull request now targets main. Retargeting exposed the already landed visibility guard; the repair retains that guard and adds only the day import and sibling mount.

Existing hunks: OrdinaryMeetingPanel imports, projection, entry callback, speech callback; PlayerGame one import and one sibling mount beside the existing meeting panel. New files: story-scene-day projection/test, StorySceneDayPanel, and the preserved player-options adapter/test. Two dedicated documentation files complete the piece. No opening card, life-so-far wording, actor art, authority/effects map, simulation writer, or central claims edit.
