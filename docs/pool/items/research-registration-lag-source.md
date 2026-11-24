---
id: research-registration-lag-source
title: "Research: check how movers register against long-time residents, and the deadline"
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

**What.** The game's wait to register after a move (`registrationLagMedianDays` 80, `registrationLagDutySlope` 0.6 in src/core2/data/campaigns/parameters.json) rests on one relationship: recent movers are on the rolls at a lower rate than long-time residents, and people who care more about voting register sooner. The deadline row (`registrationDeadlineDays` 25) rests on a second: a registration has to be on the rolls some days before an election. Read public sources (the Census Bureau's voting and registration supplement, state election office pages) only to confirm the direction and rough size of those two relationships. The owner's ruling (Nov 14): sources establish relationships and effects, never exact figures, so no figure is asked for. Seen: in how many movers can't vote in the next election.

**Cause.** Design: docs/research/stand-in-figures-2026-10-12.md lists the stand-in figures the research items replace; these three were set on Nov 14 with no source fetched (voter registration record PR), tagged ESTIMATED with spreads; the owner's rule is that every number is SOURCED, ESTIMATED or TUNABLE with its source and spread (AGENTS.md, Placeholders).

**Fix.** Keep the three rows as unverified estimates with their spreads. Where a source shows the relationship is weaker, stronger or the other way, change the row to match it and say what was read in the row's citation. Nothing is held for an exact figure.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: real data calibrates the wait and never decides whether one person registers; a person's wait comes from their own duty (no dice, `no-dice`). Estimate, never UNKNOWN: each stays an estimate until a source is read.

**Done when.** A second session reads the three rows and finds each still an estimate with a spread, and a note that names what was read and whether it supports the direction of the relationship, and finds a named mover's registration at the new address in a drawn place's played world (place and seed named, any of the 56), by record id.

**Waits on.** Nothing.

**Files.** src/core2/data/campaigns/parameters.json

**Notes.** From the voter registration record PR. The 80-day median was set so that people who moved in the last year are on the rolls at about 70% of the rate of long-time residents, a figure recalled from the supplement's tables, not read.
