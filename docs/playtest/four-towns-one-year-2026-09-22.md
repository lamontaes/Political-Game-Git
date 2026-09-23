# Four towns, one year each, read off a real screen

**Walked:** 2026-09-22, Chromium 141, build `e7c17cb` (working tree). Four
saves, identical in every creator answer except the town: age 40, custom start,
summarized earlier life, lives alone, calibration skipped. Each lived 52 weeks
a week at a time through the corner clock, sampled on day one and after a year.

Run for the divergence lane, who own the measurement and the report. Their
harness reads the kernel; this reads what a person is actually shown, so the
two can be checked against each other. Screenshots and full transcripts are in
`/tmp/ocd-two-towns` and are untracked.

## This world's economy, after one year

|                                  | Bemidji, MN | Galena, IL | Chicago, IL | Houston, TX |
| -------------------------------- | ----------- | ---------- | ----------- | ----------- |
| Opening unemployment             | 3.8%        | 4.2%       | 4.4%        | 4.4%        |
| Opening inflation                | 2.7%        | 2.7%       | 2.8%        | 3.0%        |
| Real output growth, Q4 2026      | 1.9%        | 2.0%       | 1.8%        | 1.8%        |
| Unemployment, Dec 2026           | 3.9%        | 4.3%       | 4.5%        | 4.6%        |
| Consumer price inflation         | —           | —          | —           | —           |
| Housing availability, Dec 2026   | 0.98        | 0.99       | 1.01        | 1.02        |
| **Local** unemployment, Dec 2026 | 4.0%        | 4.7%       | 4.7%        | 4.9%        |

Every national figure differs between saves. The economy diverges by place and
it diverges on screen, which is the first thing the lane wanted confirmed from
a rendered surface rather than from the kernel.

## A defect I nearly filed, and why I did not

On the first pair — Chicago and Galena — the local line read **identically** in
both:

```
This place's own conditions differ from the national figures after local
events; local unemployment was 4.7% in December 2026.
```

Cook County has 2.7 million people and Jo Daviess has about 22,000. A sentence
that asserts local divergence while printing the same number in two places that
size is exactly the shape of the candidate-art banner: a surface lying about
itself. The national figures differed in the same pair (4.5% against 4.3%),
which made it look worse.

Two more towns in other states dissolved it: 4.0% in Bemidji, 4.9% in Houston.
The local layer varies by place. Two Illinois towns landing on the same rounded
tenth is a coincidence.

Recorded at length because the near-miss is the lesson: **two samples produced a
confident wrong reading and four samples produced the right one.** A claim about
divergence needs enough arms to tell a constant from a collision, and the cost
of the extra pair was two minutes.

## Consumer price inflation is absent for the whole first year

All four saves show `—` and "No value yet" for inflation after a full year,
while the other three indicators released. This is correct and deliberate:
`producer.ts:462` publishes a twelve-month change only once a month twelve
months earlier exists, with the comment "the starting value is a modeled
condition, not a back-filled observation." A world opening in January 2026
gets its first published inflation in January 2027.

Not a defect. Worth knowing as a player fact: the creator tells you inflation
is "about 2.8% a year", and then the game shows you no inflation figure at all
for roughly thirteen months. The panel says why in its own words — "Needs
twelve recorded months to compare" — so it fails soft and explains itself.

## Parties, where the player lives

Both chapters, with named organizers, in every town:

- Chicago: County of Cook Democrats (Vanessa Russo), County of Cook Republicans
  (Dakota Price)
- Galena: County of Jo Daviess Democrats (Cedric Robinson), County of Jo
  Daviess Republicans (Owen Hughes)

Five activities each, a "Propose a new party" form pre-filled with the player's
own town, and — after a year — nine lapsed open meetings on the Democratic
chapter in Chicago and **none** on the Republican one. Whether that asymmetry is
seeded or a real gap is unmeasured and belongs to the lane's harness.

## What this walk could not see

Of the lane's seven metrics, a browser walk at this horizon reached four
(the day screen, the economy panel, the parties surface, and what reached the
player while time passed). It could not see people alive, officeholder deaths,
or seats changing hands — none are rendered on any surface a player can open.
Saying so explicitly rather than leaving a gap: those three are the harness's,
not because the walk failed but because the game does not show them.

Ten-year horizons are also the harness's. The clock gives days and weeks only,
so ten years is 520 presses per save.

## What reached the player while a year passed

The "while you were away" digest, in Chicago, after 52 weeks — three items and
a count:

```
Several governments opened talks over fishing rights in shared waters.
December 25, 2026 · Civic Ledger

Shipping along the international trade route returned closer to its usual pace.
December 1, 2026 · Civic Ledger · 2 updates

City of Chicago withdrew its proposal about the repair schedule for several
local roads.
November 28, 2026 · Civic Ledger · 3 updates

128 more in News
```

A year of ordinary life produces 131 news items and names the player's own city
in them. Nobody reached out to the player personally in any of the four saves.
