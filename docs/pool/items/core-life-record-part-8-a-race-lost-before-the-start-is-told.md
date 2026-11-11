---
id: core-life-record-part-8-a-race-lost-before-the-start-is-told
title: "The life record, part 8: a race lost before the game began is remembered by the person who lost it"
area: people
kind: feature
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: elections
model: opus
effort: medium
root: design-life-record
source: split from core-life-record by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
checked: fable 2026-11-10
---

**What.** The simulated past elects the town's officials and records each race's challenger as a party and a lean, not a person. So nobody in town ever lost a race before the game began, and no card says so. This part keeps the person who fits the challenger on the race, so their card tells the race they lost. Seen: the card of the person who lost a race before the game began.

**Cause.** Found in code: src/core2/past-elections.ts keeps a past race's challenger as a lean and a party (`challengerLean`, line 381; `challengerParty`, line 480) with no person id.

**Fix.** When a past town race is written, find the person among the town's people who fits the challenger (old enough and living in the district at the time, registered with that party or leaning that way, with the engagement the candidacy rule asks) and keep their id on the race. Pick by fit, in a fixed order, never by a roll. Where nobody fits, leave the challenger unnamed. The life record's row for a lost race then tells it for them as it does for races lost in play.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** No dice. A filled-in person must match what the records already say: the challenger's votes and share stay as written. Two-level population: a counted person who fits is not filled in for this; only a person already full, or filled in later, tells it.

**Done when.** A second session, on main in a drawn place it names with its seed, opens the card of someone who has lived in town since before the start and held or sought office, or uses dev mode's Trace on a town race from before the start to find its named loser, then opens that person's card and reads the lost race with its year; Trace on the sentence opens the race.

**Waits on.** Nothing. Pull request #8139 is on main.

**Files.** src/core2/past-elections.ts, src/core2/person-life.ts (new)
