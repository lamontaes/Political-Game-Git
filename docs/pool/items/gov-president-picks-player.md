---
id: gov-president-picks-player
title: "A player who is president picks a vice president and cabinet by asking"
area: gov
kind: feature
priority: 3
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

**What.** A player who reaches the presidency has no running mate or cabinet to pick; the world seats the federal cabinet on its own. The same ask-to-serve scene and willingness read would serve federal seats as data rows. Federal play waits for after early access, so this item waits too. Seen: the Campaign board for a presidential race and the cabinet list.

**Cause.** Design: docs/pool/items/gov-running-mate-agrees-and-is-replaced.md and AGENTS.md (federal play after early access); the world seats the federal cabinet in succession.ts; a player president has no picks. Federal play comes after early access (AGENTS.md).

**Fix.** When the player can hold the presidency, the running mate and cabinet picks use serve-asks with federal seat rows.

**Time box.** 6 hours for one opus session.

**Rules.** No dice: an answer comes from the person's record. One rule, all 56 places.

**Done when.** A second session, in a drawn place with a seed it did not choose, plays it in the running game: Playing a presidential candidate, the player asks a running mate and the scene plays; as president, a cabinet ask seats a secretary on a yes.

**Waits on.** federal play after early access (AGENTS.md).

**Files.** src/core2/modules/succession.ts, src/core2/modules/serve-asks.ts
