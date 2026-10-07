# Recorded officials — owner playtest item 1

The existing saved-person figure renders beside actual members in the state
roster and Your Representatives. Congress's existing cast now includes both
actual home-state senators. No artwork, identities, offices, or districts were
created by the screen.

The controlled browser fixture uses seed `Owner opening officials figure review`
and draws Oregon from all 56 starting jurisdictions. It renders the existing
opening and GovernmentBrowser components. The screenshots are component review,
not a completed ordinary owner-save browser playthrough. Both actual senators
(Erica Francis and Rene Solis), all eight occupied Oregon congressional roster
seats, and both represented senators loaded existing full-body images. The House
district is not recorded in this world; the screen says so and creates no holder.
The read left the serialized save unchanged. The browser logged a favicon 404.

The complete changed cast test passed 5/5 in 16.90 seconds with stock limits:
Arizona, New York, Georgia, North Carolina, and North Dakota, seed
`living scene actual home senators five jurisdictions`. All ten actual senators'
names, term IDs, organization IDs, dates, repeat reads and Save/Continue matched.
Four multi-seat states without a House binding omitted a House actor; North
Dakota retained its actual sole at-large member. An initial restricted startup
Git EPERM was retained before the permitted same-command retry passed.

Replaces: text-only figures beside existing recorded roster/representation
buttons, and the home Senate selector's first-match omission. Existing
SavedPersonFigure, people-pack art, person buttons, House binding and cast
renderer remain the survivors. New production exports: none.

Official Claude gates, ordinary owner-save browser play, and items 2/16/30–34
are separate pending work. These screenshots retain the existing backdrop and
scrim so their later changes can be reviewed separately.
