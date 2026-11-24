---
id: gov-groups-never-lobby-a-seated-player
title: "Interest groups never meet a seated player about a bill, so the lobbyist who remembers never comes"
area: gov
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: brief O report 1 (Nov 14 2026)
lead: laws
standard: 2
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** The lobby-remembers scene needs a group's lobbying meeting with the player on a bill they later vote against. In 450 played days across three places no group met the seated player (the lobby term of every member's position was 0.00), so the scene never staged. Seen: in the lobbyist scene after a vote, and in each member's lobby reason.

**Cause.** Measured: Brewton AL council, drawPlace("bargain-e","bargaining-report"), world seed a0d80131c36849f266774b750a72c20b3ff977a48ba5a8d63acb809e4890f3f6, 150 days, command `npx tsx .probe/bargain.ts bargain-e office:gus2025:122535:council 150` (script in /mnt/project-files/words-lead/bargaining/runs/probe-bargain.ts); also Jessup MD ("bargain-c") and USVI ("bargain-d"): the lobby term of every member's position was 0.00 and no group met the player. Why interest-groups.ts never picks the player's body's bills is not yet found.

**Fix.** Find in interest-groups.ts which bills a group lobbies and on whom, and why a body the player sits on is never chosen; fix the read, not by adding a draw.

**Time box.** 3 hours.

**Rules.** No dice: a group lobbies from its interests and the bill's questions, never a draw.

**Done when.** A second session starts the bench in a place drawn from all 56 (name the place and seed), plays a seated council member for 150 days in the running game, and sees a group meet them on their bill (meeting id) and that member's lobby reason read it.

**Waits on.** Nothing.

**Files.** src/core2/modules/interest-groups.ts, src/core2/modules/legislature.ts
