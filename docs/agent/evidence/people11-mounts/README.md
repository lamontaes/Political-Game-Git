# Places mounted, and the narrow-note repair

Chromium 141.0.7390.37 at `/opt/pw-browsers/chromium`, named explicitly because
`@playwright/test` here resolves a build this container does not have and cannot
download. Not comparable with runs on the project's own harness.

## Places is actually mounted

`mount-places.png` is the Places workspace reached from the ordinary navigation
in a normal generated life — not a fixture, not a proposed mount. It shows
current location, a Travel offer with its five-minute cost, an Attend offer with
its disclosed duration, and Return home correctly **disabled** with the existing
canonical reason "You are already home."

Buttons carry their own test ids: `places-offer-walk-neighborhood-action`,
`places-offer-walk-home-action`, `places-offer-venue-<activity>-action`.

## The combined route, on the mounted branch

| step                                      | result                                                                      |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| navigate to Places                        | workspace renders                                                           |
| read the offers                           | clock label unchanged — reading moves nothing                               |
| Return home, at home                      | disabled, with the canonical reason                                         |
| Attend the posted meeting                 | recorded: "You have finished Posted public meeting at Public meeting room." |
| current location afterwards               | back to Home · home                                                         |
| News                                      | workspace renders                                                           |
| Back                                      | returns to the play screen                                                  |
| save, leave, reopen from the title screen | state preserved                                                             |

`route-attend.png` and `route-reloaded.png` are those two states.

One honest limit: the navigation shows a **date**, and the meeting ran 635
minutes inside the same day, so the date label is unchanged either side. That
is not evidence the clock did not move — the recorded completion is what shows
the activity happened. A clock-advance assertion needs a time-of-day readout,
which this label is not.

A first pass of this route used a different seed whose life had no posted
meeting and no published stories, so the Attend and News-search legs were
vacuous. They are re-run here on a seed that has them rather than reported as
passes.

## The narrow unsaved-note overlap

`narrow-390-before.png`: at 390px the note "This life has not been saved yet."
sits on top of the primary action, which reads "…ife". Measured — note x 18-174,
y 28-71; button x 20-212, y 17-56.

`narrow-390-after.png`: the notes move to the foot of the screen below 480px,
clear of the panel and of the identity cluster.

A second defect surfaced while checking and is fixed with it: `elementFromPoint`
at the note's centre returned `DIV.life-hud`, so the fixed panel was the hit
target at **every** width and took presses meant for whatever sat behind it. It
holds nothing but `role="status"` sentences, so it no longer accepts pointer
events. After the fix the same probe returns the scene, and a plain, non-forced
click on the primary action succeeds at 390px and at 1440px.
