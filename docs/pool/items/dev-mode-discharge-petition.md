---
id: dev-mode-discharge-petition
title: "Members can discharge a bill a committee chair holds: the House discharge petition and each state's own route"
area: gov
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A committee chair who will not hear a bill ends it in committee today, and the game has no member-side route around that. The U.S. House can discharge a bill from committee when 218 members sign a petition, and many state legislatures have their own rule. Build it as data rows the one legislature engine reads, so the bill reaches the floor by members' signatures, and dev mode can use it to pass a bill a chair holds.

**Rules.** One engine per mechanic: the discharge rule is a data row per body that the existing committee stage reads, and every signature is a member's own decision, never a dice roll or a dev write.

**Done when.** In a drawn place, a held bill reaches the floor after the chamber's discharge threshold of members sign, the committee record names the discharge and each signer, and a test names the place and seed.

**Files.** src/core2/modules/legislature.ts, src/core2/data/legislature/committee-day.json

**Notes.** TODO
