# The filing counter as one scene, as played

Words builder W3, Nov 13, 2026. Pool item `words-director-one-path-part-1-filing-scene-situation-type`. Pictures at 1440x900 from `src/bench/filing.browser.mjs` with `SEED=<seed>` (a new life drawn from all 56; Travel to the first office that takes filings; the race picked). "Before" is main 6c6c23f; "after" is this branch.

| Seed         | Place                            | Race                            | Before                                                                                                                                         | After                                                                                                                                                                                                                         |
| ------------ | -------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| w3-counter-1 | Washington, District of Columbia | Delegate, District 98           | `before-w3-counter-1.png`                                                                                                                      | `after-w3-counter-1.png`                                                                                                                                                                                                      |
| w3-counter-3 | Moulton, Alabama                 | Moulton City Council            | the replies: file; "Did anybody in Moulton beat me to it?"; "July 15, got it. When do people vote?" (the dates the clerk had just told); leave | the replies: "Then I'll file for the council."; "Is anyone else from Moulton on the list?"; "Did Katherine Parrish say anything about me?" (the rival who filed); "I need a few days before I file with the municipal clerk." |
| w3-counter-4 | Benson, Utah                     | U.S. representative, District 1 | `before-w3-counter-4.png`                                                                                                                      | `after-w3-counter-4.png`                                                                                                                                                                                                      |

## The whole talk, after, in Shelburne, Vermont (`scripts/words/w3-counter.ts w3-filing-5`, PLACE_TAG=w3-filing-scene, draw 4)

```
clerk: Hello. You've found the town clerk for Shelburne. Running for something?
  [pick] I want to run for the Town of Shelburne Selectboard.
player: I want to run for the Town of Shelburne Selectboard.
clerk: Good for you. Another one for the selectboard. There's no primary for this one, so you'd go straight onto the ballot March 4. The Town of Shelburne Selectboard sets the budget and passes the local laws, and you'd get a vote on all of it. The papers are due back January 27.
  [file] Count me in for the selectboard.
  [say:1] Who else is running in Shelburne?
  [say:2] Did Anthony Parsons say anything about me?
  [leave] I'll sleep on it, Mila.
player: Who else is running in Shelburne?
clerk: Hang on. So far it's two candidates. Anthony Parsons was first. It's all public.
  [file] I'm in. Give me the papers for the selectboard.
  [leave] I need a few days before I file with the town clerk.
player: I'm in. Give me the papers for the selectboard.
clerk: All set. I've got you on the list for the selectboard with two other candidates.
Reply records:
  scene-reply:filing-counter:contest:seat:gus2025:135946:board:0:2025-03-04:person_6df5e7d8fcc9cb57:1
  scene-reply:filing-counter:filing:contest:seat:gus2025:135946:board:0:2025-03-04:person_6df5e7d8fcc9cb57
```

The rival branch (SAY=confront), same place:

```
player: Did Anthony Parsons say anything about me?
clerk: Nothing to me. Anthony Parsons came in a few days ago to file, same as you.
```

The next day's `filing` scene reads the record of the reply that filed (`filed-at-counter`): it opens on "{name} has your filing for {office} on the desk when you come back to the counter." and never stamps the papers again (`src/bench/filing-counter-petition.test.ts`, Amherst, New Hampshire, GOLDEN_PATH_SEED=d2b6c96e34ca9f8d, red on main, passes here).
