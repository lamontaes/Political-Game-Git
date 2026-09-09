# P2R2 — one life, read off the screen

Thirty beats of a normal browser route, taken from the player surface at a
normal viewport. Setup: age 34, custom start, shares a home, calibration
skipped. The first option was taken every time, which is the least favourable
way to play — a player choosing deliberately sees more, not less.

Zero of the thirty beats were empty. Twelve distinct scenes were rendered. The
route ends with something still in front of the player.

Captured by `tests/e2e/p2r2-sustained-play.spec.ts`, which attaches this list as
`scenes-actually-rendered`; the screenshots of the first beat and the
thirty-first are in `screenshots/`.

1. Julia Graves says, not for the first time but for the first time out loud, that the week does not divide evenly. They are right, and they have picked a bad evening to be right on.
2. The shopping and two appointments still need to be covered. How do you want to handle them?
3. The evening is free, and the person you live with said they would be in for it.
4. Somebody you know has asked you for a hand with one thing, and said it matters to them.
5. Somebody you know has got themselves into something, and they have told you rather than anybody else.
6. Somebody local asked you to something on Saturday. Nobody needs you there.
7. You have read the agenda item in full. Nobody has asked what you make of it.
8. The week's errands are still yours to fit in somewhere. How do you want to spend the day?
9. Five months on, the parts you took are still yours, and nobody has had to mention it again. Tonight Julia Graves asks whether you would rather swap two of them.
10. There is a notice on the door of the building at the end of the road about what is going to happen to it. The meeting is on Tuesday and nobody you know is going.
11. The group has settled into eight people and one of them keeps looking at you when a decision needs making. There is a position going that nobody wants and that somebody has to hold.
12. It is not one building now. The same decision is being made about four streets, and somebody has asked you to put your name to a position on it in public. You have read enough by now to have one. That is not the same as wanting it attached to you.

Four of those are the composed episode surface, which is not P2's and was
already working. The other eight are the adult bank, and six of the eight are
families that were withheld before this repair. The shape of the year is the
point: a household negotiation, an evening in, a favour, a confidence, an
invitation, an agenda item read properly, and then — because the player kept
turning up — a room where somebody asks them to put their name to something in
public.

## The route it replaces

At the start head, the same route reached "Let the weeks run on" and stayed
there. `src/presentation/p2r2-sustained-play.test.ts` reproduces the collapse
against P2R1's own fixture — 151 minutes finishes the errands, both offered
families disappear, and 600 and 5,000 further minutes bring nothing back — and
then plays out of it.
