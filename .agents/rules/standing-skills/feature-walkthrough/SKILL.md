---
name: feature-walkthrough
description: >
  Take any game feature, law or action from a question to a held draft in the
  game using Lamontae's gold standard: why-chains (five whys to bedrock),
  research, revisions, numbered keep/drop parts, the simulated / records /
  world pieces / checks split, a proof run and a worked example. Use before
  handing any feature, law trace or system change to the CTO. The CTO repeats
  the chain to cross-check.
---

# Feature walkthrough (the gold standard)

Lamontae, September 30, 2026: "This is gold standard of how you should think."
The worked model is the eviction walkthrough (00 WAVE COORDINATOR, 1:50 a.m.
entry "OVERNIGHT BUILD: WHAT HAPPENS AFTER AN EVICTION"). Every hand-back uses
the seven headings below, in plain American English.

## 1. Why-chain (five whys, to bedrock)

Start from the code on current main, not from memory. State the behavior, then
ask why, and why again: "X happens because Y; why does Y happen?" Stop only when
the chain bottoms out, and label the bottom:

- a person's own decision read from their own record (good);
- a researched real-world mechanism with a size and a range (good);
- a stand-in number, a seeded draw, or dice (a finding);
- nothing happens at all (a finding).

Then list the real-world reasons the chain leaves out (for example, lawmakers
file bills because of constituents, groups, party leaders, donors, news and
reintroductions, not only their own principles).

## 2. Research

Read the actual source and quote exact numbers, units, time horizons, and where
and whom the study covered. Separate cause from correlation. Never stretch one
place's study to every place. Research returns to the CTO; ask Team 9 for
breadth.

## 3. Revisions

- Breadth: say where a size would overstate or understate elsewhere.
- Outcomes such as pay, health, credit and mortality are CHECKS the world must
  land near, produced through people. Never a flat cut or multiplier on a
  person.
- Every size carries a range; each world draws its own per place
  (`drawnLinkSize`). No fixed numbers, no empty values.

## 4. What gets built, in numbered parts

Numbered parts Lamontae can keep, drop or change. Build for every case one way
(every place, every level of government that really holds the power), never a
small pilot. Every law lists EVERY supported effect, not one headline effect,
and records inert reactions (research found none) explicitly. Built as a draft
PR; small gap fixes may merge after CTO approval, new features wait for
Lamontae.

## 5. Simulated, records, world pieces, checks

- SIMULATED: people deciding from their own records (who, what they read, why).
- RECORDS: bookkeeping only.
- WORLD PIECES that must exist for the decisions to work. Say whether each
  exists on main today.
- CHECKS: research outcomes the world must land near.

Cover the "what if there is none" case (no shelter, no relatives, no transit, no
law at that level). Far from the player, the same decisions run with lighter
detail, filled in when needed.

## 6. Proof run

A watched run in a random, logged place (the scripts/governance-proof runner
system reports) listing every case and outcome against the checks. Name the seed
and place.

## 7. Worked example

Named people, real dollar amounts, month by month, tracing every step to a
record.

## Laws: the six-line trace

For each law: 1 what enacting it changes in code; 2 who it touches and how much
(every effect, including inert ones); 3 who can pass and undo it at federal,
state, county and city levels, plus preemption, floors, ceilings and ranges; 4
where the chain bottoms out; 5 the gap and the smallest fix (no feature creep);
6 the proof line.

## Hand-back

Post in 00 WAVE COORDINATOR with the seven headings (or the six lines for a law),
the PR and exact head. The CTO re-runs the why-chain independently and
cross-references before approval.
