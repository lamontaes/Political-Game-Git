---
id: research-registration-lag-source
title: "Research: source the wait to register after a move, and the registration deadline"
area: elections
kind: research
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: medium
root: none
lead: researcher
source: Account lead thread "Voter registration as a record", Nov 14
claimed-at:
---

**What.** `registrationLagMedianDays` (80), `registrationLagDutySlope` (0.6) and `registrationDeadlineDays` (25) in src/core2/data/campaigns/parameters.json are the game's own estimates of how long a mover or a new 18-year-old takes to register, and how many days before an election a registration has to be on the rolls. Find public sources for the registration rate of recent movers against long-time residents (the Census Bureau's voting and registration supplement) and the registration deadline of each state, and replace the estimates with sourced values and ranges. Seen: in how many movers can't vote in the next election, and in who is turned away at the polls.

**Cause.** Design: docs/research/stand-in-figures-2026-10-12.md lists the stand-in figures the research items replace; these three were set on Nov 14 with no source fetched (voter registration record PR), tagged ESTIMATED with spreads; the owner's rule is that every number is SOURCED, ESTIMATED or TUNABLE with its source and spread (AGENTS.md, Placeholders).

**Fix.** Replace each row's value, citation and spread with what a fetched source says (publisher, year, URL, unit). Where the sources give a deadline per state, put the deadlines in a data table by state and read it where `registrationDeadlineDays` is read in src/core2/modules/voting.ts (`registrationReading`); keep the rule in src/core2/electorate-registration.ts as it is.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: real data calibrates the wait and never decides whether one person registers; a person's wait comes from their own duty (no dice, `no-dice`). Estimate, never UNKNOWN: each stays an estimate until a source is read.

**Done when.** A second session reads the three rows in a drawn place's played world (place and seed named, any of the 56) and finds each SOURCED or ESTIMATED with a fetched citation (publisher, year, URL) and a spread, and finds a named mover's registration at the new address dated by the sourced wait, by record id.

**Waits on.** The voter registration record PR folding into the train.

**Files.** src/core2/data/campaigns/parameters.json

**Notes.** From the voter registration record PR. The 80-day median was set so that people who moved in the last year are on the rolls at about 70% of the rate of long-time residents, a figure recalled from the supplement's tables, not read.
