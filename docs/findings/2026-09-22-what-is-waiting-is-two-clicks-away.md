# What is waiting on you is somewhere you have to remember to look

Measured 2026-09-22 on main `d956b92a`, while building the first interactive
object in a room.

## The finding

A character's own list of what is waiting on them — the posted meeting, an
unanswered offer of work, the errands of the week — is not in the room they
are standing in. It is on the "Today" panel, and Today is **embedded inside
the Calendar**, which is itself behind the corner cluster's flyout. So the
answer to "what is waiting on me" is two deliberate navigations away from
where the player is, through a menu, into a surface named after something
else.

Nothing surfaces it. The room shows the people who are present and the
scene's prose; it does not say that anything is pending, and it has no
control that leads there.

The route is not hidden by accident — the Calendar is where a day belongs —
but the consequence is that a player who does not think to open the Calendar
never learns that a decision is waiting. That is the same shape as the twelve
weeks somebody spent with an unanswered job offer they could not see: the
record was right, and the game had no way to mention it.

## How it was measured

Not by reading React. A browser test walked the real build from the creator
through `enterLife`, looked for the pending list on the opening surface, and
did not find it:

```
Error: expect(locator).toBeVisible() failed
Locator: getByTestId('day-pending')
Error: element(s) not found
```

The page snapshot at that moment is the whole finding — the opening surface
offers a housemate, the moment, and the time controls, and nothing else:

```
- button "Amit Cole, who you live with"
- button "The moment  What is happening here, and what you can do"
- navigation "Time, place and navigation"
```

The spec reaches the list with `goTo(page, "elsewhere-day")`, which opens the
Calendar and selects its Today tab. That is the player's real route, and the
spec takes it rather than mounting the panel directly, so the distance stays
recorded rather than hidden by a test shortcut.

## Why it is worth more than the change that found it

[PR #383](https://github.com/lamontaes/Political-Game-Git/pull/383) makes each
line of that list open the record that answers it, which is a real repair: the
list stopped being inert. But a list nobody opens does not become useful by
gaining buttons. The distance is the larger problem and it is not fixed there.

The environment-interactivity research answer points at the fix without naming
this: its first object family is papers, a noticeboard or a media surface,
exposing the correspondence and agenda actually available for the place the
player is standing in. The room already has the slot for it —
`coffee-table-papers` in the residence scene spec, classed
`personal-household`, currently painted decoration. Mounting the list there is
what closes the distance, and it is the one step #383 deliberately does not
take, because two of the files it needs are being written by another lane.

## What is still open

Whether the table should show _everything_ waiting or only what physically
arrived is filed as `household-paper-surface-contents`: an offer made in a
shop and a favour asked in a kitchen are both waiting and neither is a piece
of paper. Answering that decides whether the room surface is the whole list or
a filtered one, and until it is answered a mount should show the whole list
and say so, rather than inventing a filter.
