---
id: elections-player-registration-shown-and-acted
title: "The player sees their own voter registration and a move or a turn-away reaches them"
area: elections
kind: feature
priority: 3
size: M
status: in-pr
standard: 2
claimed-by:
pr: 9400
after: elections-voter-registration-record
blocked-on:
model: sonnet
effort: medium
root: design-story-director
lead: elections
source: Account lead thread "Voter registration as a record", Nov 14
claimed-at:
---

**What.** The player is an adult with a registration row like everyone else's, and a move leaves it at the old address the same way. Today nothing tells the player so, nothing lets them register again, and a player who presses the vote act on election day is counted as voting whether or not they are on the rolls. Make the player's registration something they can learn and act on: a way to register at a new address (where the state's rules allow it), and a turned-away or registered-at-the-polls day that reaches them in the Journal and in the poll scene, in the English engine's words. Seen: in what the player is told at the polls after moving.

**Cause.** Found in code: in src/core2/modules/voting.ts the player's ballot takes the `chosen` path in the race count (`const t = chosen ? { ...decided, votes: true } : decided`), so a stale or missing registration never stops a player's vote, and `decideTurnout` keeps no poll-day row for the player (a row for a guess about the player would contradict a counted vote).

**Fix.** Two steps, in this order (coordinator, Nov 15). **Step one (built, `voting.ts`):** `pollingStatus(api, personId, date)` is the one read of a named person's standing for an election day ("on", "same-day", "old-address", "not-registered" or "after-deadline"), read from the same `registrationReading` every named voter's turnout reads; `registerToVote(api, personId)` registers the person at the address they live at today, `how: by-the-player`; and the race count registers a player who marked a ballot while off the rolls in a same-day state, with a `registers-at-polls` row. **Step two (waits on step one and on the scene and screen work in `scene-trouble-at-the-polling-place`):** the player is told before election day and at the polls (a Journal line, the poll scene, a button that calls `registerToVote`), and only then the count refuses a ballot from a player who is not on the rolls where the state turns people away, and the day keeps a `not-on-the-list` row naming the player. All lines come from the English engine's banks, with a played file for the second reader.

**Time box.** 4 hours.

**Rules.** No dice (`no-dice`). Words come from the banks and pass a words read (`player-screen-text`, `words-engine`). The record is a view of the same records (one engine per mechanic).

**Done when.** A second session, in a drawn place's played world (place and seed named), moves the player, reaches election day in a state without same-day registration, and finds the vote refused with a worded reason and a `pollDays` row naming the player; in a same-day state finds the player registered at the polls by record id.

**Waits on.** Step two waits on step one (the PR that adds `pollingStatus` and `registerToVote`) folding, and on the poll scene and screen in `scene-trouble-at-the-polling-place`.

**Files.** src/core2/modules/voting.ts, src/core2/electorate-registration.ts, data/english

**Notes.** From the voter registration record PR (#9323). The act is `registerToVote` and the read is `pollingStatus`, both exported from src/core2/modules/voting.ts.
