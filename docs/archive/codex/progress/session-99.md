# Session 99 — BG-08

Opening a person's card from their figure now says they are in the room. Their recorded role and facts remain on the card, and its contact actions use the same direct evidence of presence.

## MERGED

Nothing is merged. BG-08 is fixed on the current branch and is ready for review.

## WHAT EMERGED

- **HARDWIRED:** A card opened from a rendered person now treats that person as present in the room. The same presence reaches the contact-action projection, so the card does not offer travel to the person under the pointer.
- **HARDWIRED:** The regression test keeps the person's recorded role and facts visible while checking the corrected room text.
- **Missing link:** This checkout has no Git remote or GitHub authentication, so Session 99 could not post the claim or READY comment on issue #2424.

## VITAL STATISTICS

- Queue item: BG-08.
- Regression: 1 new test; 4 focused tests pass.
- Next item after this PR: BG-09.
- Exact next command: `git status --short --branch`
