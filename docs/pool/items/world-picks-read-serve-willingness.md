---
id: world-picks-read-serve-willingness
title: "The world's own picks for a running mate (and later cabinet and heads) pass over a person who would say no"
area: gov
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
lead: governing
source: S6 (brief J, asking someone to serve), Nov 14 2026
standard: 2
model: opus
effort: medium
root: none
---

**What.** The world's own governor candidates name running mates with no answer from the person, while the player's asks are answered from the person's record. The same read should decide both, so a person who would turn the player down also turns down a computer-run candidate, and the next person ranked is asked. Seen: the ballot at the polls and the Campaign board's rival tickets.

**Cause.** Design: owner ruling, Nov 14 05:17Z ("Yes, but ask again later"), and docs/pool/items/gov-running-mate-agrees-and-is-replaced.md: the player's asks read `ticketStanding` (src/core2/modules/serve-asks.ts) but `nameRunningMate` (src/core2/modules/voting.ts) and the executive's own picks still seat their first-ranked person with no answer from them. Registered as SG-WORLD-serve-willingness-player-only.

**Fix.** `nameRunningMate`, and the executive's head and cabinet picks, read the same willingness the player's ask reads and pass to the next person ranked where the read is at or below zero. Keep one read per person and seat, never a stored table. Measure year 1 with and without at three drawn places (speed and drift tables), since it changes unattended worlds.

**Time box.** 6 hours for one opus session.

**Rules.** No dice: an answer comes from the person's record. One rule, all 56 places.

**Done when.** A second session runs a drawn joint-ticket state through a governor election and sees, by record id, a world candidate's first-ranked pick passed over with the reason the read gave, and the next person seated; SG-WORLD-serve-willingness-player-only is cleared.

**Waits on.** gov-running-mate-agrees-and-is-replaced (the player's half, on branch claude/project-thread-d5qa0q).

**Files.** src/core2/modules/serve-asks.ts, src/core2/modules/voting.ts, src/core2/modules/executive.ts
