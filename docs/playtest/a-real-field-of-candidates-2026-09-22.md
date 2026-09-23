# Every race in the game had exactly one opponent

> **WITHDRAWN, 2026-09-22, and left in place rather than deleted.** The fix
> this record describes — a flat field of two to four opponents in every race —
> was reverted before it shipped, on lamontae's ruling the same day: "You
> should only have more than one opponent in the primary, or if there's an
> independent, you can also have no opponent." A field belongs in a primary; a
> general carries the nominees plus any independent who ran; and an unopposed
> seat has to stay possible, because that is real. None of those three exist in
> the game, and each of them needs a place on the year, which is the same thing
> the 28-day countdown is standing in for.
>
> **Everything measured below still holds** and is why the ruling was asked
> for. He also ruled on the outcome — "today you win every race 71 or 90%. That
> should be changed, obviously" — and that is a balance question, so it goes to
> ChatGPT as rules rather than to him as a number this lane picked.

**Walked:** 2026-09-22, Chromium 141, four towns after the fix; the defect
itself was seen in all fifteen towns of
`docs/playtest/running-for-office-across-america-2026-09-22.md`.
**Fixed on:** `claude/playtest-cwpd3o`, branched from main at `59bdeee8`.

## What the player saw

Filing for anything, anywhere, produced a two-name ballot. The campaign band
read "Running against <one name>" and election night printed the player and one
other person. The winning share sat between 71% and 90% in every town walked,
which is what a two-horse race with one modelled candidate produces.

lamontae's ruling, which is what makes this a defect rather than a design
choice: "Of course the candidate should face more than one. there's primaries.
And an independent could run."

## Where it came from

Two lines, and every candidacy in the game passes through one of them:

- `src/presentation/campaign-projection.ts:670` — the ordinary filing route.
- `src/presentation/nationwide-candidacy.ts:140` — the statewide route.

Both called `ensureCampaignOpponents` with a literal `count: 1`. Nothing about
the office, the state or the seat was consulted, so the number was not a bad
estimate of a field; there was no estimate.

## The change

`contestFieldOpponentCount(worldSeed, stableKey)` in
`src/simulation/campaigns.ts` returns 2 to 4, forked from the world's own seed
on `campaign-contest-field:<stableKey>`. Both call sites use it.

The range is the unresearched-jurisdiction rule applied to a ballot: a
realistic range rather than a refusal or one invented number. It is explicitly
not a claim about how many challengers an American state house seat draws —
nothing in this repository has read that, and
`docs/research/requests/state-legislative-seat-calendar-and-field.json` carries
the question. When it comes back, this range is what changes.

A primary is a separate mechanism and is deliberately not faked here. These are
the people on the ballot beside the player, not a field to get through first.
The primary itself waits on the same research request, because a primary has to
sit somewhere real on the year and the calendar answer is not in yet.

## Measured

Distribution over 4000 contests, using the call sites' real key shape
(`candidacy:<personId>:<date>` against a varying world seed): 2 → 1279,
3 → 1418, 4 → 1303. Uniform. The four browser walks below all happened to draw
four opponents; that is a 1-in-81 coincidence, not a bias, and it is recorded
here because it looked like one.

## Walked after the fix

Four towns, artifacts in `/tmp/ocd-field` (screenshots are untracked and will
not survive the container; they go to Drive through the research triage lane).

| Town              | Office                   | Field       | Winning share |
| ----------------- | ------------------------ | ----------- | ------------- |
| Chicago, Illinois | House of Representatives | 4 opponents | 55.8%         |
| Galena, Illinois  | House of Representatives | 4 opponents | 49.7%         |
| Paducah, Kentucky | House of Representatives | 4 opponents | 53.0%         |
| Reno, Nevada      | Assembly                 | 4 opponents | 53.5%         |

Chicago, in full, as the player reads it:

```
Veronica Spencer won. The seat is theirs, and so is everything that came before it.

Veronica Spencer (them) — 55.8%
Reuben Palmer — 19.8%
Carlos Mueller — 15.1%
Jasmine Lawson — 5.7%
Damian Reed — 3.6%
```

Every one of the four printed shares summing to exactly 100.0, which is the
largest-remainder rounding merged in `59bdeee8` doing its job on a five-way
field — the case that rounding fix was written for but could not previously be
shown, because no contest had more than two lines.

## Not fixed here, still true

- **28 days to go, everywhere.** Every contest in every town counts down 28
  days regardless of office or date. The governorship on the same screen has a
  real calendar line, so this is one route declining to use a calendar the
  other route already has.
- **The treasury opens at USD 0.00** in every town.
- Opponents have names and shares and nothing else a player can read: no party
  on the ballot line, no positions, no history.
