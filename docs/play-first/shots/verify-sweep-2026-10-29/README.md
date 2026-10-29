# Verify-and-close sweep, Oct 29

Bench 1440×900 on main (merge of Oct 29, 18:30 UTC), at the CTO's request. Place for the in-game screens: Anguilla, Mississippi, seed `9d1490ac-904b-4fa8-83f2-0609986c6166`. The creator screens are before any place is chosen (Nevada list). Screenshots in this folder.

## Fixed already on main (flip done)

| Item                                          | Evidence                                                                                                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| play-first-03-creator-date-fields-aligned     | `creator-1.png`: Month, Day and Year sit on one grid under their labels.                                                                                                                    |
| play-stop-17-see-through-panels               | `politics-government.png`, `travel.png`: the panels are opaque over the busy room.                                                                                                          |
| play-stop-04-filing-panel-runs-off-screen     | `clerk-1.png`: the filing office panel fits, its choices are inside it.                                                                                                                     |
| play-stop-16-identical-council-seat-choices   | `clerk-1.png`: each choice names its seat and who holds it ("Council member · Held by Lara Bell"). No date on the choice: not asked by the done-when line's later wording; the CTO decides. |
| play-stop-05-politics-lists-wrong-officials-a | `politics-government.png`: "Your members" lists the two senators, the representative, the state legislators and the council first.                                                          |
| play-stop-05-politics-lists-wrong-officials-b | `politics-government.png`: the mayor, council terms ("Term ends July 2025") and county offices are listed.                                                                                  |
| play-first-12-politics-screen-to-mock-b       | Issues is law cards (seen in the item 100 shots, `docs/play-first/shots/play-menus-no-continue-back/after-politics-issues.png`).                                                            |

Items 28 to 34, 42 to 43, 46 and 47 of the Oct 28 sitting are done on main and look right in the same shots: the title and creator (`creator-1.png`, name set apart, labels on a grid, the age line, the gold search field), hair and color swatches (`creator-look.png`), the calendar skip-forward on a future day (`calendar-future.png`) and Travel place cards (`travel.png`).

## Still broken

| Item                                         | What I saw                                                                                                                                                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| play-stop-41-person-card-no-empty-headings   | `person-card-empty-heading-before-fix.png`: "LIVES WITH YOU" empty under "WITH YOU". Fixed in #6789.                                                                                                       |
| play-first-12-politics-screen-to-mock-a      | `politics-government.png`: lists only; no chamber picture, party split bar or vote bars. Bigger than an hour.                                                                                              |
| Oct 28 point 18 (no item found)              | `politics-government.png`, right column: the Leaders list is out of order: "United States House of Representatives / Ohio" and "Linda Yoder Majority leader United States Senate / Florida" are misplaced. |
| play-stop-36-opening-starts-with-the-address | `home.png`: the opening still plays the address in the living room as the narrator's talk, not the montage the owner ruled on Oct 28 night. Words' item.                                                   |

## Found, not in ORDER

- A leftover tab bar over News (fixed in #6790).
- Initials in a circle ("AC") on the People web, and people standing on the newspaper pile and hearth in the living room (`home.png`): the figure work of `people-pack-v3`.

## Not checked

play-stop-27 (title motion; needs video), 32 (no same-named town in the list drawn), 45 (talk history), 35, 37 and 38 (figures; People v3 is rewriting them), 19-b, and the laws items 86 and 90.
