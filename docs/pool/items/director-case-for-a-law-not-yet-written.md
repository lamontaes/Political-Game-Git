---
id: director-case-for-a-law-not-yet-written
title: "A person whose life a law would change brings the player the case for it, at the player's own level, before any bill exists"
area: director
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
source: "Account lead's scene build-out, Nov 15, 2026 (owner's rules 143 to 149, given 20:34Z to 20:43Z; plans approved by the Account lead 20:41Z and 20:45Z)"
model: sonnet
effort: medium
root: none
---

**What.** The owner, Nov 15: the laws and ordinances that can pass are material for scenes at every level. Today every bill scene starts from a bill already in a body, so nothing brings a member, an executive or a private person the case for a law nobody has written.
Seen: as a council member, a state legislator or a private person, the player is stopped by someone the law would change, asking for a law their own level can make.

**Cause.** Found in code: the bill scenes in src/director/data/situation-types.json (vote-asked, vote-sought, vote-confirmed, bill-carry, desk-visit, section-bargain, bill-held-chair, lobby-remembers) all start from a bill record; constituent-stop (purpose law-reaches) starts from a law already in force; who a law reaches is read by `reachedBy` (src/core2/law-reach/host.ts line 325) and whether a body's law reaches the town by `reachesTown` (src/core2/modules/legislature.ts line 3377).

**Fix.** One situation type, "law-asked-for", caused when the player meets a person, or a group's speaker already lobbying (`LobbyMeeting`, src/core2/modules/interest-groups.ts), whose own record a catalog law would change, read through the same reach rules `reachedBy` uses as a would-reach read for that person only, never a scan. Tagged by the level whose law it is (bodies.json `law`): "office:lawmaking" or "office:executive" at that level, or "none" for a private person, who hears it as a neighbor's case. A body whose law does not reach the person is never their case. The ending writes through acts that exist: a member introduces the bill, an executive issues or declines the order, a private person joins a case or a group (`joinCase`, `joinsGroup`). Lines are keyed by the law's area, written by the Words lead. Where the player sees it: a stop in town, at the office or at the door.

**Time box.** 6 hours for one Sonnet session, one PR.

**Rules.** One rule, all 56 places: the law's level and reach come from the catalog and body rows, never a named place. Wire to the world: the ending introduces a bill, issues an order or joins a case, each read by its engine.

**Done when.** A second session, on main, in a drawn place and a seed nobody chose, plays a year as a council member and a year as a state legislator (Advanced, Play as), sees a law-asked-for scene by moment id for a law of their own level with an asker that law would reach, and follows its ending to the bill introduced, the order or the case joined; no law from another place's body reaches anyone in it.

**Waits on.** The scene tags item (director-scene-tags-from-player-standing).

**Files.** src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/core2/law-reach/host.ts, src/core2/modules/legislature.ts, src/core2/modules/interest-groups.ts
