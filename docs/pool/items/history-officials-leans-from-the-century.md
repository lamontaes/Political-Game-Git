---
id: history-officials-leans-from-the-century
title: "Each official's district and state lean is where the century's last count left them"
area: elections
kind: feature
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/history-past-races
pr:
after: history-state-parties-from-the-century
blocked-on:
lead: elections
model: opus
effort: high
root: rc1-world-outside-town
source: CTO lines 6935086070 and 6936902133 on #9747 (family 8, pin officials.ts:327); History's family 8 plan (comment 6943530405), PR 8b
checked:
---

**What.** Every official's district lean and state lean is the 2024 result moved by one world swing, so a member's pull toward their district, a higher office's electorate and every vote read through them are 2024's in every world.
Seen: `src/core2/modules/officials.ts` `stateLeanOf` and `seatLean` read the 2024 presidential, House and state legislative results.

**Cause.** Found in code: `src/core2/modules/officials.ts:333` `stateLeanOf` reads the 2024 presidential share, and `seatLean` reads the 2024 House and MEDSL district results.

**Fix.**

1. Add `centurySignedLean(seed, stateKey, district?)` to `electorate-century.ts`: the century's last count in a state, House district or legislative seat, on the signed scale.
2. In a century world, `stateLeanOf` and `seatLean` read it and say so in the lean's source. "Today" and a place the century does not count keep the published path.

**Time box.** 1 hour for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice; replace, never layer: 2024 is read only under "today" and where the century has no count.

**Done when.** A second session starts a new game at a drawn place it writes down with its seed, turns dev mode on, opens Government, opens a state legislator, and sees their district's lean cited from the century's last count. At drawn worlds every official's state and district lean equals the century's, and src/core2/officials-century-leans.test.ts passes.

**Waits on.** history-state-parties-from-the-century (#9962), which this branch is stacked on.

**Files.** src/core2/modules/officials.ts, src/core2/electorate-century.ts, src/core2/modules/elections.ts, src/core2/officials-century-leans.test.ts (new)

**Notes.** Filed by the History lane, Nov 17, 2026. The rest of 8b, past races and turnout, follows on this branch.
