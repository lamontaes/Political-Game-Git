---
id: core-memory-heard-knowledge-keys
title: "A big town's people hold 1.5 million heard facts by the spring primary, and none of them is ever forgotten"
area: core
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In the world speed:year plays for Arcadia, California (0602462, seed app-heap-1), core.knowledgeByPerson grows from about 1.05 million keys in January 2028 to 1.55 million by March 21, about 1,900 full people, while the heap after collection goes from 2,569 to 3,074 MB; at the desktop app's 4,096 MiB limit the fourth year dies there. The keys are heard promises (one per listener per statement, campaigns.ts), speeches and campaign messages heard, news read, people met and named. Only bare event:...:experienced keys are ever forgotten (knowledge-retention.ts).

**Rules.** Speed: memory stays flat; old records fold into summaries once play no longer reads them, with each reader's window agreed with its owner. Ask why: a stance that cites a heard promise or story must still find its source while it is read. An effect is a read: a key no engine reads after a window goes.

**Done when.** speed-years/run.ts --years 4 at --max-old-space-size=4096 plays all four years of Arcadia, California (0602462, seed app-heap-1) in the played world without running out of memory, or names the next table by size; the PR body lists every reader of each folded key kind with its window, agreed with the owning lane, and the knowledge-retention test passes.

**Files.** src/core2/knowledge-retention.ts,src/core2/state.ts,src/core2/modules/campaigns.ts

**Notes.** lead: speed. Measured by Lane 5, Nov 4 (unit 7 card in docs/lanes/state/lane-5.md). Owners to agree windows with: Lane 1 (campaigns, promises), Lane 2 (news, views), Lane 3 (director reads).

Reader sweep, Nov 4 10:15 UTC (Lane 5), every reader of `knowledgeByPerson` outside state.ts on main: heard promises are read by `modules/record.ts:202` and `modules/voting.ts:800` (a voter holds a kept or broken promise against the speaker at the next election), so they must last a term and can't go by age. News keys (`newsKey`) are read by `voting.ts:789,1237`, `place-prices.ts:629,691` and `news.ts:485`, the director's `conversation.ts:818` and `bring-it-up.ts`. Organization and role keys are read by `people.ts:614`, `drives.ts:2049,2078` and `life.ts:77,331`. Whole-store scans: `conversation.ts:542,2156`, `bring-it-up.ts:268`, `campaigns.ts:5293`, `corruption.ts:332`. Proposal: keep each key kind its readers need, but store a heard promise (value "heard") as an id in a per-voter set, not a full fact object with its own source string. That is about three quarters of a promise key's memory; the record and voting reads become a set lookup. That touches Lane 1's campaigns.ts, record.ts and voting.ts and needs Lane 1's agreement (asked on docs/lanes/state/lane-1.md).
