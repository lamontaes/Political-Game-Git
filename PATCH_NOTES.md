# Political Game — Patch Notes

Newest release first.

## UNRELEASED — Groundwork

Nothing here changes what you can do in the game yet. It is the plumbing that
future rooms and future people are built on, and it is worth one paragraph
because of what it makes possible next.

Backgrounds can now come in four sizes of the same picture, and the game picks
the sharpest one your screen can actually use — so a big or a Retina display
stops being served a small picture blown up. Nothing is ever enlarged to fill a
gap: where a picture is too small for a screen, the game says so instead of
pretending. Rooms and people are now described by data rather than by
hand-placed numbers, which means a person put in a chair sits in it, a person
put on a floor stands on it, and swapping one person for another does not knock
either of them out of place. None of that is visible yet, because the art it is
waiting for has not been made.

## PRE-ALPHA 0.2.0 — "The Bill Becomes Law"

_Revised 2 September 2026 after an independent review of the legislating build._

You can now actually legislate. Write a bill, get it through committee, win the
floor votes, survive the other chamber, and find out what the governor does with
it. Sometimes the governor says no — and then you find out whether your
colleagues will stand with you.

### Added

- **File a bill and follow it all the way.** Pick a bill to carry, introduce it,
  watch it get a number and a chamber, and take it step by step through
  committee referral, a public hearing, a committee vote, the calendar, floor
  amendments, a recorded floor vote, the second chamber, enrollment, the
  governor's desk, and — if it comes to that — a veto override. Bills that make
  it are law; bills that fail stay in the record as bills that failed.
- **Every vote is a real vote.** Each member is counted by name and by decision:
  in favour, against, not voting, excused, absent. The chamber's own rules
  decide how many votes you need, and the game tells you the number before you
  call the question. Nothing is nudged, weighted, or smoothed.
- **Three legislatures that genuinely work differently.**
  - _Kentucky_ — an ordinary two-chamber legislature. 51 of 100 in the House,
    20 of 38 in the Senate, and the same majority sustains or overrides a veto.
  - _Nebraska_ — one chamber and no second one. There is nowhere to send your
    bill after it passes, so it goes straight toward enactment. In exchange,
    every bill is guaranteed a public hearing, and it must clear three separate
    floor stages instead of one.
  - _Alaska_ — two chambers, but the veto override is not fought chamber by
    chamber. Both bodies sit together, and an ordinary bill needs 40 of 60 while
    a spending bill needs 45 of 60.
- **A running story of your bill.** Plain-language answers to where it stands,
  who decides next, what that will take, what just happened, and what the rules
  do not settle — plus the full history and the complete roll-call record.
- **When the other chamber changes your bill, you have to win it twice.** If the
  second chamber amends the bill and passes it, it goes back to the chamber it
  started in, and your colleagues there vote on whether to live with the change.
  Agree and the bill goes on to the governor. Refuse and it dies with two
  chambers holding two different bills.
- **Waiting is a move.** Some things are not yours to decide. When the bill is
  on the governor's desk, the only thing on the screen is "Wait for the
  governor's decision" — and you find out what they did after you wait.
- **Days you have to sit out.** Where a chamber's rules say its stages fall on
  separate days, the bill cannot be reached again that day, and the screen tells
  you so and lets you wait for the next one. Nebraska's three stages now happen
  on three different dates, and the vote record shows them.
- **Legislation on the main menu.** A new destination in the navigation menu.

### Changed

- **The game now says what it doesn't know.** When nobody can establish
  something — such as when a new Nebraska law actually takes effect — the game
  says so plainly instead of inventing a date. "We don't know" and "there is no
  such thing here" are told apart and never blurred together. And where a rule
  _is_ settled, it is now stated as a plain fact about your world: in Alaska a
  law takes effect ninety days after enactment, and in both Alaska and Nebraska
  a bill the governor ignores becomes law anyway.
- **Buttons say what you do, not what happens.** You ask, you move the question,
  you wait. The committee, the chamber and the governor answer for themselves.
- **Committees answer twice.** A committee can send your bill to the floor while
  telling everyone it should not pass — that is a real report and the bill moves
  on. A committee that simply will not report it is a different thing entirely,
  and now reads that way.
- **Your committee has a name.** Bills go to a Transportation committee, not to
  "the House of Representatives standing committee of the House of
  Representatives".
- **Passing a bill and the law taking effect are two different moments.** The
  game tracks them separately.
- **Committee hearings take real time.** A hearing is scheduled on the calendar
  and happens when that day arrives, on the same clock as the rest of your life.

### Fixed

- **"The governor signs" could veto your bill.** Both outcomes used to sit under
  "What you can do", and picking one had no effect on what the governor
  actually did. There is now one honest wait instead.
- **A bill could quietly skip the second chamber's agreement.** After the Senate
  amended a bill, the game announced the bill had cleared the legislature. It
  had not.
- **Saving twice and carrying on could break the bill.** Amend, save, reload,
  amend, save, reload and amend again used to fail. A bill's record now belongs
  to the save, not to how long the tab has been open.
- **A finished bill could be un-finished.** It was possible for the record to
  say a bill was both dead and law, or to enter the same bill in the law books
  twice. A bill now resolves exactly once, and a save containing an impossible
  sequence of events is rejected rather than quietly tidied up.
- **The governor could act before the bill existed.** One decision now carries
  one date, and it can never fall before the bill reached the desk.
- **Rules the game had not settled were being treated as permission.** An
  unresolved rule and one that does not apply now both mean no.
- **Corrected what the game says the law is.** Kentucky's two chambers were
  sharing one chamber's rule book; Alaska's deadlines were attributed to the
  wrong section of its constitution, and it does have a settled effective-date
  rule and a settled answer for a governor who does nothing; and Nebraska's
  "most bills get a hearing" had been rounded up to "every bill is guaranteed
  one". Alaska's governor also no longer describes reducing an appropriation
  while actually returning the whole bill.
- The navigation menu no longer stretches down over the office when it has more
  destinations in it. It now has a fixed ceiling and scrolls past it, so the
  scene stays clear at every window size.

### Known Issues

- Only three legislatures are modelled. The rest of the country is not in yet.
- Members vote from the scenario's written record. There is no bargaining,
  lobbying, whipping, or persuasion yet — the seams for it are in place, but the
  arm-twisting is not.
- Committee substitutes, conference committees between two disagreeing chambers,
  procedural motions on the floor, and appropriations rules are not modelled.
- Adopting an amendment does not yet rewrite the bill's text. The change is
  recorded, and the other chamber really does have to agree to it, but you
  cannot read the two versions side by side.
- Session deadlines are shown to you but do not yet end a session on their own,
  and no bill can currently die at adjournment: none of the three legislatures
  has a settled rule for what happens to a bill still pending when the session
  ends, and the game will not guess one.
- Alaska will not let you amend on the floor. Nothing consulted establishes the
  authority for it there, and the game refuses rather than assuming.
- The governor ignoring a bill until the clock runs out is described but does
  not yet happen on its own.

---

## PRE-ALPHA 0.1.0

The first playable build: your office, your calendar, the people you work with,
and the documents on your desk.
