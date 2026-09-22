# Reachable, empty, and silent about why

Written 2026-09-22 08:50Z on `main` at `d6090983`. This is one sentence with
four pieces of evidence under it, gathered by three lanes walking different
parts of the game on the same night and finding the same shape each time.

## The pattern

**A surface exists, a player can reach it, it is empty on an ordinary first
day, and nothing on it says why.**

That is a different problem from the one it looks like. The reflex reading of
an empty screen is that the system behind it was never built. Four of the
seven systems recorded elsewhere as "never started" are in fact built and
reachable, which means the work that would help is surfacing, not building.
An empty screen that explains itself is a game telling the player where they
are; an empty screen that does not is a game that looks unfinished while
working correctly.

The project already knows how to do this well, and does it on its best
screens. The budget refuses in words — "That is no record, not a zero
balance." Transit and tax say what opens them. A portrait that cannot be
drawn names the five layers it is missing. So this is not a missing idea. It
is a rule applied on some surfaces and not on others.

## The four surfaces

Each was measured by walking to it, not by reading for it. Heads named.

### Party evolution shows nothing on a first day

Measured on `claude/playtest-politics-label` walking an ordinary first day.
Foundings, splits, mergers and platform drift reach the player through
`projectPartyInitiatives`, which yields nothing to a player who is not
already a proposer, a party-body member, a unit leader or a prior responder.
On a new character the screen is therefore blank. Nothing on it says that
what it holds is the part of party business you are involved in, so a player
reads "parties do nothing" from a screen that means "you are not in any of
this yet".

The public half does exist: a decided change is yielded to everybody. A fresh
world simply has none yet, which is honest — and is exactly the case that
needs a sentence.

### The Issues and budget tab has no issues

Measured on `main` at `de030bff` in Springfield, Illinois, written up in
`policy-catalogue-2026-09-22.md`. The tab named after issues has one section
and it is the budget. There are no policy domains, issues, propositions,
subjects or principles at all, because `assertProductionCatalogBoundary`
refuses a production world that holds any. The screen does not say that. A
player reads the tab's name, finds a budget, and has no way to learn that the
missing half is deliberate and recorded.

### The journal drops what it cannot name

`src/presentation/world39-journal.ts` is the only presentation consumer of
the policy catalogue. For a belief, a public position or a campaign
commitment whose proposition the world does not hold, it does `continue`.
Not a sentence — a skip. A recorded fact about the player's own convictions
disappears from the one screen that would show it, silently. This is the
clearest violation of the fails-soft rule found in the walk, and it is four
lines of code.

### The Guide is three presses deep, and it is all procedure

Measured on `claude/playtest-politics-label`; term count re-read on `main` at
`d6090983`. `GUIDE_TERMS` holds 28 entries and every one is legislative
procedure — quorum, roll call, three readings, concurrence, enrollment,
presentment, veto, fiscal note, adjournment. Nothing about parties, nothing
about the press, nothing about what happens when your character dies.

**Corrected here:** an earlier version of this finding said nothing in the
game points to the Guide. That is no longer true on this head. `GuideTerm`
inline help is mounted in `DocketWorkspace`, `MunicipalWorkspace`,
`GovernmentBrowser` and `PlayerGame`, so a player meets a term where it is
used and can open its entry from there. What still stands is the depth of the
Guide itself, three presses behind a group header, and the fact that all 28
entries are procedure.

## Two more from the same walk, carried here so they are not lost in a draft

These were measured on `claude/playtest-politics-label` alongside the four
above and lived only in a pull request description, which is not a place a
report can read.

- **News works.** Two presses, top level, populated on day one. It is the
  counter-example the other four should be measured against.
- **Continuing as somebody after a death** has no route and no mention while
  the character is alive; the surface appears only once they are dead. The
  owner has since settled what to do about it — it is to be explained in a
  tutorial that does not exist yet — so it is recorded here as answered
  rather than open.

### The Politics menu hint has moved, and the old reading is stale

Re-measured on `main` at `d6090983` by opening the menu. The entry now reads
**"Politics — Running for office, jobs and study"** for a life with no
office, and **"Politics — Your office, jobs and study"** for one that has
one. The report that opened this thread of work quoted **"Politics — Jobs and
study"**, which was true when it was taken and is not true now.

What has not changed is the substance of that finding: the hint still
describes work rather than the hub, and the entry behind it is the only route
to parties, government, campaigns, local records, candidacy and the budget.
It still sits one press from the real "Jobs and study" under Personal.

## What this is worth, and what it is not

Three of the four are one sentence each on a screen that already exists. The
journal is a code change of a few lines. None needs a system built.

It is not a rename. The Issues tab could be relabelled "Budget" tomorrow and
the player would be no closer to having a politics to have opinions about,
because there are no propositions at all — that gap is real and is recorded
where it belongs. The point here is narrower and cheaper: where a surface is
empty for a reason, say the reason.

## What this does not establish

- **Whether a player reads these as unfinished.** That is a question about
  people, not code, and nobody has watched anyone play.
- **Whether a sentence is the right answer on each of the four.** Party
  evolution in particular may want a route in rather than an explanation of
  why there is none.
