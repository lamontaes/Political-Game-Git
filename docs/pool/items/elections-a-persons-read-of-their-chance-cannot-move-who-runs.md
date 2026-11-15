---
id: elections-a-persons-read-of-their-chance-cannot-move-who-runs
title: "A person's read of their own chance of winning is worth about 0.4 against a bar of 3.9 to run, so a seat they cannot win weighs almost the same as one they can"
area: elections
kind: owner-decision
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: elections
model: opus
effort: high
root: none
source: Account lead measurement, Nov 15, 2026 (party-asks item)
---

**What.** A person weighing a seat reads their own chance as `odds` times `candidacyChanceWeight` (1). `odds` is their standing times the challenger's odds against an incumbent (0.15) shared with everyone already running, plus the hope an enterprising person adds, so the term is about 0.4 for those who ran (largest seen 1.0). The bar to run is `candidacyStayOutPull` (3.94), and the other terms run to a few points each (engagement 2, cause 2, party role 1.5). A seat their party cannot win and one it holds weigh almost the same. Feeds: elections-incumbent-filing-refused-for-fee-leaves-house-seat-without-a-major.

**Cause.** Measured: Ripley, Mississippi, Mountain Home, North Carolina and Las Cruces, New Mexico (each place's seed from `drawPlace("fields-measure2", tag)`, tags a, b and c), played to 2026-04-10 on the Train head 693479ab; with the person's chance multiplied by their party's chance of winning the seat (from the seat's last two-party vote, `basePlaces` in `src/core2/race-places.ts`, through the normal curve with the world's own swing spreads; factor 2.0 for the favored side and 0.008 for the other in North Carolina's state senate district 48) the share of U.S. House and state legislative seats missing a major party was the same with and without it in 18 drawn places (6 of 14 and 5 of 10 both ways). Found in code: `reasonsFrom` in `src/core2/modules/candidacy.ts` builds `chance` as `candidacyChanceWeight * (odds + hope * (1 - odds))`. The sizes of each term at three places are recorded in Notes.

**Fix.** Design first: the owner's rulings on why people run (Nov 8 10:20 a.m.: "candidates run because they think they have a chance", "a long shot who files anyway is realistic"; the roles ruling, Nov 8) say a person's own read of their chance is one reason among several. Which of the reasons should be the largest, and how a seat their side cannot win is weighed, needs a rule before anyone changes a weight. Do not re-weigh here.

**Time box.** 2 hours to write the rule's options, no code.

**Rules.** No dice: who runs follows from each person's own reasons and never from a share that decides it. Sliding scales and causes: no weight is moved to make a share match a benchmark, only from a person's own sum or a source with its spread.

**Done when.** The CTO has a ruling in `OWNER-DECISIONS.md` on the order of the reasons people run; a second session then plays a drawn place such as Mountain Home, North Carolina (`drawPlace("fields-measure2", "b")`) to 2026-04-10 and sees the decision's reasons in the order the ruling sets.

**Waits on.** The CTO's check of the owner's past rulings on why people run.

**Files.** src/core2/modules/candidacy.ts, src/core2/data/candidacy/parameters.json

**Notes.** Measured on the Train head 693479ab, played to 2026-04-10, the reasons stored on the decisions of those who ran (a counted resident's decision is stored only when it ran, so this is the sum as the runners had it). Mean (largest) per term:

| term                          | Ripley, Mississippi (53) | Mountain Home, North Carolina (36) | Las Cruces, New Mexico (75) |
| ----------------------------- | ------------------------ | ---------------------------------- | --------------------------- |
| chance                        | 0.40 (0.56)              | 0.41 (0.61)                        | 0.38 (1.00)                 |
| engagement                    | 1.57 (1.99)              | 1.72 (2.00)                        | 1.75 (1.99)                 |
| ambition (wide seats)         | 1.08 (2.00)              | 1.15 (2.00)                        | 1.07 (2.00)                 |
| age                           | 0.68 (1.00)              | 0.68 (1.00)                        | 0.56 (1.00)                 |
| national wave                 | 1.26 (3.15)              | 2.02 (3.15)                        | 2.00 (3.25)                 |
| party role                    | 0.35 (1.43)              | 0.26 (1.44)                        | 0.39 (1.50)                 |
| cause                         | 0.34 (1.87)              | 0.18 (1.74)                        | 0.34 (1.95)                 |
| field (each runner lowers it) | -1.30                    | -1.69                              | -1.43                       |
| office opportunity            | -0.80                    | -0.90                              | -0.63                       |
| wide campaign                 | -0.75                    | -0.75                              | -0.75                       |

The bar is 3.94 (3.2 for a wide seat). The national wave, engagement and ambition are each several times the size of the person's read of their own chance. Script: a one-off reading of `candidatesFor` per contest, kept in the thread's scratch, not committed.
