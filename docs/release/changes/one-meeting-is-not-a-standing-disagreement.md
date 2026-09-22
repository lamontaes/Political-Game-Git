---
id: one-meeting-is-not-a-standing-disagreement
impact: patch
section: Fixed
title: One meeting is not a standing disagreement
---

A member of a party body considers leaving to organize when the body keeps
deciding against something they hold most firmly. That "keeps" counted recorded
decisions rather than separate occasions, and the player's own route through the
party panel writes a fresh decision every time the button is pressed, with no
date gate. So deciding the same question four times in one sitting read as four
repeated defeats, and on a measured world it produced four people ready to found
a breakaway party out of a single afternoon.

Repetition is now counted in days on which the body actually decided. Four
presses in one sitting are one occasion. Somebody who loses the same vote month
after month reaches the same place they always did, and the strength of the
finding still rises with the number of occasions rather than the number of rows.

The test that covered this path asserted only that nobody was leaving, on a
world where nobody could have been; it would have passed if the function had
returned nothing at all. Two tests replace it: one holds the single sitting to
no initiative, the other walks a member through months of losing the same vote
and requires a real split or founding with named allies and cited decisions.
