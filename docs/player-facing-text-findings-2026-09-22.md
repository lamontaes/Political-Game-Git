# Player-facing text: three findings from the Springfield walk

Measured 2026-09-22 08:20Z on `claude/player-facing-text-client` at `6db9b5bd`,
whose base is `codex/client-content-delivery` at `70fa13a7`. Each claim below
says whether it was checked in this tree or relayed from another lane's walk.
Name the tree with any claim carried out of here: three claims tonight were
true of one branch and false of another.

## 1. "Issues and budget" is a tab with no issues — CONFIRMED in this tree

`src/player/politics/PoliticsTabs.tsx:37` labels the tab `"Issues and budget"`.
Its sections are Budget & economy, Transit service, Taxes and public receipts,
and Constitutional & charter changes. None of those is an issue in the sense
the word promises — a policy question the player can hold a position on — and
the reason is structural rather than cosmetic: a new world contains no policy
propositions at all, so there is nothing for the tab to show even in principle.

The honest repair is the label telling the truth, not the tab pretending. What
the tab actually contains is public money and the rules of the place, so a name
in that shape fits what is there. Choosing the words is a product decision and
is left to the owner rather than taken here.

Until a world generates propositions, no renaming makes the tab show an issue.
That is worth stating plainly in any report, because a label change reads like
a fix and is not one.

## 2. Budget, Tax and Transit showing the same page — NOT REPRODUCED in this tree

Relayed from the playtest lane's walk. It does not hold here, and the
difference matters enough to check before it reaches a report.

In `src/player/PlayerGame.tsx` the three are separate cases with their own
frames and titles — `"Budget & economy"`, `"Transit service"`,
`"Taxes and public receipts"`. A player with no office is not shown a budget in
place of tax: `politicsIssueAccess` returns false and the screen renders
`ISSUE_WITHHELD.tax` — "Tax work opens when you hold an office with power to
propose taxes" — at `PlayerGame.tsx:4817`, with the transit equivalent at
`:4767`. That is the opposite of a silent substitution; it is the screen saying
what is not there and why, which is the behaviour the rule asks for.

Two readings of that: either the walk was on a different build, or it saw
something these three cases do not cover. Both are worth resolving before the
finding is carried further. `ISSUE_WITHHELD` in
`src/presentation/politics-issues.ts:39` is where the answer would change if it
ever did.

## 3. The journal drops a belief instead of saying what it cannot show — CONFIRMED in this tree

`src/presentation/world39-journal.ts` is the only presentation file that reads
the policy catalogue, and at `:301` and `:338` it drops a recorded private
belief or campaign commitment with a bare `continue` when the catalogue has no
proposition for it. The record exists; the player's own view or promise was
written; the journal renders nothing and says nothing.

That is the one place in this build that breaks the standing rule — ignore it
and say so, never silently. The fix is not to render the belief as if the
subject were known, because it is not; it is to keep the entry and say the
subject is missing. It is a behaviour change to a screen and needs its sentence
chosen deliberately, so it is recorded here rather than guessed at.

It is worth saying that the rest of this build does this better than almost
anything in it. The Budget & economy screen refuses four separate ways without
ever printing a zero, and one of its own sentences is the whole design in a
line: _"That is no record, not a zero balance."_
