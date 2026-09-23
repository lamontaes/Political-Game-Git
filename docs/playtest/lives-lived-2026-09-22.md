# Lives lived, told as stories

Playtest lane, 2026-09-22. Build `e7c17cb` through `f4e9d892`, branch
`claude/playtest-cwpd3o`.

lamontae asked for these twice: "for these lives lived please make sure you
report back to me directly with a narritive and story so i can understand it as
the player would. except you can give me third person knowledge - why things
(didnt) happen, what couldve happened, numbers, etc"

So each life below is told the way the player met it, and then the part the
player cannot see: why it went that way, what the game was and was not doing,
and what it would have taken to go differently. Every name, date, percentage
and screen line is copied from a walk that actually ran. Nothing here is
imagined, and where a thing did not happen I say that it did not happen rather
than describing what it would have looked like.

---

## 1. Lydia Liu, Chicago — a year in which nobody needed her

**What the player saw.**

Lydia Liu woke on January 5, 2026, forty years old, alone in an apartment in
Chicago. The line above her day said shipping delays had been reported along a
busy international trade route. She opened the parties screen. Two chapters
were listed — the County of Cook Democrats, organized by Vanessa Russo, and the
County of Cook Republicans, organized by Dakota Price. Each offered her five
things she could ask for: an organizing meeting, a door canvass, a phone shift,
a conversation about running for office, a community town hall. Under each
chapter it said _No invitations from this chapter yet._

She asked for nothing. She let the year pass.

On January 4, 2027 she opened the same screen. The Cook County Democrats now
had a history:

```
County of Cook Democrats open meeting  January 13, 2026, 6:30 PM · lapsed
County of Cook Democrats open meeting  March 10, 2026, 6:30 PM · lapsed
County of Cook Democrats open meeting  April 7, 2026, 6:30 PM · lapsed
County of Cook Democrats open meeting  May 19, 2026, 6:30 PM · lapsed
County of Cook Democrats open meeting  September 1, 2026, 6:30 PM · lapsed
County of Cook Democrats open meeting  September 29, 2026, 6:30 PM · lapsed
County of Cook Democrats open meeting  October 27, 2026, 6:30 PM · lapsed
County of Cook Democrats open meeting  December 1, 2026, 6:30 PM · lapsed
County of Cook Democrats open meeting  December 29, 2026, 6:30 PM · lapsed
```

Nine invitations. Nine lapses. The Republicans had invited her to nothing at
all in twelve months.

**What the player could not see.**

The invitations are real: a chapter generated nine of them across the year and
each one sat on a date she could have taken. This is not an empty surface; it
is a full one that records a year of declining. That is the correct thing for
the game to do with a player who skipped time.

What is wrong is that nothing ever came of the declining. Nine lapses changed
nothing about how the Cook County Democrats regard Lydia Liu, because the
chapter has no opinion of her to change. The second chapter's silence is also
unexplained — a player would reasonably read "the Republicans never asked me"
as a fact about Lydia, and it is not; it is a fact about which chapter drew
invitations.

**What could have happened.** She could have clicked "Organizing meeting" on
day one. The screen tells her exactly what that does, and the sentence is one
of the better ones in the game: _"Asking puts it on the first evening in the
next two weeks that you and the host both have free. No time passes now."_ Two
calendars are actually consulted. I have a walk running now that does exactly
that and follows each asked-for thing to open, lapsed, blocked or completed —
it has not finished, and I am not going to tell you what it found before it
tells me.

**The economy, as she read it.** On day one the panel said unemployment stood
near 4.4% and prices were rising about 2.8% a year, and then four rows saying
_No value yet_. A year later those rows had filled: real output growth 1.8%
(Q4 2026), unemployment 4.5% (December 2026), housing availability 1.01, and
consumer price inflation still _No value yet_ — a released series that never
released. Chicago added a line: _"This place's own conditions differ from the
national figures after local events; local unemployment was 4.7% in December
2026."_

That line is the most interesting sentence in the whole walk, and it nearly
became a false bug report. Galena, Illinois printed **the same 4.7%**, and two
towns agreeing to the tenth looked like a surface that was not really reading
its own place. Two more towns dissolved it: Houston printed 4.9% and Bemidji,
Minnesota printed 4.0%. The towns really do differ. Two arms gave a confident
wrong reading and four gave the right one, which is the whole argument for
walking more than two places.

---

## 2. Veronica Spencer, Chicago — the first contested election in the game

**What the player saw.**

Veronica Spencer filed for a seat in the Illinois House of Representatives. The
band across the top of the campaign screen read:

```
SPENCER FOR THE HOUSE OF REPRESENTATIVES · 28 DAYS TO GO
Running against Damian Reed, Jasmine Lawson, Reuben Palmer, Carlos Mueller.
The committee has USD 0.00.
```

Twenty-eight days later:

```
Veronica Spencer won. The seat is theirs, and so is everything that came before it.

Veronica Spencer (them) — 55.8%
Reuben Palmer — 19.8%
Carlos Mueller — 15.1%
Jasmine Lawson — 5.7%
Damian Reed — 3.6%
```

**What the player could not see.**

Before yesterday there was exactly one other name on that ballot, everywhere in
America, in every state, for every office, forever. The number came from a
literal `count: 1` written into both filing routes. Nothing about the office,
the state or the seat was ever consulted. You ruled that a defect — _"Of course
the candidate should face more than one. there's primaries. And an independent
could run."_ — and the fix is merged: the field is now two to four, drawn from
the world's own seed so it is fixed for a save and differs between contests.

Three other towns ran the same day. Aiko Rutledge took Galena with **49.7%**,
the closest race the game has ever produced. Nina Nelson took the Nevada
Assembly in Reno with 53.5%, where two opponents tied at 14.2% apiece. Astrid
Shepard took Paducah with 53.0%, and got a different closing line: _"The
supported term begins 2027-01-01; the result itself grants no current office
authority."_ That distinction — you won, you are not yet in office — is the
game being careful, and it is right.

Two honest cautions. First, every five-way ballot summed to exactly 100.0%,
which is the largest-remainder rounding doing work it could never be seen doing
before, because no contest had more than two lines. Second, all four walks drew
four opponents, which looked like a bias; 4,000 simulated contests using the
call sites' real key shape came out 2→1279, 3→1418, 4→1303, so the four-for-
four was a 1-in-81 coincidence. I wrote it down rather than dropping it,
because it read as a defect for an hour.

**What could not have happened.** There was no primary. There is no primary
mechanism, and I did not fake one, because a primary has to sit somewhere real
on the year and nothing in this repository has read any state's legislative
election calendar. The 2–4 range is the unresearched-jurisdiction rule applied
to a ballot — a realistic range rather than a refusal — and it is explicitly not
a claim about how many challengers an American seat draws. That question is
filed for ChatGPT.

The treasury said USD 0.00 the entire campaign. Reuben Palmer, Carlos Mueller,
Jasmine Lawson and Damian Reed have names and vote shares and nothing else: no
party, no position, no reason to exist. And the biggest one, which the
people-and-life lane measured and I am relaying because it is yours to rule on:
**nobody votes.** An election here is a support score plus a random swing,
spread to 100%. There is no electorate. The 556 simulated people in the world
and the town's real sourced population never touch the number. Whether a vote
should ever be a count of people is a product decision, not an engineering one.

---

## 3. Alaska, twice — the same state saying yes and no on the same day

**What the player saw.**

A character in Sitka opened the campaign screen and found two seats waiting:
the Alaska State Legislature's House and Senate, each saying _"Currently
eligible under the represented rules. Filing rechecks them."_ and, underneath,
_"Upcoming election timing is not established in this save."_ She filed for the
House. It worked.

A character in Anchorage — same state, same day, same age — opened the same
screen and there was no campaign section on it at all. Walking the refusal by
hand in an earlier session, the game said: _"The district-residence rule
requires 1 year. This character's town lies across more than one district, so
the world cannot say which district they live in."_

**What the player could not see.**

Both of those are correct, and together they are the best-behaved thing I have
found. Alaska really does require a year of residence, and Anchorage really does
sprawl across districts, and the game refuses rather than guessing which
district you are in. Sitka is not split, so Sitka files and wins the same day.
Columbus, Ohio refuses by the same mechanism. Six other capitals — Nashville,
Helena, San Juan, and earlier Augusta, Atlanta and Phoenix — refuse for a
completely different and much worse reason: _"The game has not read this
state's elected offices yet,"_ which is a flat no in a state where your own
rule says an unresearched jurisdiction should get a realistic range. Six
confirmed, forty-five unchecked. The nationwide lane owns that fix.

The Sitka walk still failed, by the way, and it failed usefully: the candidacy
never decided within sixty days. That is the 28-day countdown and the way the
harness advanced time disagreeing, and it is the seam that the real calendar
work came out of.

**The thing behind all of it.** Every legislative contest in the game counts
down 28 days from the day you filed, in every state, for every chamber, in every
month — while the governor's race on the very same screen already runs off a
real November calendar. I built the real legislative calendar (it is merged, it
is tested, it lands on the first Tuesday after the first Monday in November and
it is never 28 days from filing) and then deliberately did **not** wire it in,
because wiring it in broke seven tests that live the weeks to election day. The
reason is not the calendar. A November general can be four years out, and
nothing in the game lets you file only when a filing window opens — no pack
knows when filing opens anywhere. The 28 days is a placeholder standing in for a
missing filing window, and I left a comment in the code saying exactly that
rather than leaving it looking like an oversight.

---

## 4. Multi-generation — where it actually stands

You asked about this directly, so: it is built, it is wired into the UI, and
**no life in this lane has ever reached it.** That is a gap in my walking, not
in the game.

What exists: `people-continuation.ts` projects, when a played life ends, who the
player may continue as — child, grandchild, sibling, partner, someone they
taught, someone they kept up with — each with their age, their relation, what
the record says passed between the two of them, and, for a relative too young
today, a plain sentence about what waiting means. `LifeContinuationPanel` mounts
it. `PlayerGame` shows an `open-continuation` control. There is a
`retireFromPlay` route, so a player does not have to die to hand the life on.
Succession at death uses the SSA 2023 life table.

Why I have not seen it: every walk in this lane started a character at age 40
and ran a year or less, because the walks were aimed at campaigns and party
work. Nobody died and nobody retired. That is the walk to do next and I am
saying so rather than quietly leaving it off the list.

---

## What this lane has quietly parked

Honestly, in one place, so it is not discovered later:

- **The stress run** — the worst possible world, or turning the US into a
  monarchy. Not started. The creator has no lever for either, so it has to come
  out of play, and it is the most expensive thing on the list.
- **The "say yes" walk** — running now, unfinished, and it is the only source
  for the contact-and-goal metric group (open / lapsed / blocked / completed)
  that the divergence lane cannot supply.
- **ChatGPT's reply on the opponent field** says, in as many words, _"A 2–4
  uniform opponent-count proposal in PR393 has not been approved by this
  answer."_ The change shipped on your ruling, not on research. Flagging it
  because the two are different authorities and I would rather you know which
  one it rode in on.
- **Nobody votes**, relayed above. Needs your decision, not my code.

## What is measured and settled

- The legislative start opens in **no town in America** (0 of 51 walked) — only
  in the nine state-scope places — so the drafting table is reachable only by
  declining to name a hometown.
- A third-party system is not refused by the game; **nothing ever asks.**
  `partyBallotStatusAt()` has zero callers.
- The counts that decide what a life contains are small: 17 offices, 6 traits,
  2 hazard families, 0 propositions, 0 assassinations. The big numbers — 35,582
  places, 127 issues, 21 crisis kinds — are catalogue.
- An enacted law moves nothing. A production save carries zero causal
  mechanisms, with one exception, an enacted tax levy.
