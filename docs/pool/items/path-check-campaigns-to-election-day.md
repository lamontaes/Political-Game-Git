---
id: path-check-campaigns-to-election-day
title: "path-check campaigns every week to election day, files for council first and votes for itself"
area: elections
kind: bug
priority: 1
size: S
status: done
claimed-by: governing/path-check-campaigns
pr: #6849
blocked-on:
source: governing lead, Oct 29 (baseline: the player got 0 votes)
lead: governing
claimed-at: 2026-10-29T22:47:33.134Z
---

**What.** path-check, the headless golden path, stopped campaigning once the petition held its signatures and then lived to election day, so the player never met a door that asked for the vote. It also left the polls without marking its own race, so the player's own vote was never cast, and in every finished baseline race of Oct 29 the player got zero votes. It took the first open contest rather than a council seat, the golden path's office.

**Rules.** Wire to the world: path-check plays the campaign through the same campaign-day choices and play clock the screen uses, so what it measures is what the owner can play. One rule, all 56 places: it prefers the council kind from the office row's data, never a place name.

**Done when.** In a drawn place with the seed it prints, node --import tsx src/bench/path-check.ts files for a council seat where the place has one, logs a campaign line with weeks, doors, money raised, events and door yes count up to election day, and the election result shows at least one vote for the player, their own.

**Files.** src/bench/path-check.ts

**Notes.** TODO
