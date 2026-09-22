# Nine veto overrides read from the law, forty-two left out

Measured and landed 2026-09-22. Merged to `main` as #302 at head `c0865cb5`,
with the assertions hardened in #308 at `b6b31928`.

## The split, and why it is a split

The veto research of 2026-09-21 covers all fifty-one jurisdictions. It is not
one body of evidence. It is two, and the file says so itself.

**Nine were read from an instrument.** Alaska, D.C., Illinois, Maryland,
Nebraska, North Carolina, Tennessee, Virginia and West Virginia were read from
an official constitutional text, an official code text, an indexed official
excerpt, or a legislature's own procedure guide. Those nine are now in the
repository at `src/simulation/veto-override-source-readings.ts`, each with the
fraction, the basis in the instrument's own words, the locator and the URL.

**Forty-two carry a number quoted from a summary.** Their threshold comes from a
legislative-research summary rather than from any instrument. The research marks
every one of them `runtimeAdmitted: false`, sets `notAPlayableCoverageClaim:
true` on the whole file, and states its own rule: "No summary silently becomes
verified law."

They were kept out on that basis. A summary's number recorded beside a
constitution's would look exactly like a constitution's, and nothing downstream
could tell them apart afterwards. The full research is checked in at
`docs/research/veto-research-51.json` so the distinction is on the record rather
than in somebody's memory, and so the forty-two become real the moment somebody
reads the instruments.

This is not the same as refusing them. Under the project's own three-state rule
— read from law, generated and playable, or genuinely unknown — an unread state
still gets a playable generated threshold drawn from the range real states span.
What it does not get is that number presented as its law.

## What the nine are used for

Four of them are states the game actually plays, because they have a compiled
legislature rule pack: Alaska, Illinois, Maryland and Nebraska. A test now holds
each pack to its own constitution, and all four agree today.

- Alaska overrides in joint session at two thirds of the legislature's
  membership, and three quarters for revenue and appropriation bills.
  Art. II § 16.
- Illinois, Maryland and Nebraska at three fifths of the members elected.

Nothing consults the readings during play. The rules a legislature is played
from stay in its rule pack; the readings are the independent thing the pack is
checked against. An edit to a pack that drifts from the instrument now fails a
test instead of changing the law quietly.

## Where a basis could not be mapped, and why that was left alone

Three of the nine count their override against a set this project does not name.

- North Carolina: three fifths of those **present and voting**.
- Tennessee: a majority of the **membership entitled under the constitution**.
- Virginia: two thirds of those **present**, alongside a majority of the members
  elected.

"Present and voting" is neither members present nor members voting, and
"membership entitled under the constitution" is not members elected. Picking the
nearest available denominator would have been a small falsehood about the
arithmetic, so those readings keep the instrument's own words in `readBasis` and
map to nothing. A null there is a mapping this project has not made, never a
threshold nobody read.

## What the test pins, and what it cannot

The exact check runs on the four states whose instrument names a denominator the
project has: numerator, denominator and basis pinned together.

For a state whose pack is _generated from_ these readings, comparing the pack's
fraction back to the reading proves nothing — break the reading and both sides
move together, which was verified by breaking Tennessee's to a third and
watching the test stay green. So what the check pins there is the source: a
drawn value carries a `game-profile` source, a read one carries the instrument,
and a read state falling back to a draw is the regression that matters.

The check also no longer names which states are unplayed. It used to assert the
list DC, NC, TN, VA, WV, and that list stopped being true the moment four of
them gained a generated legislature — while the assertion kept passing. An
assertion that goes false while staying green is worse than no assertion.

## Checks run

At `c0865cb5` with `main` merged in: typecheck clean, prettier clean over `src/`
and `docs/`, `release:check` OK, `corpus:prose` 0 hard errors, and the invariant
passing. At `b6b31928`: the same file verified passing both at `main` `15e3790d`
and copied onto the nationwide head `0616d342`, where the generated packs exist.
No CI verdict exists for either head.
