---
id: director-law-learned-from-outlet
title: "A law that changed someone's money is learned from the outlet or feed that reached them; a person tells only where a conversation record exists"
area: director
kind: wiring
priority: 2
size: M
status: done
claimed-by: claude/law-learned-outlet
pr: #5152
after:
blocked-on:
source: "owner ruling Oct 16 (who tells a person a law changed their money); audit Oct 19, Part A on #4747"
claimed-at: 2026-10-19T20:31:58.600Z
---

**What.** The owner ruled on Oct 16 that a person learns a law changed their money mostly from the news and social media, not from a person: the source a stance cites is the outlet or feed that reached them, and a friend or official carries it only where the records show a conversation. #4747 built the opposite: the teller is the outlet's head by default, the scene never fired in three played towns, and `SG-DIRECTOR-owner-decision-law-teller` stays open so the release build refuses. Rebuild the teller as the story or feed that reached the person (the press engine's delivery record), with a conversation as the exception where a record shows one, and resolve the stopgap.

**Rules.** Look before you ask: the Oct 16 ruling is written and the director must follow it rather than invent a teller. An effect is a read: the scene fires because the person's stance record cites a delivery record from the press engine, not because the director picks a head of an outlet.

**Done when.** In a played year in a drawn place (`buildBenchWorld`) a person whose paycheck changed under a law shows a stance citing the story or feed that reached them, by record id, and the scene fires at least once across three drawn places with the delivery record in the why; the stopgap row is resolved and `src/director/law-reached-scenes.test.ts` runs the case in a drawn place. The owner plays it: a neighbor says they read it in the paper, not that the editor dropped by.

**Files.** src/director/civic-roles.ts, src/director/law-reached-scenes.test.ts, src/director/data/situation-types.json, src/director/data/stopgaps.json

**Notes.** #4747 is sent back with this note (audit Oct 19, merger order). Rebuild on its branch after merging main.

Oct 20: PR #5152 merged to main: the law-takes-effect scene belongs to the reached person alone and no teller is invented.
